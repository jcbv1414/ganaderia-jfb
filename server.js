// server.js - Versión Limpia
const express = require('express');
const multer = require('multer'); // <--- Añadir esto
const cors = require('cors');
const path = require('path');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
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

// CONSTANTES Y HELPERS
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;
const prettyLabel = (k) => String(k || '').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString + 'T00:00:00Z'); 
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(d);
};
function handleServerError(res, err, code = 500) {
  console.error(err.message || err);
  if (res.headersSent) return;
  res.status(code).json({ success: false, message: err.message || 'Error del servidor' });
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
        // ----- EL "CHISMOSO" -----
        console.log('--- NUEVA SOLICITUD PARA GUARDAR VACA ---');
        console.log('Datos recibidos en el body:', req.body);
        // -------------------------

        const { nombre, siniiga, pierna, sexo, raza, nacimiento, padre, madre, origen, propietarioId, ranchoId, lote } = req.body;

        if (!nombre || !siniiga || !propietarioId || !ranchoId) {
            console.error('Validación falló. Datos que SÍ llegaron:', { nombre, siniiga, propietarioId, ranchoId });
            return res.status(400).json({ message: 'Faltan datos importantes (nombre, siniiga, propietarioId, ranchoId).' });
        }

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
            foto_url: fotoPublicUrl,
            lote: lote || null
        };

        const { data, error } = await supabase.from('vacas').insert(insertPayload).select().single();
        if (error) throw error;
        res.status(201).json({ success: true, message: 'Vaca registrada', vaca: data });

    } catch (err) { 
        console.error("ERROR COMPLETO EN /api/vacas:", err);
        handleServerError(res, err); 
    }
});
// Ruta para ACTUALIZAR (Editar) una vaca existente
app.put('/api/vacas/:vacaId', upload.single('fotoVaca'), async (req, res) => {
    try {
        const { vacaId } = req.params;
        const { nombre, siniiga, pierna, sexo, raza, nacimiento, padre, madre, origen, lote } = req.body;

        let updatePayload = {
            nombre, numero_siniiga: siniiga, numero_pierna: pierna, sexo, raza, fecha_nacimiento: nacimiento, padre, madre, origen, lote
        };

        // Si se sube una nueva foto, la procesamos
        if (req.file) {
            const fotoFile = req.file;
            const fileName = `vacas/${vacaId}-${Date.now()}`;
            const { error: uploadError } = await supabase.storage.from('fotos-ganado').upload(fileName, fotoFile.buffer, { contentType: fotoFile.mimetype });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('fotos-ganado').getPublicUrl(fileName);
            updatePayload.foto_url = urlData ? urlData.publicUrl : null;
        }

        const { data, error } = await supabase.from('vacas').update(updatePayload).eq('id', vacaId).select().single();
        if (error) throw error;
        res.json({ success: true, message: 'Vaca actualizada', vaca: data });
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

// Endpoint para que un MVZ obtenga la lista de sus ranchos asociados
app.get('/api/ranchos/mvz/:mvzId', async (req, res) => {
    try {
        const { mvzId } = req.params;
        const { data, error } = await supabase
            .from('rancho_mvz_permisos')
            .select('ranchos (*)')
            .eq('mvz_id', mvzId);
        if (error) throw error;
        // Filtramos por si algún rancho es nulo y devolvemos solo la lista de ranchos
        const ranchos = data.map(item => item.ranchos).filter(Boolean);
        res.json(ranchos || []);
    } catch (err) { handleServerError(res, err); }
});





// ================== RUTAS PARA GESTIONAR PERMISOS DE MVZ ==================

// Ruta para ACTUALIZAR el permiso de un MVZ
app.patch('/api/rancho/mvz/:permisoId', async (req, res) => {
    try {
        const { permisoId } = req.params;
        const { permisos } = req.body;
        if (!permisos) return res.status(400).json({ message: 'Se requiere un nuevo permiso.' });

        const { data, error } = await supabase
            .from('rancho_mvz_permisos')
            .update({ permisos })
            .eq('id', permisoId)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, message: 'Permiso actualizado', permiso: data });
    } catch (err) { handleServerError(res, err); }
});

// Ruta para REVOCAR ACCESO (Eliminar) a un MVZ
app.delete('/api/rancho/mvz/:permisoId', async (req, res) => {
    try {
        const { permisoId } = req.params;
        const { error } = await supabase
            .from('rancho_mvz_permisos')
            .delete()
            .eq('id', permisoId);

        if (error) throw error;
        res.json({ success: true, message: 'Acceso revocado correctamente.' });
    } catch (err) { handleServerError(res, err); }
});

// ================== ACTIVIDADES, HISTORIAL Y REPORTES ==================
app.post('/api/actividades', async (req, res) => {
    console.log('---[INSPECTOR] Recibida nueva solicitud de actividad---');
    try {
        const { mvzId, ranchoId, loteActividad, mvzNombre, ranchoNombre } = req.body;
        console.log('[INSPECTOR] Datos iniciales recibidos:', { mvzId, ranchoId, mvzNombre, ranchoNombre });

        if (!mvzId || !Array.isArray(loteActividad) || loteActividad.length === 0) {
            console.error('[INSPECTOR] Faltan datos críticos. Abortando.');
            return res.status(400).json({ message: 'Faltan datos para procesar la actividad.' });
        }
        console.log(`[INSPECTOR] Lote de actividad tiene ${loteActividad.length} registros.`);

        const sesionId = crypto.randomUUID();
        const actividadesParaInsertar = loteActividad.map(item => ({
            tipo_actividad: item.tipoLabel,
            descripcion: item.detalles || {},
            fecha_actividad: item.fecha,
            id_vaca: item.vacaId || null,
            id_usuario: mvzId,
            sesion_id: sesionId,
            rancho_id: ranchoId,
            extra_data: { arete: item.areteVaca, raza: item.raza, lote: item.loteNumero, rancho_nombre: ranchoNombre }
        }));
        console.log('[INSPECTOR] Datos listos para insertar en la base de datos.');

        const { error } = await supabase.from('actividades').insert(actividadesParaInsertar);
        if (error) {
            console.error('[INSPECTOR] ¡ERROR DE SUPABASE AL INSERTAR!', error);
            throw error;
        }
        console.log('[INSPECTOR] Datos guardados en Supabase correctamente.');
        console.log('[INSPECTOR] Iniciando la creación del PDF...');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="reporte_${Date.now()}.pdf"`);
        const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
        doc.pipe(res);

    // CORRECCIÓN: Añadir el logo al PDF
    try {
      const logoPath = path.join(__dirname, 'public', 'assets', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 25, { width: 90 });
      }
    } catch (logoErr) {
      console.warn('Advertencia: No se pudo cargar el logo para el PDF.', logoErr.message);
    }

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

     console.log('[INSPECTOR] PDF creado y enviado. ¡Proceso completado con éxito!');
        doc.end();

    } catch (err) {
        console.error('---[INSPECTOR] ¡CRASH! El proceso falló. Causa del error: ---');
        console.error(err); // Imprime el error completo en los logs del servidor
        handleServerError(res, err);
    }
});
// En server.js, agrega este nuevo endpoint
app.delete('/api/sesiones/:sesionId', async (req, res) => {
  try {
    const { sesionId } = req.params;
    if (!sesionId) {
      return res.status(400).json({ message: 'Se requiere el ID de la sesión.' });
    }

    const { error } = await supabase
      .from('actividades')
      .delete()
      .eq('sesion_id', sesionId);
    
    if (error) throw error;

    res.json({ success: true, message: 'Sesión eliminada correctamente.' });

  } catch (err) {
    handleServerError(res, err);
  }
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

    // Consulta mejorada para obtener los datos necesarios para agrupar
    const { data, error } = await supabase
      .from('actividades')
      .select('sesion_id, tipo_actividad, fecha_actividad, extra_data')
      .eq('id_usuario', mvzId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Agrupamos las actividades por sesión aquí en el servidor
    const sesiones = (data || []).reduce((acc, act) => {
        // Si la sesión aún no está en nuestro acumulador, la creamos
        if (!acc[act.sesion_id]) {
            acc[act.sesion_id] = {
                sesion_id: act.sesion_id,
                tipo_actividad: act.tipo_actividad,
                rancho_nombre: act.extra_data?.rancho_nombre || 'Independiente',
                fecha: act.fecha_actividad,
                conteo: 0
            };
        }
        // Incrementamos el contador de animales para esa sesión
        acc[act.sesion_id].conteo++;
        return acc;
    }, {});

    // Convertimos el objeto de sesiones de nuevo a un array y lo enviamos
    res.json(Object.values(sesiones));

  } catch (err) { handleServerError(res, err); }
});

// Generar PDF desde sesiones/actividades (recibe array de sesion_ids o array de actividades)
// En server.js, reemplaza el endpoint de PDF con este:

app.post('/api/historial/pdf', async (req, res) => {
    console.log('---[HISTORIAL-INSPECTOR] Solicitud para generar PDF de historial recibida ---');
    try {
        const { sesion_ids, mvzNombre } = req.body || {};
        if (!Array.isArray(sesion_ids) || sesion_ids.length === 0) {
            console.error('[HISTORIAL-INSPECTOR] Error: No se recibieron IDs de sesión.');
            return res.status(400).json({ message: 'Parámetros inválidos.' });
        }
        console.log('[HISTORIAL-INSPECTOR] Buscando actividades para las sesiones:', sesion_ids);

        const { data: actividades, error } = await supabase
            .from('actividades')
            .select('*')
            .in('sesion_id', sesion_ids)
            .order('fecha_actividad', { ascending: false });

        if (error) {
            console.error('[HISTORIAL-INSPECTOR] ¡Error de Supabase al buscar actividades!', error);
            throw error;
        }
        if (!actividades || !actividades.length) {
            console.warn('[HISTORIAL-INSPECTOR] No se encontraron actividades para estas sesiones.');
            return res.status(404).json({ message: 'No se encontraron actividades.' });
        }
        console.log(`[HISTORIAL-INSPECTOR] Se encontraron ${actividades.length} actividades. Iniciando creación de PDF.`);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="reporte_historial_${Date.now()}.pdf"`);
        
        const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
        doc.pipe(res);
    // --- CORRECCIÓN DEL LOGO ---
    try {
    const logoPath = path.join(__dirname, 'public', 'assets', 'logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    doc.image(logoBuffer, 40, 25, { width: 90 });
} catch (logoErr) {
    console.warn('ADVERTENCIA: No se pudo cargar el logo para el PDF.', logoErr.message);
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
 actividades.forEach((item, index) => {
    const arete = item.extra_data?.arete || item.areteVaca || '-';
    const raza = item.extra_data?.raza || 'N/A';
    const lote = item.extra_data?.lote || 'N/A';
    const tipoLabel = item.tipoLabel || item.tipo || 'Actividad';

    // Asegurarse de que fecha_actividad tenga un valor antes de intentar formatearlo
    const rawDate = item.fecha_actividad || item.fecha; // Usar fecha o fecha_actividad
    const dateObj = rawDate ? new Date(rawDate + 'T00:00:00Z') : null; // Asumir UTC para evitar desfases
    const fecha = dateObj ? dateObj.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }) : 'Fecha desconocida';

    let detalles = item.descripcion || {};
    if (typeof detalles === 'string') {
        try {
            detalles = JSON.parse(detalles);
        } catch (e) {
            detalles = { 'Observaciones': detalles };
        }
    }
    // Filtramos "raza" nuevamente para asegurar que no aparezca en los detalles
    const detallesFiltrados = Object.entries(detalles)
        .filter(([key, value]) => value && value !== 'No' && value !== '' && key !== 'raza')
        .map(([key, value]) => `${prettyLabel(key)}: ${value}`)
        .join('; ');

    // Altura inicial para la fila
    let currentY = doc.y;

    // Tipo de Actividad como título de sección
    doc.font('Helvetica-Bold').fontSize(12).text(`${tipoLabel} (Lote: ${lote})`, 50, currentY);
    currentY = doc.y + 5; // Espacio después del título

    // Detalles principales en dos columnas
    doc.font('Helvetica').fontSize(10);
    doc.text(`Arete: ${arete}`, 60, currentY, { width: 200 });
    doc.text(`Raza: ${raza}`, 260, currentY, { width: 100 });
    doc.text(`Fecha: ${fecha}`, 360, currentY, { width: 150 });
    currentY = doc.y + 15; // Espacio después de la primera línea de detalles

    // Detalles adicionales (la cadena "Estática: Sí; Ciclando: No;")
    if (detallesFiltrados) {
        doc.font('Helvetica-Oblique').fontSize(9).text(`Detalles: ${detallesFiltrados}`, 60, currentY, { width: 450 });
        currentY = doc.y + 15;
    }

    // Línea separadora para la siguiente actividad
    doc.strokeColor('#cccccc').lineWidth(0.5).moveTo(50, currentY).lineTo(550, currentY).stroke();
    doc.moveDown(0.5); // Pequeño espacio después del separador

    // Añadir una nueva página si no hay suficiente espacio para la siguiente actividad
    if (doc.y + 60 > doc.page.height - doc.page.margins.bottom && index < actividades.length - 1) {
        doc.addPage();
        doc.text('Historial de Actividades (continuación)', 50, 50); // Título de continuación
        doc.moveDown(0.5);
    }
});

     console.log('[HISTORIAL-INSPECTOR] PDF de historial creado y enviado correctamente.');
        doc.end();

    } catch (err) {
        console.error('---[HISTORIAL-INSPECTOR] ¡CRASH! El proceso falló. Causa del error: ---');
        console.error(err);
        // Evitamos enviar una respuesta de error si el PDF ya empezó a enviarse
        if (!res.headersSent) {
            res.status(500).json({ message: 'Hubo un error inesperado al generar el reporte.' });
        }
    }
});

app.get('/api/eventos/mvz/:mvzId', async (req, res) => {
    try {
        const { mvzId } = req.params;
        const { data, error } = await supabase
            .from('eventos')
            .select('*')
            .eq('mvz_id', mvzId)
            .gte('fecha_evento', new Date().toISOString()) // Solo eventos futuros
            .order('fecha_evento', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (err) { handleServerError(res, err); }
});

// ================== ESTADÍSTICAS ==================
app.get('/api/rancho/:ranchoId/estadisticas', async (req, res) => {
    try {
        const { ranchoId } = req.params;
        if (!ranchoId) return res.status(400).json({ message: 'ranchoId requerido.' });

        // 1. Obtenemos las vacas del rancho (esto ya funcionaba)
        const { data: vacas, error: vacasError } = await supabase
            .from('vacas')
            .select('id, lote, raza')
            .eq('rancho_id', ranchoId);
        if (vacasError) throw vacasError;

        if (!vacas || vacas.length === 0) {
            return res.json({});
        }

        // --- INICIO DEL "PLAN B": CÁLCULO MANUAL SIN RPC ---
        const cowIds = vacas.map(v => v.id);

        // 2. Traemos TODAS las palpaciones de esas vacas, ordenadas por la más nueva primero.
        const { data: todasLasPalpaciones, error: palpacionesError } = await supabase
            .from('actividades')
            .select('id_vaca, descripcion, fecha_actividad')
            .in('id_vaca', cowIds)
            .eq('tipo_actividad', 'Palpación')
            .order('fecha_actividad', { ascending: false });

        if (palpacionesError) throw palpacionesError;

        // 3. Manualmente, encontramos la última palpación para cada vaca.
        const estadoMap = new Map();
        (todasLasPalpaciones || []).forEach(act => {
            // Como vienen ordenadas, la primera que encontremos para una vaca es la más reciente.
            if (!estadoMap.has(act.id_vaca)) {
                let desc = act.descripcion || {};
                if (typeof desc === 'string') {
                    try { desc = JSON.parse(desc); } catch (e) { desc = {}; }
                }
                estadoMap.set(act.id_vaca, desc);
            }
        });
        // --- FIN DEL "PLAN B" ---

        // 4. "Cocinamos" las estadísticas con el mapa que acabamos de crear (esto ya estaba bien).
        const stats = vacas.reduce((acc, vaca) => {
            const lote = vaca.lote || 'Sin Lote';
            if (!acc[lote]) {
                acc[lote] = { totalVacas: 0, estados: { Gestante: 0, Estatica: 0, Ciclando: 0 }, razas: {} };
            }
            acc[lote].totalVacas++;

            const ultimoEstado = estadoMap.get(vaca.id);
            if (ultimoEstado) {
                if (ultimoEstado.gestante === 'Sí') acc[lote].estados.Gestante++;
                if (ultimoEstado.estatica === 'Sí') acc[lote].estados.Estatica++;
                if (ultimoEstado.ciclando === 'Sí') acc[lote].estados.Ciclando++;
            }

            const raza = vaca.raza || 'Desconocida';
            acc[lote].razas[raza] = (acc[lote].razas[raza] || 0) + 1;
            
            return acc;
        }, {});

        res.json(stats);

    } catch (err) { handleServerError(res, err); }
});
// ================== DATOS PARA EL DASHBOARD DEL PROPIETARIO ==================
app.get('/api/rancho/:ranchoId/actividades-recientes', async (req, res) => {
    try {
        const { ranchoId } = req.params;
        const { data, error } = await supabase
            .from('actividades')
            .select('*, usuarios (nombre)')
            .eq('rancho_id', ranchoId)
            .order('created_at', { ascending: false })
            .limit(5); // Traemos las últimas 5 para el scroll
        if (error) throw error;
        res.json(data || []);
    } catch (err) { handleServerError(res, err); }
});

app.get('/api/rancho/:ranchoId/eventos-proximos', async (req, res) => {
    try {
        const { ranchoId } = req.params;
        const { data, error } = await supabase
            .from('eventos')
            .select('*')
            .eq('rancho_id', ranchoId)
            .eq('completado', false)
            .gte('fecha_evento', new Date().toISOString())
            .order('fecha_evento', { ascending: true })
            .limit(3);
        if (error) throw error;
        res.json(data || []);
    } catch (err) { handleServerError(res, err); }
});

// Endpoint para obtener los próximos eventos de un rancho
app.get('/api/rancho/:ranchoId/eventos-proximos', async (req, res) => {
    try {
        const { ranchoId } = req.params;
        const { data, error } = await supabase
            .from('eventos')
            .select('*')
            .eq('rancho_id', ranchoId) // Filtra por el ID del rancho
            .eq('completado', false) // Solo eventos no completados
            .gte('fecha_evento', new Date().toISOString()) // Solo eventos futuros
            .order('fecha_evento', { ascending: true }) // Los más cercanos primero
            .limit(3); // Solo trae los próximos 3

        if (error) throw error;
        res.json(data || []);
    } catch (err) { handleServerError(res, err); }
});

// ✅ FEATURE 5: Endpoint para datos del dashboard del MVZ
app.get('/api/dashboard/mvz/:mvzId', async (req, res) => {
    try {
        const { mvzId } = req.params;
        
        // Conteo de ranchos asociados
        const { count: ranchosCount, error: ranchosError } = await supabase
            .from('rancho_mvz_permisos')
            .select('*', { count: 'exact', head: true })
            .eq('mvz_id', mvzId);

        // Conteo de actividades hoy
        const today = new Date().toISOString().slice(0, 10);
        const { count: actividadesHoy, error: actError } = await supabase
            .from('actividades')
            .select('*', { count: 'exact', head: true })
            .eq('id_usuario', mvzId)
            .eq('fecha_actividad', today);

        if (ranchosError || actError) throw (ranchosError || actError);

        res.json({
            ranchosAsociados: ranchosCount || 0,
            actividadesHoy: actividadesHoy || 0,
            // Aquí podrías agregar más lógicas complejas, como animales críticos
            alertas: 0 // Placeholder
        });

    } catch (err) { handleServerError(res, err); }
});
// ================== EVENTOS Y DASHBOARD MVZ ==================
// Endpoint para obtener los eventos de un MVZ
app.get('/api/eventos/mvz/:mvzId', async (req, res) => {
    try {
        const { mvzId } = req.params;
        const { data, error } = await supabase
            .from('eventos')
            .select('*, ranchos (nombre)') // Incluye el nombre del rancho si está asociado
            .eq('mvz_id', mvzId)
            .gte('fecha_evento', new Date().toISOString()) // Solo eventos futuros
            .order('fecha_evento', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (err) { handleServerError(res, err); }
});

// Endpoint para crear un nuevo evento (VERSIÓN ÚNICA Y CORREGIDA)
app.post('/api/eventos', async (req, res) => {
    try {
        const { mvz_id, rancho_id, fecha_evento, titulo, descripcion, nombre_rancho_texto } = req.body;
        if (!mvz_id || !fecha_evento || !titulo) {
            return res.status(400).json({ message: 'Faltan datos obligatorios.' });
        }

        // CORRECCIÓN: Si rancho_id es un string vacío, lo convertimos a null.
        const finalRanchoId = (rancho_id === '' || rancho_id === null) ? null : rancho_id;

        const { data, error } = await supabase.from('eventos').insert({
            mvz_id, rancho_id: finalRanchoId, fecha_evento, titulo, descripcion, nombre_rancho_texto
        }).select().single();

        if (error) throw error;
        res.status(201).json({ success: true, message: 'Evento creado', evento: data });
    } catch (err) { handleServerError(res, err); }
});

// Endpoint para los datos reales del Dashboard del MVZ
app.get('/api/dashboard/mvz/:mvzId', async (req, res) => {
    try {
        const { mvzId } = req.params;
        const today = new Date().toISOString().slice(0, 10);

        // Conteo de actividades para hoy
        const { count: actividadesHoy, error: actError } = await supabase
            .from('actividades')
            .select('*', { count: 'exact', head: true })
            .eq('id_usuario', mvzId)
            .eq('fecha_actividad', today);

        if (actError) throw actError;

        // Aquí puedes agregar más lógica para las alertas en el futuro
        res.json({
            actividadesHoy: actividadesHoy || 0,
            alertas: 0 // Dato de ejemplo por ahora
        });
    } catch (err) { handleServerError(res, err); }
});
// Endpoint para actualizar un evento (completar o borrar)
// ================== RUTAS PARA GESTIONAR EVENTOS ==================

// Endpoint para ACTUALIZAR (Editar) un evento existente
app.put('/api/eventos/:eventoId', async (req, res) => {
    try {
        const { eventoId } = req.params;
        const { titulo, fecha_evento, rancho_id, nombre_rancho_texto, descripcion } = req.body;

        // Validamos que los datos necesarios estén presentes
        if (!titulo || !fecha_evento) {
            return res.status(400).json({ message: 'El título y la fecha son obligatorios.' });
        }

        const finalRanchoId = (rancho_id === '' || rancho_id === null) ? null : rancho_id;

        const { data, error } = await supabase
            .from('eventos')
            .update({
                titulo,
                fecha_evento,
                rancho_id: finalRanchoId,
                nombre_rancho_texto,
                descripcion
            })
            .eq('id', eventoId)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, message: 'Evento actualizado', evento: data });

    } catch (err) { handleServerError(res, err); }
});

// Endpoint para ELIMINAR un evento
app.delete('/api/eventos/:eventoId', async (req, res) => {
    try {
        const { eventoId } = req.params;
        const { error } = await supabase
            .from('eventos')
            .delete()
            .eq('id', eventoId);

        if (error) throw error;
        res.json({ success: true, message: 'Evento eliminado.' });

    } catch (err) { handleServerError(res, err); }
});
// ================== RUTAS PARA AJUSTES DE USUARIO ==================

// Endpoint para ACTUALIZAR el perfil de un usuario (propietario o mvz)
app.put('/api/usuarios/:usuarioId', async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const { nombre, info_profesional } = req.body; // info_profesional será para el MVZ

        const updatePayload = {};
        if (nombre) updatePayload.nombre = nombre;
        if (info_profesional) updatePayload.info_profesional = info_profesional;

        const { data, error } = await supabase
            .from('usuarios')
            .update(updatePayload)
            .eq('id', usuarioId)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, message: 'Perfil actualizado', usuario: data });
    } catch (err) { handleServerError(res, err); }
});

// Endpoint para ACTUALIZAR el nombre de un rancho
app.put('/api/ranchos/:ranchoId', async (req, res) => {
    try {
        const { ranchoId } = req.params;
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ message: 'El nombre del rancho es requerido.' });

        const { data, error } = await supabase
            .from('ranchos')
            .update({ nombre })
            .eq('id', ranchoId)
            .select()
            .single();
            
        if (error) throw error;
        res.json({ success: true, message: 'Rancho actualizado', rancho: data });
    } catch (err) { handleServerError(res, err); }
});
// Endpoint para SUBIR y actualizar el logo del rancho
app.post('/api/ranchos/:ranchoId/upload-logo', upload.single('logo'), async (req, res) => {
    try {
        const { ranchoId } = req.params;
        if (!req.file) return res.status(400).json({ message: 'No se envió ningún archivo.' });

        const file = req.file;
        const filePath = `logos/${ranchoId}/${Date.now()}_${file.originalname}`;

        // Subir a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('ranchos_logos') // Asegúrate de que este bucket exista en Supabase Storage
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Obtener la URL pública del archivo
        const { data: publicUrlData } = supabase.storage
            .from('ranchos_logos')
            .getPublicUrl(filePath);

        const publicUrl = publicUrlData.publicUrl;

        // Actualizar el campo 'logo_url' en la tabla de ranchos
        const { data: ranchoData, error: ranchoError } = await supabase
            .from('ranchos')
            .update({ logo_url: publicUrl })
            .eq('id', ranchoId)
            .select()
            .single();

        if (ranchoError) throw ranchoError;

        res.json({ success: true, message: 'Logo actualizado', logo_url: publicUrl });

    } catch (err) { handleServerError(res, err); }
});
// ================== INICIO DEL SERVIDOR ==================
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});