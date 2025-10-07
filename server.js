// ================== CONFIGURACIÓN INICIAL ==================
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer')

// ================== CONEXIÓN A SUPABASE ==================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const upload = multer({ storage: multer.memoryStorage() });
// ================== CONFIGURACIÓN DE EXPRESS ==================
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================== CONSTANTES Y HELPERS ==================
const SALT_ROUNDS = 10;

function prettyLabel(k) {
    return k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}
const whitelist = ['https://ganaderia-jfb-cbps.onrender.com']; // URL de tu front-end
const corsOptions = {
  origin: function (origin, callback) {
    // Permite peticiones sin origen (como Postman) y las de tu whitelist
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  }
};
app.use(cors(corsOptions)); // Usa las nuevas opciones

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================== ENDPOINTS DE LA API ==================

// --- Autenticación ---
// Modificamos la ruta para que use el middleware de multer.
// upload.single('logoInput') le dice a multer que espere un solo archivo del campo llamado 'logoInput'.
app.post('/api/register', upload.single('logoInput'), async (req, res) => {
    // Ahora, los datos de texto vienen en req.body y el archivo en req.file
    const { nombre, email, password, rol, nombreRancho } = req.body;
    const logoFile = req.file; // El archivo del logo

    if (!nombre || !email || !password || !rol) {
        return res.status(400).json({ message: 'Todos los campos principales son requeridos.' });
    }
    if (rol === 'propietario' && !nombreRancho) {
        return res.status(400).json({ message: 'El nombre del rancho es requerido para propietarios.' });
    }
    try {
        let { data: existingUser } = await supabase.from('usuarios').select('email').eq('email', email.toLowerCase()).single();
        if (existingUser) {
            return res.status(409).json({ message: 'El correo electrónico ya está en uso.' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const { data: newUser, error: userError } = await supabase.from('usuarios').insert({ nombre, email: email.toLowerCase(), password: hashedPassword, rol }).select().single();
        if (userError) throw userError;

        if (rol === 'propietario') {
            let logoPublicUrl = null; // Variable para guardar el enlace del logo

            // Si el usuario subió un archivo (logoFile existe)...
            if (logoFile) {
                // 1. Creamos un nombre único para el archivo para evitar colisiones.
                const fileName = `logos/${newUser.id}-${Date.now()}-${logoFile.originalname}`;

                // 2. Subimos el archivo a nuestro bucket 'logos-propietarios' en Supabase.
                const { error: uploadError } = await supabase.storage
                    .from('logos-propietarios')
                    .upload(fileName, logoFile.buffer, {
                        contentType: logoFile.mimetype,
                    });

                if (uploadError) throw uploadError;

                // 3. Obtenemos la URL pública del archivo que acabamos de subir.
                const { data: urlData } = supabase.storage
                    .from('logos-propietarios')
                    .getPublicUrl(fileName);

                logoPublicUrl = urlData.publicUrl;
            }

            // 4. Creamos el rancho y guardamos la URL del logo en la nueva columna.
            const codigoRancho = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { error: ranchoError } = await supabase.from('ranchos').insert({
                nombre: nombreRancho,
                codigo: codigoRancho,
                propietario_id: newUser.id,
                logo_url: logoPublicUrl // Guardamos el enlace (será null si no se subió logo)
            });
            if (ranchoError) throw ranchoError;
        }
        res.status(201).json({ success: true, message: '¡Usuario registrado exitosamente!' });
    } catch (error) {
        console.error('Error inesperado en el registro:', error);
        res.status(500).json({ message: 'Ocurrió un error inesperado en el servidor.', details: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data: user, error } = await supabase.from('usuarios').select('*').eq('email', email.toLowerCase()).single();
        if (error || !user) {
            return res.status(404).json({ message: 'El correo electrónico no fue encontrado.' });
        }
        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) {
            return res.status(401).json({ message: 'Contraseña incorrecta.' });
        }
        if (user.rol === 'propietario') {
            const { data: ranchos, error: ranchosError } = await supabase.from('ranchos').select('*').eq('propietario_id', user.id);
            user.ranchos = ranchosError ? [] : ranchos;
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, message: 'Inicio de sesión exitoso.', user: userWithoutPassword });
    } catch (err) {
        console.error('Error en el login:', err.message);
        res.status(500).json({ message: 'Ocurrió un error inesperado en el servidor.' });
    }
});

// --- Lógica de MVZ y Ranchos ---
app.post('/api/rancho/validate', async (req, res) => {
    const { codigo } = req.body;
    try {
        const { data: rancho, error } = await supabase.from('ranchos').select('*').eq('codigo', (codigo || '').toUpperCase()).single();
        if (error || !rancho) {
            return res.status(404).json({ message: 'Código de rancho no válido.' });
        }
        res.json(rancho);
    } catch (err) {
        res.status(500).json({ message: 'Error validando el código.' });
    }
});

// --- Lógica de Vacas ---
app.get('/api/vacas/rancho/:ranchoId', async (req, res) => {
    const { ranchoId } = req.params;
    try {
        const { data: vacas, error } = await supabase.from('vacas').select('*').eq('rancho_id', ranchoId);
        if (error) throw error;
        res.json(vacas);
    } catch (err) {
        res.status(500).json({ message: "Error al obtener las vacas del rancho." });
    }
});
  
// REEMPLAZA TU RUTA ACTUAL CON ESTA
app.post('/api/vacas', upload.single('fotoVaca'), async (req, res) => {
    // Los datos de texto vienen de req.body, el archivo de req.file
    const { arete, nombre, fechaNacimiento, raza, propietarioId, ranchoId } = req.body;
    const fotoFile = req.file;

    if (!arete || !nombre || !propietarioId || !ranchoId) {
        return res.status(400).json({ message: 'Faltan datos importantes para registrar la vaca.' });
    }
    try {
        let fotoPublicUrl = null;

        // Si se subió una foto, la procesamos
        if (fotoFile) {
            const fileName = `vacas/${ranchoId}-${arete}-${Date.now()}`;
            const { error: uploadError } = await supabase.storage
                .from('fotos-ganado') // Usamos el nuevo bucket
                .upload(fileName, fotoFile.buffer, { contentType: fotoFile.mimetype });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('fotos-ganado').getPublicUrl(fileName);
            fotoPublicUrl = urlData.publicUrl;
        }

        // Insertamos la vaca en la base de datos con la URL de la foto
        const { data, error } = await supabase.from('vacas').insert({
            numero_arete: arete,
            nombre,
            fecha_nacimiento: fechaNacimiento,
            raza,
            estado: 'Activa',
            id_usuario: propietarioId,
            rancho_id: ranchoId,
            foto_url: fotoPublicUrl // Guardamos el nuevo enlace
        }).select().single();

        if (error) throw error;
        res.status(201).json({ success: true, message: 'Vaca registrada exitosamente', vaca: data });
    } catch (err) {
        console.error('Error inesperado al agregar vaca:', err);
        res.status(500).json({ message: 'Ocurrió un error inesperado.' });
    }
});
// NUEVO ENDPOINT PARA ACTUALIZAR EL LOGO DE UN RANCHO EXISTENTE
app.post('/api/rancho/:ranchoId/logo', upload.single('logoInput'), async (req, res) => {
    const { ranchoId } = req.params;
    const logoFile = req.file;

    if (!logoFile) {
        return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
    }

    try {
        // 1. Creamos un nombre único y subimos el nuevo logo a Supabase
        const fileName = `logos/${ranchoId}-${Date.now()}-${logoFile.originalname}`;
        const { error: uploadError } = await supabase.storage
            .from('logos-propietarios')
            .upload(fileName, logoFile.buffer, { contentType: logoFile.mimetype });

        if (uploadError) throw uploadError;

        // 2. Obtenemos la URL pública del nuevo logo
        const { data: urlData } = supabase.storage
            .from('logos-propietarios')
            .getPublicUrl(fileName);

        const logoPublicUrl = urlData.publicUrl;

        // 3. ACTUALIZAMOS la tabla 'ranchos' con la nueva URL del logo
        const { data: updatedRancho, error: updateError } = await supabase
            .from('ranchos')
            .update({ logo_url: logoPublicUrl })
            .eq('id', ranchoId)
            .select()
            .single();

        if (updateError) throw updateError;

        // 4. Enviamos de vuelta los datos actualizados del rancho
        res.status(200).json(updatedRancho);

    } catch (error) {
        console.error('Error al actualizar el logo:', error);
        res.status(500).json({ message: 'Error en el servidor al actualizar el logo.', details: error.message });
    }
});  

// --- Lógica de Actividades y PDF ---
// OBTENER EL HISTORIAL DE UNA VACA (CON EL NOMBRE DEL MVZ)
app.get('/api/actividades/vaca/:vacaId', async (req, res) => {
    const { vacaId } = req.params;

    try {
        // Esta es la nueva consulta "inteligente"
        const { data: actividades, error } = await supabase
            .from('actividades')
            .select(`
                *,
                usuarios ( nombre ) 
            `)
            .eq('id_vaca', vacaId);

        if (error) {
            console.error("Error obteniendo el historial:", error);
            return res.status(500).json({ message: "Error al obtener el historial." });
        }

        res.json(actividades);

    } catch (err) {
        res.status(500).json({ message: "Ocurrió un error inesperado." });
    }
});

app.post('/api/lote/pdf', async (req, res) => {
    try {
        const { mvzId, ranchoId, nombreRanchoIndependiente, lote } = req.body;
        if (!mvzId || !Array.isArray(lote) || lote.length === 0) {
            return res.status(400).json({ message: 'Faltan datos para procesar el lote.' });
        }
        const aretesDelLote = lote.map(item => item.areteVaca);
        const { data: vacas } = await supabase.from('vacas').select('id, numero_arete').in('numero_arete', aretesDelLote);
        const mapaAreteAId = new Map(vacas.map(v => [v.numero_arete, v.id]));
        const actividadesParaInsertar = lote.map(item => {
            const idVaca = mapaAreteAId.get(item.areteVaca);
            if (!idVaca) return null;
            return { tipo_actividad: item.tipoLabel, descripcion: JSON.stringify(item.detalles), fecha_actividad: item.fecha, id_vaca: idVaca, id_usuario: mvzId };
        }).filter(Boolean);
        if (actividadesParaInsertar.length > 0) {
            await supabase.from('actividades').insert(actividadesParaInsertar);
        }
        const { data: mvz } = await supabase.from('usuarios').select('nombre').eq('id', mvzId).single();
        let ranchoNombreHeader = nombreRanchoIndependiente || 'Independiente';
        let propietarioNombreHeader = 'N/A';
        if (ranchoId) {
            const { data: rancho } = await supabase.from('ranchos').select('nombre, propietario_id').eq('id', ranchoId).single();
            if (rancho) {
                ranchoNombreHeader = rancho.nombre;
                const { data: propietario } = await supabase.from('usuarios').select('nombre').eq('id', rancho.propietario_id).single();
                if (propietario) propietarioNombreHeader = propietario.nombre;
            }
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="reporte_lote.pdf"`);
        const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
        doc.pipe(res);
        const logoPath = path.join(__dirname, 'public', 'assets', 'logo.png');
        if (fs.existsSync(logoPath)) doc.image(logoPath, 40, 30, { width: 90 });
        doc.fontSize(16).font('Helvetica-Bold').text('JFB Ganadería Inteligente', { align: 'right' });
        doc.fontSize(10).font('Helvetica').text(`Rancho: ${ranchoNombreHeader}`, { align: 'right' }).text(`Propietario: ${propietarioNombreHeader}`, { align: 'right' }).text(`Médico Veterinario: ${mvz?.nombre || '-'}`, { align: 'right' });
        doc.moveDown(1.5);
        const yBarra = doc.y;
        const tituloActividad = (lote[0]?.tipoLabel || 'Actividades').toUpperCase();
        doc.rect(40, yBarra, doc.page.width - 80, 20).fill('#001F3D');
        doc.fillColor('white').font('Helvetica-Bold').fontSize(12).text(`REPORTE DE ${tituloActividad}`, 40, yBarra + 4, { align: 'center' });
        doc.fillColor('black').moveDown(2);
        const tableTop = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Arete', 40, tableTop, { width: 70 });
        doc.text('Raza', 110, tableTop, { width: 80 });
        doc.text('Lote', 190, tableTop, { width: 40, align: 'center' });
        doc.text('Fecha', 230, tableTop, { width: 80 });
        doc.text('Detalles', 310, tableTop, { width: 260 });
        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica');
        lote.forEach(item => {
            const detallesFiltrados = Object.entries(item.detalles || {}).filter(([key, value]) => value && value !== 'No' && value !== '').map(([key, value]) => `${prettyLabel(key)}: ${value}`).join('; ');
            const y = doc.y;
            doc.text(item.areteVaca, 40, y, { width: 70 });
            doc.text(item.raza || '-', 110, y, { width: 80 });
            doc.text(item.loteNumero, 190, y, { width: 40, align: 'center' });
            doc.text(formatDate(item.fecha), 230, y, { width: 80 });
            doc.text(detallesFiltrados || 'Sin detalles', 310, y, { width: 260 });
            doc.moveDown(0.5); // <-- AQUÍ ESTÁ LA LÍNEA CORREGIDA
            doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#cccccc').stroke();
            doc.moveDown(0.5);
        });
        doc.end();
    } catch (err) {
        console.error("Error al generar PDF:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error interno al generar el PDF del lote.' });
        }
    }
});
// Endpoint para ELIMINAR una vaca
app.delete('/api/vacas/:vacaId', async (req, res) => {
    const { vacaId } = req.params;

    try {
        const { error } = await supabase
            .from('vacas')
            .delete()
            .eq('id', vacaId);

        if (error) throw error;

        res.status(200).json({ success: true, message: 'Vaca eliminada exitosamente.' });
    } catch (err) {
        console.error("Error en el servidor al eliminar vaca:", err);
        res.status(500).json({ message: 'Error al eliminar la vaca.' });
    }
});

// =================================================================
// ===== GESTIÓN DE PERMISOS MVZ ===================================
// =================================================================

// Endpoint para invitar a un MVZ a un rancho y asignarle permisos
app.post('/api/rancho/invitar-mvz', async (req, res) => {
    const { ranchoId, mvzEmail, permisos } = req.body;

    if (!ranchoId || !mvzEmail || !permisos) {
        return res.status(400).json({ message: 'Faltan datos para asignar el permiso.' });
    }

    try {
        // 1. Buscamos el ID del veterinario usando su correo electrónico
        const { data: mvzUser, error: mvzError } = await supabase
            .from('usuarios')
            .select('id')
            .eq('email', mvzEmail)
            .eq('rol', 'mvz')
            .single();

        if (mvzError || !mvzUser) {
            return res.status(404).json({ message: 'No se encontró un veterinario con ese correo electrónico.' });
        }
        const mvzId = mvzUser.id;

        // 2. Creamos la fila en la nueva tabla con los IDs y el permiso
        const { data, error: insertError } = await supabase
            .from('rancho_mvz_permisos')
            .insert([
                { rancho_id: ranchoId, mvz_id: mvzId, permisos: permisos }
            ])
            .select();

        if (insertError) {
            if (insertError.code === '23505') { 
                return res.status(409).json({ message: 'Este veterinario ya tiene permisos en este rancho.' });
            }
            throw insertError;
        }

        res.status(201).json({ message: 'Permisos asignados correctamente.', data });

    } catch (error) {
        console.error('Error al asignar permisos:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});
// =================================================================
// ===== ESTADÍSTICAS ==============================================
// =================================================================

app.get('/api/rancho/:ranchoId/estadisticas', async (req, res) => {
    const { ranchoId } = req.params;

    try {
        // 1. Obtenemos todas las vacas del rancho
        const { data: vacas, error: vacasError } = await supabase
            .from('vacas')
            .select('id, lote, raza')
            .eq('rancho_id', ranchoId);

        if (vacasError) throw vacasError;
        if (!vacas || vacas.length === 0) {
            return res.json({}); // Devuelve un objeto vacío si no hay vacas
        }

        // 2. Obtenemos el último estado de "Palpación" de cada vaca
        // Usamos una función de base de datos (RPC) para eficiencia
        const cowIds = vacas.map(v => v.id);
        const { data: ultimasActividades, error: rpcError } = await supabase.rpc('get_latest_palpacion_for_cows', {
            cow_ids: cowIds
        });

        if (rpcError) throw rpcError;

        // 3. Procesamos los datos para crear las estadísticas
        const stats = {};

        // Creamos un mapa para buscar fácilmente el último estado de una vaca
        const estadoMap = new Map();
        ultimasActividades.forEach(act => {
            estadoMap.set(act.vaca_id, JSON.parse(act.descripcion));
        });

        vacas.forEach(vaca => {
            const lote = vaca.lote || 'Sin Lote';
            const ultimoEstado = estadoMap.get(vaca.id) || {};

            // Si el lote no existe en nuestro objeto de stats, lo inicializamos
            if (!stats[lote]) {
                stats[lote] = {
                    totalVacas: 0,
                    estados: {
                        Gestante: 0,
                        Estatica: 0,
                        Ciclando: 0,
                        Sucia: 0,
                        // Puedes agregar más estados si los necesitas
                    },
                    razas: {}
                };
            }

            // Contamos las vacas y sus estados
            stats[lote].totalVacas++;
            if (ultimoEstado.gestante === 'Sí') stats[lote].estados.Gestante++;
            if (ultimoEstado.estatica === 'Sí') stats[lote].estados.Estatica++;
            if (ultimoEstado.ciclando === 'Sí') stats[lote].estados.Ciclando++;
            if (ultimoEstado.sucia === 'Sí') stats[lote].estados.Sucia++;

            // Contamos las razas
            const raza = vaca.raza || 'Desconocida';
            stats[lote].razas[raza] = (stats[lote].razas[raza] || 0) + 1;
        });

        res.json(stats);

    } catch (error) {
        console.error("Error generando estadísticas:", error);
        res.status(500).json({ message: "Error al generar estadísticas" });
    }
});

// ================== INICIO DEL SERVIDOR ==================
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log('Conectado a la base de datos de Supabase.');
});