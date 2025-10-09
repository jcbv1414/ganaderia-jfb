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
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ================== CONFIGURACIÓN DE EXPRESS ==================
const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors()); // Simplificado para desarrollo, ajustar para producción
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================== CONSTANTES Y HELPERS ==================
const SALT_ROUNDS = 10;
const prettyLabel = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

// ================== ENDPOINTS DE LA API ==================

// --- Autenticación ---
app.post('/api/register', async (req, res) => {
    const { nombre, email, password, rol, rancho_nombre } = req.body;
    try {
        const { data: existingUser } = await supabase.from('usuarios').select('email').eq('email', email.toLowerCase()).single();
        if (existingUser) return res.status(409).json({ message: 'El correo electrónico ya está en uso.' });

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const { data: newUser, error: userError } = await supabase.from('usuarios').insert({ nombre, email: email.toLowerCase(), password: hashedPassword, rol }).select().single();
        if (userError) throw userError;

        if (rol === 'propietario') {
            const codigoRancho = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { error: ranchoError } = await supabase.from('ranchos').insert({ nombre: rancho_nombre, codigo: codigoRancho, propietario_id: newUser.id });
            if (ranchoError) throw ranchoError;
        }
        res.status(201).json({ success: true, message: '¡Usuario registrado exitosamente!' });
    } catch (error) {
        res.status(500).json({ message: 'Ocurrió un error inesperado.', details: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data: user, error } = await supabase.from('usuarios').select('*').eq('email', email.toLowerCase()).single();
        if (error || !user) return res.status(404).json({ message: 'El correo electrónico no fue encontrado.' });
        
        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) return res.status(401).json({ message: 'Contraseña incorrecta.' });

        if (user.rol === 'propietario') {
            const { data: ranchos } = await supabase.from('ranchos').select('*').eq('propietario_id', user.id);
            user.ranchos = ranchos || [];
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } catch (err) {
        res.status(500).json({ message: 'Ocurrió un error inesperado.' });
    }
});

// ================== ENDPOINTS DE MVZ Y RANCHOS ==================
app.post('/api/rancho/validate', async (req, res) => {
    const { codigo } = req.body;
    try {
        const { data: rancho, error } = await supabase.from('ranchos').select('*').eq('codigo', (codigo || '').toUpperCase()).single();
        if (error || !rancho) return res.status(404).json({ message: 'Código de rancho no válido.' });
        res.json(rancho);
    } catch (err) {
        res.status(500).json({ message: 'Error validando el código.' });
    }
});
// ================== ENDPOINTS DE VACAS ==================
app.get('/api/vacas/rancho/:ranchoId', async (req, res) => {
    const { ranchoId } = req.params;
    try {
        const { data, error } = await supabase.from('vacas').select('*').eq('rancho_id', ranchoId).order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: "Error al obtener el ganado." });
    }
});

// ¡ENDPOINT CORREGIDO PARA ACEPTAR FOTOS!
app.post('/api/vacas', upload.single('fotoVaca'), async (req, res) => {
    const { nombre, siniiga, pierna, sexo, raza, nacimiento, padre, madre, origen, propietarioId, ranchoId } = req.body;
    const fotoFile = req.file;

    if (!nombre || !siniiga || !propietarioId || !ranchoId) {
        return res.status(400).json({ message: 'Faltan datos importantes.' });
    }

    try {
        let fotoPublicUrl = null;
        if (fotoFile) {
            const fileName = `vacas/${ranchoId}-${siniiga}-${Date.now()}`;
            const { error: uploadError } = await supabase.storage
                .from('fotos-ganado') // Asegúrate de que este bucket exista y sea público
                .upload(fileName, fotoFile.buffer, { contentType: fotoFile.mimetype });

            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage.from('fotos-ganado').getPublicUrl(fileName);
            fotoPublicUrl = urlData.publicUrl;
        }

        const { data, error } = await supabase.from('vacas').insert({
            nombre, numero_siniiga: siniiga, numero_pierna: pierna, sexo, raza,
            fecha_nacimiento: nacimiento, padre, madre, origen,
            id_usuario: propietarioId, rancho_id: ranchoId, estado: 'Activa',
            foto_url: fotoPublicUrl // Guardamos el enlace de la foto
        }).select().single();

        if (error) throw error;
        res.status(201).json({ success: true, message: 'Vaca registrada', vaca: data });

    } catch (err) {
        console.error('Error al agregar vaca:', err);
        res.status(500).json({ message: 'Error en el servidor al registrar la vaca.' });
    }
});

app.delete('/api/vacas/:vacaId', async (req, res) => {
    const { vacaId } = req.params;
    try {
        const { error } = await supabase.from('vacas').delete().eq('id', vacaId);
        if (error) throw error;
        res.status(200).json({ success: true, message: 'Vaca eliminada.' });
    } catch (err) {
        res.status(500).json({ message: 'Error al eliminar la vaca.' });
    }
});

// ================== ENDPOINT DE ACTIVIDADES Y PDF (NUEVO Y MEJORADO) ==================
app.post('/api/actividades', async (req, res) => {
    const { mvzId, ranchoId, loteActividad } = req.body;

    if (!mvzId || !Array.isArray(loteActividad) || loteActividad.length === 0) {
        return res.status(400).json({ message: 'Faltan datos para procesar la actividad.' });
    }

    try {
        // Busca los IDs de las vacas si el rancho está registrado
        let mapaAreteAId = new Map();
        if (ranchoId) {
            const aretesDelLote = loteActividad.map(item => item.areteVaca);
            const { data: vacas } = await supabase.from('vacas').select('id, numero_siniiga').in('numero_siniiga', aretesDelLote);
            mapaAreteAId = new Map(vacas.map(v => [String(v.numero_siniiga), v.id]));
        }

        const actividadesParaInsertar = loteActividad.map(item => ({
            tipo_actividad: item.tipoLabel,
            descripcion: item.detalles,
            fecha_actividad: item.fecha,
            id_vaca: mapaAreteAId.get(String(item.areteVaca)) || null, // Nulo si es independiente sin vaca registrada
            id_usuario: mvzId,
            // Guardamos info extra para el reporte
            extra_data: {
                arete: item.areteVaca,
                raza: item.raza,
                lote: item.loteNumero
            }
        }));

        const { data, error } = await supabase.from('actividades').insert(actividadesParaInsertar).select();
        if (error) throw error;
        
        res.status(201).json({ success: true, message: 'Actividad guardada.', actividades: data });
    } catch (err) {
        console.error("Error al guardar actividad:", err);
        res.status(500).json({ message: 'Error al guardar la actividad.' });
    }
});

// ¡ENDPOINT DE PDF ACTIVADO!
app.post('/api/actividades/pdf', async (req, res) => {
    const { actividades, ranchoNombre, mvzNombre } = req.body;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_actividad.pdf"`);
    
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    doc.pipe(res);
    
    // Encabezado
    doc.fontSize(16).font('Helvetica-Bold').text('JFB Ganadería Inteligente', { align: 'right' });
    doc.fontSize(10).font('Helvetica').text(`Rancho: ${ranchoNombre}`, { align: 'right' }).text(`Médico Veterinario: ${mvzNombre}`, { align: 'right' });
    doc.moveDown(1.5);
    const tituloActividad = (actividades[0]?.tipo_actividad || 'Actividades').toUpperCase();
    doc.fillColor('white').font('Helvetica-Bold').fontSize(12).text(`REPORTE DE ${tituloActividad}`, { align: 'center' });
    doc.fillColor('black').moveDown(2);

    // Tabla de Contenido
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Arete/Pierna', 40, tableTop);
    doc.text('Lote', 150, tableTop, { width: 40, align: 'center' });
    doc.text('Fecha', 200, tableTop);
    doc.text('Detalles', 310, tableTop, { width: 260 });
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.5);

    // Filas
    doc.font('Helvetica');
    actividades.forEach(item => {
        const detalles = item.descripcion || item.extra_data.detalles; // Compatibilidad
        const detallesFiltrados = Object.entries(detalles || {}).filter(([, value]) => value && value !== 'No').map(([key, value]) => `${prettyLabel(key)}: ${value}`).join('; ');
        const y = doc.y;
        doc.text(item.extra_data.arete, 40, y);
        doc.text(item.extra_data.lote, 150, y, { width: 40, align: 'center' });
        doc.text(formatDate(item.fecha_actividad), 200, y);
        doc.text(detallesFiltrados || 'Sin detalles', 310, y, { width: 260 });
        doc.moveDown(1);
        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(0.5);
    });

    doc.end();
});

app.get('/api/mvz/:mvzId/historial', async (req, res) => {
    const { mvzId } = req.params;
    try {
        const { data, error } = await supabase.from('mvz_historial').select('*').eq('mvz_id', mvzId).order('fecha', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Error al cargar el historial.' });
    }
});

app.post('/api/historial/pdf', async (req, res) => {
    const { historialIds, mvzId } = req.body;
    try {
        const { data: historiales } = await supabase.from('mvz_historial').select('*').in('id', historialIds);
        const { data: registros } = await supabase.from('mvz_registros').select('*').in('historial_id', historialIds);
        const { data: mvz } = await supabase.from('usuarios').select('nombre').eq('id', mvzId).single();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="reporte.pdf"`);
        const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
        doc.pipe(res);

        historiales.forEach((historial, index) => {
            if (index > 0) doc.addPage();
            doc.fontSize(16).font('Helvetica-Bold').text('JFB Ganadería Inteligente', { align: 'center' });
            doc.moveDown(2);
            doc.fontSize(10).font('Helvetica').text(`Rancho: ${historial.rancho_nombre}`).text(`MVZ: ${mvz?.nombre || '-'}`).text(`Fecha: ${formatDate(historial.fecha)}`);
            doc.moveDown();
            
            const titulo = (historial.tipo_actividad || 'Actividades').toUpperCase();
            doc.fontSize(12).font('Helvetica-Bold').text(`REPORTE DE ${titulo}`, { align: 'center' });
            doc.moveDown();
            
            const tableTop = doc.y;
            doc.font('Helvetica-Bold').text('Arete', 40, tableTop).text('Detalles', 140, tableTop, { width: 430 });
            doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
            doc.moveDown(0.5);
            doc.font('Helvetica');

            const registrosDelHistorial = registros.filter(r => r.historial_id === historial.id);
            registrosDelHistorial.forEach(item => {
                const detalles = Object.entries(item.detalles || {}).filter(([, value]) => value && value !== 'No').map(([key, value]) => `${prettyLabel(key)}: ${value}`).join('; ');
                const y = doc.y;
                doc.text(item.numero_arete, 40, y);
                doc.text(detalles || 'Sin detalles', 140, y, { width: 430 });
                if (doc.y > 720) doc.addPage();
                doc.moveDown(0.5);
                doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#cccccc').stroke();
                doc.moveDown(0.5);
            });
        });
        doc.end();
    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: 'Error al generar el PDF.' });
    }
});

// ================== ENDPOINTS DE ESTADÍSTICAS ==================
app.get('/api/rancho/:ranchoId/estadisticas', async (req, res) => {
    const { ranchoId } = req.params;
    try {
        const { data: vacas, error: vacasError } = await supabase.from('vacas').select('id, lote, raza').eq('rancho_id', ranchoId);
        if (vacasError) throw vacasError;
        if (!vacas || vacas.length === 0) return res.json({}); // Devuelve objeto vacío si no hay vacas

        const cowIds = vacas.map(v => v.id);
        // Supabase RPC para obtener la última actividad de palpación
        const { data: ultimasActividades, error: rpcError } = await supabase.rpc('get_latest_palpacion_for_cows', { cow_ids: cowIds });
        if (rpcError) throw rpcError;

        const stats = {};
        const estadoMap = new Map();
        
        ultimasActividades.forEach(act => {
            try {
                // Asegurarse de que `descripcion` es un objeto
                const desc = typeof act.descripcion === 'string' ? JSON.parse(act.descripcion) : act.descripcion || {};
                estadoMap.set(act.vaca_id, desc);
            } catch (e) {
                console.error(`Error parsing JSON for vaca_id ${act.vaca_id}:`, act.descripcion);
                estadoMap.set(act.vaca_id, {}); // Fallback a objeto vacío
            }
        });

        vacas.forEach(vaca => {
            const lote = vaca.lote || '1'; // Lote por defecto si es nulo
            if (!stats[lote]) {
                stats[lote] = {
                    totalVacas: 0,
                    estados: { Gestante: 0, Estatica: 0, Ciclando: 0 },
                    razas: {}
                };
            }
            stats[lote].totalVacas++;
            const ultimoEstado = estadoMap.get(vaca.id) || {};
            if (ultimoEstado.gestante === 'Sí') stats[lote].estados.Gestante++;
            if (ultimoEstado.estatica === 'Sí') stats[lote].estados.Estatica++;
            if (ultimoEstado.ciclando === 'Sí') stats[lote].estados.Ciclando++;
            
            const raza = vaca.raza || 'Desconocida';
            stats[lote].razas[raza] = (stats[lote].razas[raza] || 0) + 1;
        });
        res.json(stats);
    } catch (error) {
        console.error("Error generando estadísticas:", error);
        res.status(500).json({ message: "Error al generar estadísticas" });
    }
});
// AGREGA ESTOS DOS ENDPOINTS A TU server.js

// Obtiene el historial de actividades de un MVZ, agrupadas por sesión
app.get('/api/actividades/mvz/:mvzId', async (req, res) => {
    const { mvzId } = req.params;
    try {
        const { data, error } = await supabase.rpc('get_sesiones_actividad_mvz', { mvz_id: mvzId });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Error fetching MVZ history:", err);
        res.status(500).json({ message: "Error al obtener historial." });
    }
});

// Genera un PDF a partir de una lista de IDs de sesión
app.post('/api/historial/pdf', async (req, res) => {
    const { sesion_ids, mvzNombre } = req.body;
    try {
        const { data: actividades, error } = await supabase
            .from('actividades')
            .select('*')
            .in('sesion_id', sesion_ids)
            .order('fecha_actividad', { ascending: false });

        if (error) throw error;
        if (actividades.length === 0) return res.status(404).json({ message: 'Actividades no encontradas.' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="reporte_historial.pdf"`);
        
        const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
        doc.pipe(res);
        
        doc.fontSize(16).font('Helvetica-Bold').text('Reporte de Actividades', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(`Médico Veterinario: ${mvzNombre}`, { align: 'center' });
        doc.moveDown(2);

        let ranchoActual = null;
        actividades.forEach(item => {
            const ranchoNombre = item.extra_data.rancho_nombre || 'Rancho no especificado';
            if (ranchoNombre !== ranchoActual) {
                doc.moveDown(1);
                doc.fontSize(12).font('Helvetica-Bold').text(`Rancho: ${ranchoNombre}`);
                doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
                doc.moveDown(0.5);
                ranchoActual = ranchoNombre;
            }
            
            const detalles = Object.entries(item.descripcion || {}).map(([key, value]) => `${prettyLabel(key)}: ${value}`).join(', ');
            doc.fontSize(10).font('Helvetica').text(`- Arete ${item.extra_data.arete} (${formatDate(item.fecha_actividad)}): ${detalles}`);
        });

        doc.end();

    } catch (err) {
        console.error("Error generando PDF de historial:", err);
        res.status(500).json({ message: 'Error al generar el PDF.' });
    }
});

// ================== INICIO DEL SERVIDOR ==================
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});