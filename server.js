// ================== CONFIGURACIÓN INICIAL ==================
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const multer = requiere('multer')

// ================== CONEXIÓN A SUPABASE ==================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const upload = multer({ storage: multer.memoryStorage() });
// ================== CONFIGURACIÓN DE EXPRESS ==================
const app = express();
const PORT = 3000;
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
  
app.post('/api/vacas', async (req, res) => {
    const { arete, nombre, fechaNacimiento, raza, propietarioId, ranchoId } = req.body;
    if (!arete || !nombre || !propietarioId || !ranchoId) {
        return res.status(400).json({ message: 'Faltan datos importantes para registrar la vaca.' });
    }
    try {
        const { data, error } = await supabase.from('vacas').insert({ numero_arete: arete, nombre, fecha_nacimiento: fechaNacimiento, raza, estado: 'Activa', id_usuario: propietarioId, rancho_id: ranchoId }).select().single();
        if (error) throw error;
        res.status(201).json({ success: true, message: 'Vaca registrada exitosamente', vaca: data });
    } catch (err) {
        console.error('Error inesperado al agregar vaca:', err);
        res.status(500).json({ message: 'Ocurrió un error inesperado.' });
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

// ================== INICIO DEL SERVIDOR ==================
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log('Conectado a la base de datos de Supabase.');
});