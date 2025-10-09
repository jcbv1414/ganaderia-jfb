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

app.post('/api/vacas', async (req, res) => {
    // Acepta JSON, no FormData
    const { nombre, siniiga, pierna, sexo, raza, nacimiento, padre, madre, origen, propietarioId, ranchoId } = req.body;
    if (!nombre || !siniiga || !propietarioId || !ranchoId) {
        return res.status(400).json({ message: 'Faltan datos importantes.' });
    }
    try {
        const { data, error } = await supabase.from('vacas').insert({
            nombre,
            numero_siniiga: siniiga,
            numero_pierna: pierna,
            sexo,
            raza,
            fecha_nacimiento: nacimiento,
            padre,
            madre,
            origen,
            id_usuario: propietarioId,
            rancho_id: ranchoId,
            estado: 'Activa' // Estado por defecto
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

app.post('/api/actividades', async (req, res) => {
    const { mvzId, ranchoId, ranchoNombre, actividades, tipoActividad } = req.body;
    try {
        const { data: historial, error: historialError } = await supabase.from('mvz_historial').insert({
            mvz_id: mvzId, rancho_id: ranchoId, rancho_nombre: ranchoNombre,
            tipo_actividad: tipoActividad, numero_animales: actividades.length
        }).select().single();
        if (historialError) throw historialError;

        const registros = actividades.map(act => ({
            historial_id: historial.id, numero_arete: act.areteVaca, detalles: act.detalles
        }));
        await supabase.from('mvz_registros').insert(registros);
        
        // ¡IMPORTANTE! Si es un rancho real, actualizamos el estado de las vacas
        if(ranchoId && actividades.length > 0) {
            for (const act of actividades) {
                await supabase.from('vacas')
                    .update({ 
                        ultimo_estado: act.detalles, 
                        fecha_ultimo_estado: new Date().toISOString() 
                    })
                    .eq('rancho_id', ranchoId)
                    .eq('numero_arete', act.areteVaca);
            }
        }
        res.status(201).json({ success: true, message: 'Actividad guardada en el historial.' });
    } catch (err) {
        res.status(500).json({ message: 'Error al guardar la actividad.', details: err.message });
    }
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


// ================== INICIO DEL SERVIDOR ==================
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});