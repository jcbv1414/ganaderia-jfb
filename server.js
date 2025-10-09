// ================== CONFIGURACIÓN INICIAL ==================
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

// ================== CONEXIÓN A SUPABASE ==================
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';
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
const prettyLabel = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

// ================== ENDPOINTS DE LA API ==================

// --- Autenticación ---
app.post('/api/register', upload.single('logoInput'), async (req, res) => {
    const { nombre, email, password, rol, nombreRancho } = req.body;
    const logoFile = req.file;

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
            let logoPublicUrl = null;
            if (logoFile) {
                const fileName = `logos/${newUser.id}-${Date.now()}-${logoFile.originalname}`;
                const { error: uploadError } = await supabase.storage.from('logos-propietarios').upload(fileName, logoFile.buffer, { contentType: logoFile.mimetype });
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from('logos-propietarios').getPublicUrl(fileName);
                logoPublicUrl = urlData.publicUrl;
            }
            const codigoRancho = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { error: ranchoError } = await supabase.from('ranchos').insert({ nombre: nombreRancho, codigo: codigoRancho, propietario_id: newUser.id, logo_url: logoPublicUrl });
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

// --- Lógica de Vacas (Propietario) ---
app.get('/api/vacas/rancho/:ranchoId', async (req, res) => {
    const { ranchoId } = req.params;
    try {
        const { data: vacas, error } = await supabase.from('vacas').select('*').eq('rancho_id', ranchoId).order('created_at', { ascending: false });
        if (error) throw error;
        res.json(vacas);
    } catch (err) {
        res.status(500).json({ message: "Error al obtener las vacas del rancho." });
    }
});

app.post('/api/vacas', upload.single('fotoVaca'), async (req, res) => {
    const vacaData = req.body;
    const fotoFile = req.file;

    try {
        let fotoPublicUrl = null;
        if (fotoFile) {
            const fileName = `vacas/${vacaData.rancho_id}-${vacaData.nombre}-${Date.now()}`;
            const { error: uploadError } = await supabase.storage.from('fotos-ganado').upload(fileName, fotoFile.buffer, { contentType: fotoFile.mimetype });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('fotos-ganado').getPublicUrl(fileName);
            fotoPublicUrl = urlData.publicUrl;
        }
        vacaData.foto_url = fotoPublicUrl;

        const { data, error } = await supabase.from('vacas').insert(vacaData).select().single();
        if (error) throw error;
        res.status(201).json({ success: true, message: 'Animal registrado exitosamente', vaca: data });
    } catch (err) {
        console.error('Error inesperado al agregar vaca:', err);
        res.status(500).json({ message: 'Ocurrió un error inesperado.', details: err.message });
    }
});

app.delete('/api/vacas/:vacaId', async (req, res) => {
    const { vacaId } = req.params;
    try {
        const { error } = await supabase.from('vacas').delete().eq('id', vacaId);
        if (error) throw error;
        res.status(200).json({ success: true, message: 'Animal eliminado exitosamente.' });
    } catch (err) {
        console.error("Error en el servidor al eliminar vaca:", err);
        res.status(500).json({ message: 'Error al eliminar la vaca.' });
    }
});

// --- Lógica de MVZ y Actividades ---
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

app.post('/api/actividades', async (req, res) => {
    const { mvzId, ranchoId, ranchoNombre, actividades, tipoActividad } = req.body;
    if (!mvzId || !Array.isArray(actividades) || actividades.length === 0) {
        return res.status(400).json({ message: 'Faltan datos para registrar la actividad.' });
    }
    try {
        // 1. Insertar el registro de la actividad en el historial
        const { data: historial, error: historialError } = await supabase
            .from('mvz_historial')
            .insert({
                mvz_id: mvzId,
                rancho_id: ranchoId, // Puede ser null
                rancho_nombre: ranchoNombre,
                tipo_actividad: tipoActividad,
                numero_animales: actividades.length
            })
            .select()
            .single();

        if (historialError) throw historialError;

        // 2. Asociar cada registro de vaca con el ID del historial
        const registrosParaInsertar = actividades.map(act => ({
            historial_id: historial.id,
            numero_arete: act.areteVaca,
            detalles: act.detalles
        }));
        
        const { error: registrosError } = await supabase.from('mvz_registros').insert(registrosParaInsertar);

        if (registrosError) throw registrosError;

        res.status(201).json({ success: true, message: 'Actividad guardada en el historial.' });

    } catch (err) {
        console.error("Error guardando actividad en historial:", err);
        res.status(500).json({ message: 'Error al guardar la actividad.' });
    }
});

app.get('/api/mvz/:mvzId/historial', async (req, res) => {
    const { mvzId } = req.params;
    try {
        const { data, error } = await supabase
            .from('mvz_historial')
            .select('*')
            .eq('mvz_id', mvzId)
            .order('fecha', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Error obteniendo historial MVZ:", err);
        res.status(500).json({ message: 'Error al cargar el historial.' });
    }
});

app.post('/api/historial/pdf', async (req, res) => {
    const { historialIds } = req.body;
    if (!Array.isArray(historialIds) || historialIds.length === 0) {
        return res.status(400).json({ message: 'No se seleccionaron actividades.' });
    }

    try {
        const { data: historiales, error: histError } = await supabase
            .from('mvz_historial')
            .select('*')
            .in('id', historialIds);
        if (histError) throw histError;

        const { data: registros, error: regError } = await supabase
            .from('mvz_registros')
            .select('*')
            .in('historial_id', historialIds);
        if (regError) throw regError;
        
        const { data: mvz } = await supabase.from('usuarios').select('nombre').eq('id', historiales[0].mvz_id).single();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="reporte_actividades.pdf"`);
        const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
        doc.pipe(res);

        historiales.forEach((historial, index) => {
            if (index > 0) doc.addPage();
            
            const logoPath = path.join(__dirname, 'public', 'assets', 'logo.png');
            if (fs.existsSync(logoPath)) doc.image(logoPath, 40, 30, { width: 90 });
            doc.fontSize(16).font('Helvetica-Bold').text('JFB Ganadería Inteligente', { align: 'right' });
            doc.fontSize(10).font('Helvetica')
               .text(`Rancho: ${historial.rancho_nombre}`, { align: 'right' })
               .text(`Médico Veterinario: ${mvz?.nombre || '-'}`, { align: 'right' });
            doc.moveDown(1.5);
            
            const yBarra = doc.y;
            const tituloActividad = (historial.tipo_actividad || 'Actividades').toUpperCase();
            doc.rect(40, yBarra, doc.page.width - 80, 20).fill('#001F3D');
            doc.fillColor('white').font('Helvetica-Bold').fontSize(12).text(`REPORTE DE ${tituloActividad} - ${formatDate(historial.fecha)}`, 40, yBarra + 4, { align: 'center' });
            doc.fillColor('black').moveDown(2);
            
            const tableTop = doc.y;
            doc.font('Helvetica-Bold');
            doc.text('Arete', 40, tableTop, { width: 100 });
            doc.text('Detalles', 140, tableTop, { width: 430 });
            doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
            doc.moveDown(0.5);
            doc.font('Helvetica');

            const registrosDeEsteHistorial = registros.filter(r => r.historial_id === historial.id);
            registrosDeEsteHistorial.forEach(item => {
                const detallesFiltrados = Object.entries(item.detalles || {}).filter(([key, value]) => value && value !== 'No' && value !== '').map(([key, value]) => `${prettyLabel(key)}: ${value}`).join('; ');
                const y = doc.y;
                doc.text(item.numero_arete, 40, y, { width: 100 });
                doc.text(detallesFiltrados || 'Sin detalles', 140, y, { width: 430 });
                doc.moveDown(0.5);
                doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#cccccc').stroke();
                doc.moveDown(0.5);
            });
        });
        
        doc.end();

    } catch (err) {
        console.error("Error al generar PDF de historial:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error interno al generar el PDF.' });
        }
    }
});


// --- Estadísticas ---
app.get('/api/rancho/:ranchoId/estadisticas', async (req, res) => {
    const { ranchoId } = req.params;
    try {
        const { data: vacas, error: vacasError } = await supabase.from('vacas').select('id, lote, raza').eq('rancho_id', ranchoId);
        if (vacasError) throw vacasError;
        if (!vacas || vacas.length === 0) return res.json({});

        const cowIds = vacas.map(v => v.id);
        const { data: ultimasActividades, error: rpcError } = await supabase.rpc('get_latest_palpacion_for_cows', { cow_ids: cowIds });
        if (rpcError) throw rpcError;

        const stats = {};
        const estadoMap = new Map();

        ultimasActividades.forEach(act => {
            try {
                const desc = act.descripcion ? JSON.parse(JSON.stringify(act.descripcion)) : {};
                estadoMap.set(act.vaca_id, desc);
            } catch (e) {
                console.error(`Error al procesar JSON para la vaca ID ${act.vaca_id}:`, act.descripcion);
                estadoMap.set(act.vaca_id, {});
            }
        });

        vacas.forEach(vaca => {
            const lote = vaca.lote || 'Sin Lote';
            const ultimoEstado = estadoMap.get(vaca.id) || {};
            if (!stats[lote]) {
                stats[lote] = {
                    totalVacas: 0,
                    estados: { Gestante: 0, Estatica: 0, Ciclando: 0, Sucia: 0 },
                    razas: {}
                };
            }
            stats[lote].totalVacas++;
            if (ultimoEstado.gestante === 'Sí') stats[lote].estados.Gestante++;
            if (ultimoEstado.estatica === 'Sí') stats[lote].estados.Estatica++;
            if (ultimoEstado.ciclando === 'Sí') stats[lote].estados.Ciclando++;
            if (ultimoEstado.sucia) stats[lote].estados.Sucia++; 
            const raza = vaca.raza || 'Desconocida';
            stats[lote].razas[raza] = (stats[lote].razas[raza] || 0) + 1;
        });

        res.json(stats);
    } catch (error) {
        console.error("Error crítico generando estadísticas:", error);
        res.status(500).json({ message: "No se pudieron cargar los datos de estadísticas." });
    }
});

// ================== INICIO DEL SERVIDOR ==================
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log('Conectado a la base de datos de Supabase.');
});