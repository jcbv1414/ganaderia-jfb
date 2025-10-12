// server.fixed.js - Versión revisada y más segura de tu server.js
// Recomendaciones: coloca SUPABASE_URL y SUPABASE_KEY en variables de entorno.

const express = require('express');
const cors = require('cors');
const path = require('path');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');

// ================== CONFIGURACIÓN Y ARRANQUE ==================
const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // límite 5MB por archivo

// Validar variables de entorno mínimas
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn('ADVERTENCIA: SUPABASE_URL o SUPABASE_KEY no están definidas. La app puede fallar.');
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS - ajustar origen en producción
app.use(cors());
app.use(express.json()); // para JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// CONSTANTES
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;

// HELPERS
const prettyLabel = (k) => String(k || '').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
const formatDate = (dateString) => {
  if (!dateString) return '-';
  // Forzar la interpretación de la fecha como UTC para evitar desplazamientos
  const d = new Date(dateString + 'T00:00:00Z'); 
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

// FUNCIONES DE RESPUESTA DE ERROR UNIFORMES
function handleServerError(res, err, code = 500) {
  console.error(err && err.message ? err.message : err);
  if (res.headersSent) return;
  res.status(code).json({ success: false, message: err && err.message ? err.message : 'Error del servidor' });
}

// ================== ENDPOINT: REGISTER ==================
app.post('/api/register', async (req, res) => {
  try {
    const { nombre = '', email = '', password = '', rol = 'propietario', rancho_nombre = '' } = req.body || {};
    if (!email || !password || !nombre) return res.status(400).json({ message: 'Faltan datos obligatorios (nombre, email, password).' });

    const emailNorm = String(email).trim().toLowerCase();

    // Verifica si existe
    const { data: existing, error: existErr } = await supabase.from('usuarios').select('id').eq('email', emailNorm).maybeSingle();
    if (existErr) throw existErr;
    if (existing) return res.status(409).json({ message: 'El correo electrónico ya está en uso.' });

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const { data: newUser, error: insertErr } = await supabase.from('usuarios').insert({ nombre: nombre.trim(), email: emailNorm, password: hashedPassword, rol }).select().single();
    if (insertErr) throw insertErr;

    // Si es propietario, crea rancho inicial (si se proporcionó nombre)
    if (rol === 'propietario') {
      const codigoRancho = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error: ranchoError } = await supabase.from('ranchos').insert({ nombre: rancho_nombre || `${nombre.split(' ')[0]}'s Rancho`, codigo: codigoRancho, propietario_id: newUser.id });
      if (ranchoError) console.warn('No se pudo crear rancho por defecto:', ranchoError.message || ranchoError);
    }

    res.status(201).json({ success: true, message: 'Usuario registrado correctamente.' });
  } catch (err) {
    handleServerError(res, err);
  }
});

// ================== ENDPOINT: LOGIN ==================
app.post('/api/login', async (req, res) => {
  try {
    const { email = '', password = '' } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email y password son obligatorios.' });

    const emailNorm = String(email).trim().toLowerCase();
    const { data: user, error } = await supabase.from('usuarios').select('*').eq('email', emailNorm).maybeSingle();
    if (error) throw error;
    if (!user) return res.status(404).json({ message: 'Correo no encontrado.' });

    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) return res.status(401).json({ message: 'Contraseña incorrecta.' });

    // Si propietario, adjunta ranchos
    if (user.rol === 'propietario') {
      const { data: ranchos } = await supabase.from('ranchos').select('*').eq('propietario_id', user.id);
      user.ranchos = ranchos || [];
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    handleServerError(res, err);
  }
});

// ================== RANCHOS / MVZ ==================
app.post('/api/rancho/validate', async (req, res) => {
  try {
    const { codigo = '' } = req.body || {};
    if (!codigo) return res.status(400).json({ message: 'Código requerido.' });
    const { data: rancho, error } = await supabase.from('ranchos').select('*').eq('codigo', String(codigo).toUpperCase()).maybeSingle();
    if (error) throw error;
    if (!rancho) return res.status(404).json({ message: 'Código de rancho no válido.' });
    res.json(rancho);
  } catch (err) { handleServerError(res, err); }
});

app.get('/api/rancho/:ranchoId/mvz', async (req, res) => {
  try {
    const { ranchoId } = req.params;
    if (!ranchoId) return res.status(400).json({ message: 'ranchoId requerido.' });

    const { data, error } = await supabase
      .from('rancho_mvz_permisos')
      .select(`id, permisos, usuarios ( id, nombre, email )`)
      .eq('rancho_id', ranchoId);

    if (error) throw error;
    res.json(data || []);
  } catch (err) { handleServerError(res, err); }
});

// ================== VACAS ==================
app.get('/api/vacas/rancho/:ranchoId', async (req, res) => {
  try {
    const { ranchoId } = req.params;
    if (!ranchoId) return res.status(400).json({ message: 'ranchoId requerido.' });

    const { data, error } = await supabase.from('vacas').select('*').eq('rancho_id', ranchoId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { handleServerError(res, err); }
});

// Subir vaca (acepta foto opcional)
app.post('/api/vacas', upload.single('fotoVaca'), async (req, res) => {
  try {
    const body = req.body || {};
    const { nombre, siniiga, pierna, sexo, raza, nacimiento, padre, madre, origen, propietarioId, ranchoId } = body;
    if (!nombre || !siniiga || !propietarioId || !ranchoId) return res.status(400).json({ message: 'Faltan datos importantes (nombre, siniiga, propietarioId, ranchoId).' });

    let fotoPublicUrl = null;
    if (req.file) {
      const fotoFile = req.file;
      const fileName = `vacas/${ranchoId}-${String(siniiga).replace(/\s+/g, '_')}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from('fotos-ganado').upload(fileName, fotoFile.buffer, { contentType: fotoFile.mimetype });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('fotos-ganado').getPublicUrl(fileName);
      fotoPublicUrl = urlData ? urlData.publicUrl : null;
    }

    const insertPayload = {
      nombre: String(nombre).trim(),
      numero_siniiga: String(siniiga).trim(),
      numero_pierna: pierna || null,
      sexo: sexo || null,
      raza: raza || null,
      fecha_nacimiento: nacimiento || null,
      padre: padre || null,
      madre: madre || null,
      origen: origen || null,
      id_usuario: propietarioId,
      rancho_id: ranchoId,
      estado: 'Activa',
      foto_url: fotoPublicUrl
    };

    const { data, error } = await supabase.from('vacas').insert(insertPayload).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, message: 'Vaca registrada', vaca: data });
  } catch (err) { handleServerError(res, err); }
});

app.delete('/api/vacas/:vacaId', async (req, res) => {
  try {
    const { vacaId } = req.params;
    if (!vacaId) return res.status(400).json({ message: 'vacaId requerido.' });
    const { error } = await supabase.from('vacas').delete().eq('id', vacaId);
    if (error) throw error;
    res.json({ success: true, message: 'Vaca eliminada.' });
  } catch (err) { handleServerError(res, err); }
});

// ================== ACTIVIDADES, HISTORIAL Y REPORTES ==================
// En server.js, reemplaza el endpoint '/api/actividades' con este:
app.post('/api/actividades', async (req, res) => {
  try {
    const { mvzId, ranchoId = null, loteActividad, mvzNombre, ranchoNombre } = req.body || {};
    if (!mvzId || !Array.isArray(loteActividad) || loteActividad.length === 0) {
      return res.status(400).json({ message: 'Faltan datos para procesar la actividad.' });
    }

    const sesionId = crypto.randomUUID();

    const actividadesParaInsertar = loteActividad.map(item => ({
        tipo_actividad: item.tipoLabel,
        descripcion: item.detalles || {},
        fecha_actividad: item.fecha,
        id_vaca: item.vacaId || null, // Asumimos que el front puede enviar el id de la vaca
        id_usuario: mvzId,
        sesion_id: sesionId,
        extra_data: { arete: item.areteVaca, raza: item.raza, lote: item.loteNumero, rancho_id: ranchoId, rancho_nombre: ranchoNombre }
    }));

    const { error } = await supabase.from('actividades').insert(actividadesParaInsertar);
    if (error) throw error;
    
    // --- LÓGICA DE PDF INTEGRADA (COMO EN TU VERSIÓN ANTIGUA) ---
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_${Date.now()}.pdf"`);
    
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    doc.pipe(res);

    // Aquí usamos la lógica de diseño de PDF que ya habíamos reconstruido
    doc.fontSize(16).font('Helvetica-Bold').text('JFB Ganadería Inteligente', { align: 'right' });
    doc.fontSize(10).font('Helvetica')
      .text(`Rancho: ${ranchoNombre || 'Independiente'}`, { align: 'right' })
      .text(`Médico Veterinario: ${mvzNombre || '-'}`, { align: 'right' });
    doc.moveDown(1.5);
    
    const yBarra = doc.y;
    const tituloActividad = (loteActividad[0]?.tipoLabel || 'Actividades').toUpperCase();
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
    loteActividad.forEach(item => {
        const detallesFiltrados = Object.entries(item.detalles || {}).filter(([k,v])=>v&&v!=='No'&&v!=='').map(([k,v])=>`${prettyLabel(k)}: ${v}`).join('; ');
        const y = doc.y;
        // ... (resto de la lógica para dibujar la tabla, que es igual a la que ya te había dado)
        doc.text(item.areteVaca, 40, y, { width: 70 });
        doc.text(item.raza || '-', 110, y, { width: 80 });
        doc.text(item.loteNumero, 190, y, { width: 40, align: 'center' });
        doc.text(formatDate(item.fecha), 230, y, { width: 80 });
        doc.text(detallesFiltrados || 'Sin detalles', 310, y, { width: 260 });
        doc.y += Math.max(doc.heightOfString(item.raza || '-', {width:80}), doc.heightOfString(detallesFiltrados || '-', {width:260})) + 5;
        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(0.5);
    });

    doc.end();

  } catch (err) { handleServerError(res, err); }
});
// En server.js, agrega este nuevo endpoint
app.get('/api/actividades/vaca/:vacaId', async (req, res) => {
  try {
    const { vacaId } = req.params;
    if (!vacaId) {
        return res.status(400).json({ message: 'Se requiere el ID de la vaca.' });
    }

    const { data, error } = await supabase
      .from('actividades')
      .select('*, usuarios ( nombre )') // Supabase puede traer el nombre del usuario (MVZ) automáticamente
      .eq('id_vaca', vacaId)
      .order('fecha_actividad', { ascending: false });
    
    if (error) throw error;
    
    // El resultado ya incluye el nombre del MVZ en un objeto "usuarios"
    const historial = data.map(act => ({
        ...act,
        nombreMvz: act.usuarios ? act.usuarios.nombre : 'Desconocido'
    }));

    res.json(historial);

  } catch (err) {
    handleServerError(res, err);
  }
});

app.get('/api/actividades/mvz/:mvzId', async (req, res) => {
  try {
    const { mvzId } = req.params;
    if (!mvzId) return res.status(400).json({ message: 'mvzId requerido.' });

    // Esto debe apoyarse en un RPC o consulta que agrupe por sesión; si no existe, devolvemos actividades recientes.
    // Intentamos RPC primero (si existe)
    try {
      const { data, error } = await supabase.rpc('get_sesiones_actividad_mvz', { mvz_id: mvzId });
      if (!error && Array.isArray(data)) return res.json(data);
    } catch (rpcErr) { /* no crítico, continuamos con consulta */ }

    const { data, error } = await supabase.from('actividades').select('*').eq('id_usuario', mvzId).order('fecha_actividad', { ascending: false }).limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch (err) { handleServerError(res, err); }
});

// Generar PDF desde sesiones/actividades (recibe array de sesion_ids o array de actividades)
// En server.js, reemplaza el endpoint de PDF con este:

app.post('/api/historial/pdf', async (req, res) => {
  try {
    const { sesion_ids, mvzNombre } = req.body || {};
    if (!Array.isArray(sesion_ids) || sesion_ids.length === 0) {
      return res.status(400).json({ message: 'Parámetros inválidos.' });
    }

    const { data: actividades, error } = await supabase
      .from('actividades')
      .select('*')
      .in('sesion_id', sesion_ids)
      .order('fecha_actividad', { ascending: false });

    if (error) throw error;
    if (!actividades || !actividades.length) {
      return res.status(404).json({ message: 'No se encontraron actividades.' });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_historial_${Date.now()}.pdf"`);
    
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    doc.pipe(res);

    // --- CORRECCIÓN DEL LOGO ---
    const logoPath = path.join(__dirname, 'public', 'assets', 'logo.png');
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 25, { width: 90 });
    } else {
        console.warn('ADVERTENCIA: No se encontró el logo en la ruta:', logoPath);
    }
    
    doc.fontSize(16).font('Helvetica-Bold').text('JFB Ganadería Inteligente', { align: 'right' });
    doc.fontSize(10).font('Helvetica')
      .text(`Médico Veterinario: ${mvzNombre || '-'}`, { align: 'right' });
    doc.moveDown(2);
    
    const yBarra = doc.y;
    const tituloActividad = (actividades[0]?.tipo_actividad || 'Actividades').toUpperCase();
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
    actividades.forEach(item => {
        const arete = item.extra_data?.arete || '-';
        const raza = item.extra_data?.raza || '-';
        const lote = item.extra_data?.lote || '-';
        const fecha = item.fecha_actividad;

        // --- CORRECCIÓN DE LOS DETALLES ---
        let detalles = item.descripcion || {};
        // Si 'detalles' es un string, lo parseamos a objeto
        if (typeof detalles === 'string') {
            try { detalles = JSON.parse(detalles); } catch (e) { detalles = {}; }
        }
        
        const detallesFiltrados = Object.entries(detalles)
            .filter(([key, value]) => value && value !== 'No' && value !== '')
            .map(([key, value]) => `${prettyLabel(key)}: ${value}`)
            .join('; ');

        const y = doc.y;
        if (doc.y > 700) doc.addPage();
        
        doc.text(arete, 40, y, { width: 70 });
        doc.text(raza, 110, y, { width: 80 });
        doc.text(lote, 190, y, { width: 40, align: 'center' });
        doc.text(formatDate(fecha), 230, y, { width: 80 });
        doc.text(detallesFiltrados || 'Sin detalles', 310, y, { width: 260 });
        
        const rowHeight = doc.y - y + 10; // Altura calculada dinámicamente
        doc.y = y + rowHeight;
        
        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(0.5);
    });

    doc.end();

  } catch (err) {
    handleServerError(res, err);
  }
});

// ================== ESTADÍSTICAS ==================
app.get('/api/rancho/:ranchoId/estadisticas', async (req, res) => {
  try {
    const { ranchoId } = req.params;
    if (!ranchoId) return res.status(400).json({ message: 'ranchoId requerido.' });

    // Obtenemos vacas y sus últimas actividades de palpación si existe RPC
    const { data: vacas, error: vacasError } = await supabase.from('vacas').select('id, lote, raza').eq('rancho_id', ranchoId);
    if (vacasError) throw vacasError;
    if (!vacas || vacas.length === 0) return res.json({});

    const cowIds = vacas.map(v => v.id);
    let ultimasActividades = [];
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_latest_palpacion_for_cows', { cow_ids: cowIds });
      if (!rpcError && Array.isArray(rpcData)) ultimasActividades = rpcData;
    } catch (rpcErr) {
      console.warn('RPC get_latest_palpacion_for_cows no está disponible o falló, continuando sin él.');
    }

    const estadoMap = new Map();
    ultimasActividades.forEach(act => {
      try {
        const desc = typeof act.descripcion === 'string' ? JSON.parse(act.descripcion) : act.descripcion || {};
        estadoMap.set(act.vaca_id, desc);
      } catch (e) {
        console.error('Error parseando descripcion:', e);
        estadoMap.set(act.vaca_id, {});
      }
    });

    const stats = {};
    vacas.forEach(vaca => {
      const lote = vaca.lote || 'Sin Lote';
      if (!stats[lote]) stats[lote] = { totalVacas: 0, estados: { Gestante: 0, Estatica: 0, Ciclando: 0 }, razas: {} };
      stats[lote].totalVacas++;
      const ultimo = estadoMap.get(vaca.id) || {};
      if (ultimo.gestante === 'Sí') stats[lote].estados.Gestante++;
      if (ultimo.estatica === 'Sí') stats[lote].estados.Estatica++;
      if (ultimo.ciclando === 'Sí') stats[lote].estados.Ciclando++;
      const raza = vaca.raza || 'Desconocida';
      stats[lote].razas[raza] = (stats[lote].razas[raza] || 0) + 1;
    });

    res.json(stats);
  } catch (err) { handleServerError(res, err); }
});

// ================== INICIO DEL SERVIDOR ==================
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});