document.addEventListener('DOMContentLoaded', () => {
    // Pega esto en main.js, cerca de tus variables globales
// =================================================================
// CLIENTE OFICIAL DE SUPABASE
// =================================================================
const SUPABASE_URL = 'https://jzjwvvbtlitibngnhjjh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6and2dmJ0bGl0aWJuZ25oampoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0OTk2MDEsImV4cCI6MjA3NTA3NTYwMX0.keTPwPtIxoSNrzJ2La6ARvwgBmdUPiMuWXpXD0w9cwU';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Cliente de Supabase inicializado');
// =================================================================
    // =================================================================
    // ESTADO GLOBAL Y CONFIGURACIÓN
    // =================================================================
    let currentUser = null;
    let currentRancho = null;
    let listaCompletaDeVacas = [];
    let filtrosActivos = { sexo: '', lote: '', raza: '' };
    let loteActividadActual = [];
    let vacasIndex = new Map();
    let selectedMvzAvatarFile = null;
    let datosEstadisticasCompletos = null;
    let miGrafico = null;
    const API_URL = ''; // opcional si quieres prefijar la API
    const appContent = document.getElementById('app-content');
    const navContainer = document.getElementById('nav-container');
  
    // =================================================================
    // NAVEGACIÓN Y RENDERIZADO DE VISTAS
    // =================================================================
    function navigateTo(viewId) {
        if (!appContent) return;
        
        document.body.className = 'bg-brand-bg';
        appContent.innerHTML = '';
        const template = document.getElementById(`template-${viewId}`);
        if (!template) {
            appContent.innerHTML = `<p class="text-center p-8 text-red-500">Error: Plantilla no encontrada: ${viewId}</p>`;
            return;
        }
        appContent.appendChild(template.content.cloneNode(true));
        
        // Lógica post-renderizado (ESTE ES EL BLOQUE CORREGIDO)
        if (viewId.startsWith('login') || viewId.startsWith('registro')) {
            document.body.className = '';
            if (viewId === 'login') {
                document.getElementById('form-login').addEventListener('submit', handleLogin);
                document.getElementById('link-a-registro').addEventListener('click', (ev) => { ev.preventDefault(); navigateTo('registro'); });
            } else {
                document.getElementById('form-registro').addEventListener('submit', handleRegister);
                document.getElementById('link-a-login').addEventListener('click', (ev) => { ev.preventDefault(); navigateTo('login'); });
            
                const rolSelector = document.getElementById('registro-rol');
    const ranchoField = document.getElementById('campo-rancho');
    if (rolSelector && ranchoField) {
        // Función para mostrar u ocultar el campo
        const toggleRanchoField = () => {
            if (rolSelector.value === 'propietario') {
                ranchoField.style.display = 'block';
            } else {
                ranchoField.style.display = 'none';
            }
        };
            toggleRanchoField();

        // Añade el "escuchador" para que cambie en tiempo real
        rolSelector.addEventListener('change', toggleRanchoField);
    }
            
            }
            
        }// ... (otros else if para 'inicio-propietario', 'mis-vacas', 'mi-mvz', etc.) ...

            // ==========================================================
            // AÑADE ESTE BLOQUE para conectar la vista de importación
            // ==========================================================
            else if (viewId === 'importar-ganado') {
                // Conectar botón "Seleccionar Archivo Excel"
                const btnSeleccionar = document.getElementById('btn-seleccionar-excel');
                const inputArchivo = document.getElementById('input-archivo-excel');
                const nombreArchivoEl = document.getElementById('nombre-archivo-seleccionado');
                const btnImportar = document.getElementById('btn-importar-ganado');

                if (btnSeleccionar && inputArchivo && nombreArchivoEl && btnImportar) {
                    // Al hacer clic en el botón visible, activa el input oculto
                    btnSeleccionar.onclick = () => inputArchivo.click();

                    // Cuando se selecciona un archivo en el input oculto...
                    inputArchivo.onchange = () => {
                        if (inputArchivo.files && inputArchivo.files.length > 0) {
                            // Muestra el nombre del archivo
                            nombreArchivoEl.textContent = inputArchivo.files[0].name;
                            // Habilita el botón de importar
                            btnImportar.disabled = false;
                            btnImportar.classList.remove('opacity-50', 'cursor-not-allowed');
                        } else {
                            // Si cancela, limpia el nombre y deshabilita el botón
                            nombreArchivoEl.textContent = '';
                            btnImportar.disabled = true;
                            btnImportar.classList.add('opacity-50', 'cursor-not-allowed');
                        }
                    };
                }

                // Conectar botón "Importar Ganado"
                if (btnImportar) {
                    btnImportar.onclick = handleUploadExcel; // Llama a la función que acabamos de crear
                }

                // Limpiar mensaje previo al cargar la vista
                 const mensajeEl = document.getElementById('importar-mensaje');
                 if(mensajeEl) mensajeEl.textContent = '';
                 if(mensajeEl) mensajeEl.className = 'mt-4 text-sm text-center h-auto min-h-[1.25rem]'; // Resetear estilo
            }
            // ==========================================================

            else if (viewId === 'estadisticas') {
                 renderizarVistaEstadisticas();
            }
            // ... (resto de la función navigateTo) ...
        else if (viewId === 'inicio-propietario') {
    document.getElementById('dash-nombre-propietario').textContent = currentUser?.nombre?.split(' ')[0] || '';
    document.getElementById('dash-fecha-actual').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('btn-logout-propietario').onclick = logout;
    // Conecta el nuevo botón de perfil a la vista de ajustes
    document.getElementById('btn-perfil-propietario').onclick = () => navigateTo('ajustes');
    cargarDatosDashboardPropietario();
} else if (viewId === 'mis-vacas') {
            renderizarVistaMisVacas();
        } else if (viewId === 'mi-mvz') {
            renderizarVistaMiMvz();
        } else if (viewId === 'estadisticas') {
            renderizarVistaEstadisticas();
          } else if (viewId === 'ajustes') { // <-- ESTE ES EL QUE CAMBIAMOS
    renderizarVistaAjustesPropietario();  
        } else if (viewId === 'calendario-propietario') { // <-- AÑADE ESTE BLOQUE
    renderizarVistaCalendarioPropietario();   
        } else if (viewId === 'inicio-mvz') {
    document.getElementById('btn-logout-mvz').onclick = logout;
    // Conecta el nuevo botón de perfil a la vista de ajustes del MVZ
    document.getElementById('btn-perfil-mvz').onclick = () => navigateTo('ajustes-mvz');
    cargarDashboardMVZ();
        }else if (viewId === 'actividades-mvz') {
            initActividadesMvzListeners();
        } else if (viewId === 'calendario-mvz') { // <-- Aquí se añade la nueva vista
            renderizarVistaCalendario();
            } else if (viewId === 'mvz-ganado') {
            renderizarVistaMvzGanado();
            } else if (viewId === 'ajustes-mvz') { // <-- ¡ESTA ES LA "PUERTA" QUE FALTABA!
    renderizarVistaAjustesMvz();
        }else if (viewId === 'mis-ranchos-mvz') { 
                renderizarVistaMisRanchosMVZ(); // Llama a la nueva función
            }
    }

    function setupNavigation() {
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const nav = e.currentTarget.closest('nav');
                nav.querySelector('.nav-button.active')?.classList.remove('active');
                e.currentTarget.classList.add('active');
                navigateTo(button.dataset.vista);
            });
        });
        window.navigateTo = navigateTo;
    }

    const iniciarSesion = () => {
        if (!currentUser) return;
        navContainer.classList.remove('hidden');
        const isPropietario = currentUser.rol === 'propietario';
        document.getElementById('nav-propietario').classList.toggle('hidden', !isPropietario);
        document.getElementById('nav-mvz').classList.toggle('hidden', isPropietario);
        
        document.querySelector('.nav-button.active')?.classList.remove('active');
        const firstButtonSelector = isPropietario ? '#nav-propietario .nav-button[data-vista="inicio-propietario"]' : '#nav-mvz .nav-button[data-vista="inicio-mvz"]';
        document.querySelector(firstButtonSelector)?.classList.add('active');
        
        navigateTo(isPropietario ? 'inicio-propietario' : 'inicio-mvz');
    };

    // =================================================================
    // LÓGICA DEL PROPIETARIO
    // =================================================================
 // Reemplaza tu función existente con esta
async function cargarDatosDashboardPropietario() {
    if (!currentUser || currentUser.rol !== 'propietario') return;

    // --- INICIO DEL CAMBIO ---
    // 1. Verifica si los ranchos ya están cargados
    let ranchoPrincipal = currentUser.ranchos?.[0];

    // 2. Si no están cargados, los buscamos AHORA
    if (!ranchoPrincipal) {
        console.log('Ranchos no encontrados en currentUser, buscando en Supabase...');
        try {
            const { data: ranchosData, error: ranchoError } = await sb
                .from('ranchos')
                .select('*')
                .eq('propietario_id', currentUser.id); // Busca los ranchos del usuario actual

            if (ranchoError) throw ranchoError;

            // Guardamos los ranchos encontrados en currentUser y en sessionStorage
            currentUser.ranchos = ranchosData || [];
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            ranchoPrincipal = currentUser.ranchos?.[0]; // Actualizamos la variable
            console.log('Ranchos cargados y guardados:', currentUser.ranchos);

        } catch (error) {
            console.error("Error cargando ranchos para el dashboard:", error);
            // Mostramos un error si no se pueden cargar los ranchos
            const ranchoNombreEl = document.getElementById('dash-rancho-nombre');
            if (ranchoNombreEl) ranchoNombreEl.textContent = 'Error al cargar rancho';
            const lotesPlaceholder = document.getElementById('lotes-placeholder');
             if (lotesPlaceholder) lotesPlaceholder.textContent = 'No se pudo cargar la información del rancho.';
            // Detenemos la función aquí si no hay rancho
            return;
        }
    }
    // --- FIN DEL CAMBIO ---

    const ranchoId = ranchoPrincipal?.id;

    // --- El resto de tu función sigue igual ---
    // PARTE 1: Actualiza el encabezado
    const nombreEl = document.getElementById('dash-nombre-propietario');
    if (nombreEl) nombreEl.textContent = currentUser.nombre.split(' ')[0];

    const ranchoNombreEl = document.getElementById('dash-rancho-nombre');
    if (ranchoNombreEl) ranchoNombreEl.textContent = ranchoPrincipal?.nombre || 'Mi Rancho'; // Ahora debería tener nombre

    const avatarEl = document.getElementById('dash-propietario-avatar');
const logoUrl = ranchoPrincipal?.logo_url;
// Usamos el truco del timestamp para evitar el caché del navegador
if (avatarEl && logoUrl) {
    avatarEl.src = logoUrl.includes('?') 
        ? `${logoUrl}&t=${Date.now()}` 
        : `${logoUrl}?t=${Date.now()}`;
} else if (avatarEl) {
    avatarEl.src = 'assets/logo.png';
}
    const fechaEl = document.getElementById('dash-fecha-actual');
    if (fechaEl) fechaEl.textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

    // Si después de intentar cargar, sigue sin haber ranchoId...
    if (!ranchoId) {
        console.log("No se encontró ID de rancho principal.");
        const lotesPlaceholder = document.getElementById('lotes-placeholder');
        if (lotesPlaceholder) lotesPlaceholder.textContent = 'No se encontró un rancho asociado.';
        // Limpiamos los resúmenes si no hay rancho
         document.getElementById('resumen-total-vacas').textContent = '--';
         document.getElementById('resumen-vacas-gestantes').textContent = '--';
         document.getElementById('resumen-alertas').textContent = '--';
         document.getElementById('ultimas-noticias').innerHTML = '<p class="text-sm text-gray-500">No hay rancho asociado.</p>';
         document.getElementById('proximos-eventos').innerHTML = '<p class="text-sm text-gray-500">No hay rancho asociado.</p>';
        return;
    }
    console.log(`Cargando datos del dashboard para rancho ID: ${ranchoId}`);


  // --- PARTE 2: Carga de Estadísticas y Lotes (MIGRADO A SUPABASE DIRECTO + PLAN B) ---
        const lotesContainer = document.getElementById('lotes-container-scroll'); 
        const lotesPlaceholder = document.getElementById('lotes-placeholder');
        if (lotesPlaceholder) lotesPlaceholder.textContent = 'Cargando lotes...';

        try {
            // 2a. Obtener todas las vacas del rancho
            const { data: vacas, error: vacasError } = await sb
                .from('vacas')
                .select('id, lote, raza')
                .eq('rancho_id', ranchoId); // RLS ya asegura que sean del propietario
            if (vacasError) throw vacasError;

            let stats = {}; // Objeto para guardar estadísticas
            let totalVacas = 0;
            let totalGestantes = 0;

            if (!vacas || vacas.length === 0) {
                // Si no hay vacas, inicializamos stats vacío y contadores a 0
                stats = {};
                totalVacas = 0;
                totalGestantes = 0;
                if(lotesPlaceholder) lotesPlaceholder.textContent = 'No hay animales registrados en este rancho.';

            } else {
                 totalVacas = vacas.length; // Contador total
                 const cowIds = vacas.map(v => v.id);

                 // 2b. Obtener la última palpación de esas vacas (Plan B manual)
                 const { data: todasLasActividades, error: actError } = await sb
                     .from('actividades')
                     .select('id_vaca, descripcion, tipo_actividad, created_at')
                     .in('id_vaca', cowIds)
                     .eq('tipo_actividad', 'Palpación')
                    .order('fecha_actividad', { ascending: false }) // 1. Ordena por fecha (más nueva primero)
                    .order('created_at', { ascending: false });    // 2. Si fechas iguales, ordena por hora de creación (más nueva primero)
                 if (actError) throw actError;

                 // 2c. Procesamiento manual de estadísticas (lógica que ya teníamos)
                 const estadoMap = new Map();
                 (todasLasActividades || []).forEach(act => {
                     if (!estadoMap.has(act.id_vaca)) {
                         let desc = act.descripcion || {};
                         // Aseguramos que desc sea un objeto
                         if (typeof desc === 'string') { try { desc = JSON.parse(desc); } catch (e) { desc = {}; } }
                         estadoMap.set(act.id_vaca, desc);
                     }
                 });

                 stats = vacas.reduce((acc, vaca) => {
                     const lote = vaca.lote || 'Sin Lote';
                     acc[lote] = acc[lote] || { totalVacas: 0, estados: { Gestante: 0, Estatica: 0, Ciclando: 0 }, razas: {} };
                     acc[lote].totalVacas++;

                     const ultimoEstado = estadoMap.get(vaca.id);
                     if (ultimoEstado && ultimoEstado.gestante === 'Sí') { // Verifica si es 'Sí'
                         acc[lote].estados.Gestante++;
                         totalGestantes++; // Incrementa el contador global
                     }
                     // Opcional: Contar otros estados si los necesitas en el resumen
                     // if (ultimoEstado && ultimoEstado.estatica === 'Sí') acc[lote].estados.Estatica++;
                     // if (ultimoEstado && ultimoEstado.ciclando === 'Sí') acc[lote].estados.Ciclando++;
                     
                     const raza = vaca.raza || 'Desconocida';
                     acc[lote].razas[raza] = (acc[lote].razas[raza] || 0) + 1;
                     return acc;
                 }, {});
            } // Fin del else (si hay vacas)

            // 2d. Actualizar los resúmenes del dashboard
            document.getElementById('resumen-total-vacas').textContent = totalVacas;
            document.getElementById('resumen-vacas-gestantes').textContent = totalGestantes;
            document.getElementById('resumen-alertas').textContent = 0; // Placeholder

            // 2e. Renderizar las tarjetas de lotes
            if (lotesContainer) {
                 if (Object.keys(stats).length === 0 && totalVacas > 0) { // Si hay vacas pero no lotes/stats
                     if(lotesPlaceholder) lotesPlaceholder.textContent = 'No hay lotes con datos o actividades recientes.';
                     lotesContainer.innerHTML = ''; 
                 } else if (Object.keys(stats).length === 0 && totalVacas === 0) { // Si no hay vacas
                      if(lotesPlaceholder) lotesPlaceholder.textContent = 'No hay animales registrados.';
                      lotesContainer.innerHTML = ''; 
                 } else { // Si hay stats para mostrar
                     if(lotesPlaceholder) lotesPlaceholder.style.display = 'none'; 
                     lotesContainer.innerHTML = Object.entries(stats).map(([numeroLote, datosLote]) => {
                         const vacasEnLote = datosLote.totalVacas || 0;
                         const gestantesEnLote = datosLote.estados?.Gestante || 0;
                         const porcentaje = vacasEnLote > 0 ? Math.round((gestantesEnLote / vacasEnLote) * 100) : 0;
                         const nombreLote = numeroLote === 'Sin Lote' ? 'Animales sin Lote' : `Lote ${numeroLote}`;
                         return `<div class="flex-shrink-0 w-72 bg-white p-4 rounded-xl shadow-md flex items-center justify-between"><div class="flex items-center"><div class="progress-ring mr-4" style="--value: ${porcentaje}; --color: #22c55e;"><span class="progress-ring-percent">${porcentaje}%</span></div><div><p class="font-semibold">${nombreLote}</p><p class="text-sm text-gray-500">Gestantes</p></div></div><i class="fa-solid fa-chevron-right text-gray-400"></i></div>`;
                     }).join('');
                 }
            }

        } catch (error) {
            console.error("Error procesando estadísticas/lotes del propietario:", error);
            if (lotesPlaceholder) lotesPlaceholder.textContent = 'Error al cargar lotes.';
            if (lotesContainer) lotesContainer.innerHTML = '';
            // Limpiar resúmenes en caso de error
            document.getElementById('resumen-total-vacas').textContent = '--';
            document.getElementById('resumen-vacas-gestantes').textContent = '--';
            document.getElementById('resumen-alertas').textContent = '--';
        }
        // --- FIN PARTE 2 MIGRADA ---

    // --- PARTE 3 Y 4: Carga de Noticias y Eventos (¡TAMBIÉN CON SUPABASE DIRECTO!) ---
    const noticiasContainer = document.getElementById('ultimas-noticias');
    const eventosContainer = document.getElementById('proximos-eventos');

    if (noticiasContainer) {
        noticiasContainer.innerHTML = '<p class="text-sm text-gray-500">Cargando...</p>';
        try {
            // Nueva llamada directa
            const { data: noticias, error: noticiasError } = await sb
                .from('actividades')
                .select('created_at, tipo_actividad, usuarios (nombre)') // Pedimos el nombre del usuario relacionado
                .eq('rancho_id', ranchoId)
                .order('created_at', { ascending: false })
                .limit(5);

            if (noticiasError) throw noticiasError;

            if (noticias.length === 0) {
                noticiasContainer.innerHTML = '<p class="text-sm text-gray-500">No hay actividades recientes en el rancho.</p>';
            } else {
                noticiasContainer.innerHTML = noticias.map(act => {
                    const fecha = new Date(act.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
                    // Accedemos al nombre a través del objeto 'usuarios'
                    const mvzNombre = act.usuarios?.nombre || 'Un veterinario';
                    return `<p class="text-sm text-gray-600 pb-2 border-b border-gray-100 mb-2">${mvzNombre} registró ${act.tipo_actividad} el ${fecha}.</p>`;
                }).join('');
            }
        } catch (error) {
            console.error("Error cargando noticias:", error);
            noticiasContainer.innerHTML = '<p class="text-red-500">Error al cargar noticias.</p>';
        }
    }

    if (eventosContainer) {
        eventosContainer.innerHTML = '<p class="text-sm text-gray-500">Cargando...</p>';
        try {
            // Nueva llamada directa
            const { data: eventos, error: eventosError } = await sb
                .from('eventos')
                .select('*')
                .eq('rancho_id', ranchoId)
                .eq('completado', false)
                .gte('fecha_evento', new Date().toISOString()) // Solo futuros
                .order('fecha_evento', { ascending: true })
                .limit(3);

            if (eventosError) throw eventosError;

            if (eventos.length === 0) {
                eventosContainer.innerHTML = '<p class="text-sm text-gray-500">No hay eventos programados para este rancho.</p>';
            } else {
                eventosContainer.innerHTML = eventos.map(e => {
                    const fecha = new Date(e.fecha_evento);
                    const manana = new Date(); manana.setDate(new Date().getDate() + 1);
                    let textoFecha = fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
                    if (fecha.toDateString() === new Date().toDateString()) textoFecha = 'Hoy';
                    if (fecha.toDateString() === manana.toDateString()) textoFecha = 'Mañana';
                    return `<p class="text-sm text-gray-600 mb-2"><i class="fa-solid fa-calendar-alt text-brand-green mr-2"></i><strong>${textoFecha}:</strong> ${e.titulo}</p>`;
                }).join('');
            }
        } catch (error) {
            console.error("Error cargando eventos:", error);
            eventosContainer.innerHTML = '<p class="text-red-500">Error al cargar eventos.</p>';
        }
    }
} // Fin de la función cargarDatosDashboardPropietario

    // =================================================================
    // LÓGICA DEL MVZ
    // =================================================================
// =================================================================
// REEMPLAZA ESTA FUNCIÓN COMPLETA (Cargar Dashboard MVZ con Estadísticas)
// =================================================================
async function cargarDashboardMVZ() {
    if (!currentUser || currentUser.rol !== 'mvz') return;

    // --- 1. Actualiza Cabecera (Esto no cambia) ---
    const nombreEl = document.getElementById('dash-nombre-mvz');
    if (nombreEl) nombreEl.textContent = currentUser.nombre.split(' ')[0];
    const fechaEl = document.getElementById('dash-fecha-actual-mvz');
    if (fechaEl) fechaEl.textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    const avatarEl = document.getElementById('dash-mvz-avatar');
    if (avatarEl) avatarEl.src = currentUser.avatar_url || 'assets/avatar_mvz_default.png';

    // --- 2. Referencias a los Elementos que Actualizaremos ---
    const sesionesHoyEl = document.getElementById('stat-sesiones-hoy'); // <-- El nuevo ID
    const animalesHoyEl = document.getElementById('stat-animales-hoy'); // <-- El nuevo ID
    const pendientesContainer = document.getElementById('lista-pendientes');
    const eventosContainer = document.getElementById('lista-eventos');

    // Poner placeholders de carga ("...")
    if (sesionesHoyEl) sesionesHoyEl.textContent = '...';
    if (animalesHoyEl) animalesHoyEl.textContent = '...';
    if (pendientesContainer) pendientesContainer.innerHTML = '<div class="bg-white p-4 rounded-xl shadow-md"><p class="text-sm text-gray-500">Cargando pendientes...</p></div>';
    if (eventosContainer) eventosContainer.innerHTML = '<div class="bg-white p-4 rounded-xl shadow-md"><p class="text-sm text-gray-500">Cargando eventos...</p></div>';

    // --- 3. Calcular Fecha de Hoy (en formato YYYY-MM-DD UTC) ---
    const hoy = new Date();
    const hoyUTCString = hoy.toISOString().slice(0, 10);
    console.log("Buscando estadísticas para fecha:", hoyUTCString);

    try {
        // --- 4. CONSULTA A SUPABASE PARA ESTADÍSTICAS DEL DÍA ---
        // (Busca todas las filas de 'actividades' de hoy para este MVZ)
        const { data: actividadesHoy, error: actError } = await sb
            .from('actividades')
            .select('sesion_id, id') // Solo necesitamos estas columnas
            .eq('id_usuario', currentUser.id) // Del usuario actual
            .eq('fecha_actividad', hoyUTCString); // Donde la fecha sea hoy

        if (actError) { // Si falla la consulta
            console.error("Error al cargar estadísticas de hoy:", actError);
            if (sesionesHoyEl) sesionesHoyEl.textContent = 'Err'; // Muestra 'Err'
            if (animalesHoyEl) animalesHoyEl.textContent = 'Err';
        } else { // Si la consulta funciona
            // Calcula los números
            const numeroAnimalesHoy = actividadesHoy ? actividadesHoy.length : 0; // Total de filas = Total animales
            const sesionesUnicas = new Set((actividadesHoy || []).map(act => act.sesion_id)); // IDs de sesión únicos
            const numeroSesionesHoy = sesionesUnicas.size; // Cuenta cuántos IDs únicos hay

            // Muestra los números en las tarjetas
            if (sesionesHoyEl) sesionesHoyEl.textContent = numeroSesionesHoy;
            if (animalesHoyEl) animalesHoyEl.textContent = numeroAnimalesHoy;
            console.log("Estadísticas hoy:", { sesiones: numeroSesionesHoy, animales: numeroAnimalesHoy });
        }

        // --- 5. CONSULTA A SUPABASE PARA EVENTOS (Pendientes y Próximos) ---
        // (Esta parte es la misma lógica que ya tenías, solo integrada aquí)
        const { data: eventos, error: eventosError } = await sb
            .from('eventos')
            .select('*, ranchos (nombre)')
            .eq('mvz_id', currentUser.id)
            .eq('completado', false)
            .gte('fecha_evento', hoy.toISOString())
            .order('fecha_evento', { ascending: true });

        if (eventosError) throw eventosError; // Lanza error si falla la consulta de eventos

        // Filtrar eventos para hoy (Pendientes)
        const eventosHoy = eventos.filter(e => {
            const fechaEvento = new Date(e.fecha_evento);
            return fechaEvento.getUTCFullYear() === hoy.getUTCFullYear() &&
                   fechaEvento.getUTCMonth() === hoy.getUTCMonth() &&
                   fechaEvento.getUTCDate() === hoy.getUTCDate();
        });

        // Filtrar eventos Próximos (después de hoy)
        const eventosProximos = eventos.filter(e => !eventosHoy.includes(e));

        // Renderizar Pendientes HOY
        if (pendientesContainer) {
            if (eventosHoy.length > 0) {
                pendientesContainer.innerHTML = eventosHoy.map((e, i) => {
                    const rancho = e.nombre_rancho_texto || e.ranchos?.nombre || 'General';
                    // Añadimos window. para que los botones funcionen
                    return `<div class="bg-white p-3 rounded-lg shadow-sm mb-3"><p><strong>${i+1}.</strong> ${escapeHtml(e.titulo)} <em class="text-gray-500">(${escapeHtml(rancho)})</em></p><div class="flex justify-end space-x-2 mt-2"><button onclick="window.handleCancelarEvento(${e.id})" class="text-xs text-red-600 font-semibold px-2 py-1">Cancelar</button><button onclick="window.handleCompletarEvento(${e.id})" class="text-xs bg-green-600 text-white font-semibold px-3 py-1 rounded-full">Completar</button></div></div>`;
                }).join('');
            } else {
                pendientesContainer.innerHTML = '<div class="bg-white p-4 rounded-xl shadow-md"><p class="text-sm text-gray-500">No hay pendientes para hoy.</p></div>';
            }
        }

        // Renderizar Próximos Eventos (máximo 3)
        if (eventosContainer) {
            if (eventosProximos.length > 0) {
                eventosContainer.innerHTML = eventosProximos.slice(0, 3).map(e => {
                    const fecha = new Date(e.fecha_evento);
                    const manana = new Date();
                    manana.setUTCDate(hoy.getUTCDate() + 1);
                    let textoFecha = fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
                    if (fecha.getUTCFullYear() === manana.getUTCFullYear() &&
                        fecha.getUTCMonth() === manana.getUTCMonth() &&
                        fecha.getUTCDate() === manana.getUTCDate()) {
                           textoFecha = 'Mañana';
                    }
                    const rancho = e.nombre_rancho_texto || e.ranchos?.nombre || 'General';
                    return `<div class="bg-white p-4 rounded-xl shadow-md mb-3"><div class="flex justify-between items-center"><p><i class="fa-solid fa-calendar-alt text-brand-green mr-2"></i><strong>${textoFecha}:</strong> ${escapeHtml(e.titulo)} <em>(${escapeHtml(rancho)})</em></p><i class="fa-solid fa-chevron-right text-gray-400"></i></div></div>`;
                }).join('');
            } else {
                eventosContainer.innerHTML = '<div class="bg-white p-4 rounded-xl shadow-md"><p class="text-sm text-gray-500">No hay más eventos programados.</p></div>';
            }
        }

    } catch (error) { // Si falla CUALQUIERA de las consultas (estadísticas o eventos)
        console.error("Error al cargar datos del dashboard MVZ:", error);
        // Poner error en todas las secciones para que sea claro
        if (sesionesHoyEl) sesionesHoyEl.textContent = 'Err';
        if (animalesHoyEl) animalesHoyEl.textContent = 'Err';
        if (pendientesContainer) pendientesContainer.innerHTML = '<p class="text-red-500">Error al cargar datos.</p>';
        if (eventosContainer) eventosContainer.innerHTML = '<p class="text-red-500">Error al cargar datos.</p>';
    }
}
// =================================================================
// INICIO: BLOQUE DE FUNCIONES PARA "MVZ - ADMINISTRAR GANADO"
// (Copiar y pegar todo este bloque en main.js)
// =================================================================

// Variables globales para la lista y filtros del MVZ
let listaMvzGanadoCompleta = [];
let filtrosActivosMvz = { sexo: '', lote: '', raza: '' };

/**
 * (NUEVA) Función principal para renderizar la vista de ganado del MVZ
 */
async function renderizarVistaMvzGanado() {
    // 1. Obtener el ranchoId y propietarioId desde el estado global 'currentRancho'
    if (!currentRancho || !currentRancho.id) {
        console.error("MVZ: No hay rancho activo para administrar.");
        alert("Error: No se ha seleccionado un rancho. Vuelve a la pestaña 'Actividades'.");
        navigateTo('actividades-mvz');
        return;
    }
    const ranchoId = currentRancho.id;
    // Necesitaremos el propietarioId para guardar vacas (asumiendo que lo obtuvimos antes)
    // Buscamos al propietario en la tabla 'ranchos'
    const { data: ranchoData, error: ranchoError } = await sb
        .from('ranchos')
        .select('propietario_id, nombre')
        .eq('id', ranchoId)
        .single();

    if (ranchoError || !ranchoData) {
         console.error("MVZ: Error cargando datos del rancho:", ranchoError);
         alert("Error al cargar datos del rancho.");
         return;
    }
    // Guardamos el ID del propietario en el estado global del rancho para usarlo al guardar
    currentRancho.propietario_id = ranchoData.propietario_id;

    // Actualiza el título de la cabecera
    const tituloEl = document.getElementById('mvz-ganado-rancho-nombre');
    if(tituloEl) tituloEl.textContent = `Ganado de ${ranchoData.nombre}`;

    const container = document.getElementById('lista-vacas-container-mvz');
    container.innerHTML = '<p class="text-center text-gray-500 mt-8">Cargando ganado...</p>';
    
    // Conectar el FAB (+)
    const fab = document.getElementById('btn-abrir-modal-vaca-mvz');
    if (fab) {
        // Llama a la función de abrir modal específica del MVZ
        fab.onclick = () => abrirModalVacaMvz(); 
    }

    try {
        // 2. Cargar las vacas (usando la RLS del MVZ que le da acceso)
        const { data: vacasData, error } = await sb
            .from('vacas')
            .select('*') 
            .eq('rancho_id', ranchoId); // Solo vacas de este rancho

        if (error) throw error;
        
        listaMvzGanadoCompleta = vacasData || []; 

        const totalVacasEl = document.getElementById('total-vacas-header-mvz');
        if(totalVacasEl) totalVacasEl.textContent = listaMvzGanadoCompleta.length;

        // 3. Configurar filtros y renderizar lista
        setupFiltrosDeGanadoMvz();
        aplicarFiltrosDeGanadoMvz(); // Muestra la lista inicial

    } catch (error) {
        console.error("Error en renderizarVistaMvzGanado:", error);
        container.innerHTML = `<p class="text-center text-red-500 mt-8">Error al cargar el ganado: ${error.message}</p>`;
    }
}

/**
 * (NUEVA) Configura los listeners para los botones de filtro del MVZ
 */
function setupFiltrosDeGanadoMvz() {
    const btnSexo = document.getElementById('filtro-btn-sexo-mvz');
    const btnLote = document.getElementById('filtro-btn-lote-mvz');
    const btnRaza = document.getElementById('filtro-btn-raza-mvz');

    if (btnSexo) btnSexo.onclick = () => {
        const opciones = ['Hembra', 'Macho'];
        abrirModalDeFiltroMvz('sexo', opciones, 'Selecciona un Sexo');
    };
    if (btnLote) btnLote.onclick = () => {
        const lotesUnicos = [...new Set(listaMvzGanadoCompleta.map(v => v.lote).filter(Boolean))].sort((a,b) => a - b);
        abrirModalDeFiltroMvz('lote', lotesUnicos.map(l => `Lote ${l}`), 'Selecciona un Lote');
    };
    if (btnRaza) btnRaza.onclick = () => {
        const razasUnicas = [...new Set(listaMvzGanadoCompleta.map(v => v.raza).filter(Boolean))].sort();
        abrirModalDeFiltroMvz('raza', razasUnicas, 'Selecciona una Raza');
    };

    const busquedaInput = document.getElementById('filtro-busqueda-ganado-mvz');
    if (busquedaInput) busquedaInput.addEventListener('input', aplicarFiltrosDeGanadoMvz);
}

/**
 * (NUEVA) Abre el modal de filtro (específico MVZ)
 */
function abrirModalDeFiltroMvz(tipoFiltro, opciones, titulo) {
    // Esta función crea un modal temporal, es segura reutilizarla
    // ... (copia la lógica exacta de 'abrirModalDeFiltro' pero cambia la llamada al final)
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1002]';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    const contenido = document.createElement('div');
    contenido.className = 'bg-white rounded-xl shadow-lg p-4 w-11/12 max-w-xs';
    contenido.innerHTML = `<h3 class="font-bold text-lg mb-4">${titulo}</h3>`;

    const btnQuitar = document.createElement('div');
    btnQuitar.className = 'p-2 text-center text-red-600 font-semibold cursor-pointer border rounded-lg mb-2';
    btnQuitar.textContent = 'Quitar Filtro';
    btnQuitar.onclick = () => {
        filtrosActivosMvz[tipoFiltro] = '';
        aplicarFiltrosDeGanadoMvz(); // Llama a la versión MVZ
        modal.remove();
    };
    contenido.appendChild(btnQuitar);

    opciones.forEach(opcion => {
        const btnOpcion = document.createElement('div');
        btnOpcion.className = 'p-3 cursor-pointer hover:bg-gray-100 border-b';
        btnOpcion.textContent = opcion;
        btnOpcion.onclick = (e) => {
            e.stopPropagation();
            filtrosActivosMvz[tipoFiltro] = tipoFiltro === 'lote' ? opcion.replace('Lote ', '') : opcion;
            aplicarFiltrosDeGanadoMvz(); // Llama a la versión MVZ
            modal.remove();
        };
        contenido.appendChild(btnOpcion);
    });

    modal.appendChild(contenido);
    document.body.appendChild(modal);
}

/**
 * (NUEVA) Aplica los filtros y llama a renderizar la lista del MVZ
 */
function aplicarFiltrosDeGanadoMvz() {
    const busqueda = document.getElementById('filtro-busqueda-ganado-mvz').value.toLowerCase();
    const { sexo, lote, raza } = filtrosActivosMvz;

    let vacasFiltradas = [...listaMvzGanadoCompleta];

    if (busqueda) {
        vacasFiltradas = vacasFiltradas.filter(v => 
            v.numero_siniiga?.toLowerCase().includes(busqueda) ||
            v.numero_pierna?.toLowerCase().includes(busqueda)
        );
    }
    if (sexo) { vacasFiltradas = vacasFiltradas.filter(v => v.sexo === sexo); }
    if (lote) { vacasFiltradas = vacasFiltradas.filter(v => v.lote == lote); }
    if (raza) { vacasFiltradas = vacasFiltradas.filter(v => v.raza === raza); }

    const btnSexo = document.getElementById('filtro-btn-sexo-mvz');
    const btnLote = document.getElementById('filtro-btn-lote-mvz');
    const btnRaza = document.getElementById('filtro-btn-raza-mvz');

    if (btnSexo) btnSexo.classList.toggle('activo', !!sexo);
    if (btnLote) btnLote.classList.toggle('activo', !!lote);
    if (btnRaza) btnRaza.classList.toggle('activo', !!raza);

    const totalVacasEl = document.getElementById('total-vacas-header-mvz');
    if (totalVacasEl) {
        totalVacasEl.textContent = vacasFiltradas.length;
    }
    
    renderizarListaDeVacasMvz(vacasFiltradas); // Llama a la versión MVZ
}

/**
 * (NUEVA) Dibuja el HTML de la lista de vacas del MVZ
 */
function renderizarListaDeVacasMvz(vacas) {
    const container = document.getElementById('lista-vacas-container-mvz');
    if (!container) return;

    if (!vacas || vacas.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 mt-8 bg-white p-6 rounded-xl shadow-md">No se encontraron animales con esos filtros.</p>';
        return;
    }

    container.innerHTML = vacas.map(vaca => `
        <div class="bg-white rounded-xl shadow-md overflow-hidden">
            <img src="${vaca.foto_url || 'https://via.placeholder.com/300x200'}" alt="Foto de ${vaca.nombre}" class="w-full h-40 object-cover">
            <div class="p-4">
                <div class="flex justify-between items-start">
                    <h3 class="text-xl font-bold text-gray-900">${vaca.nombre}</h3>
                    <div class="flex items-center space-x-3">
                        <button onclick='handleEditarVacaMvz(${JSON.stringify(vaca)})' class="text-gray-500 hover:text-blue-600" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                        <button onclick='handleEliminarVacaMvz(${vaca.id})' class="text-gray-500 hover:text-red-600" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
                <div class="text-sm text-gray-600 mt-2 space-y-1">
                    <p><strong>Raza:</strong> ${vaca.raza || 'N/A'}</p>
                    <p><strong>Lote:</strong> ${vaca.lote || 'Sin asignar'}</p>
                    <p><strong>ID (Arete):</strong> #${vaca.numero_siniiga}</p>
                </div>
                <button onclick="window.verHistorialVaca(${vaca.id}, '${vaca.nombre}')" class="w-full bg-green-100 text-green-800 font-semibold p-2 rounded-lg mt-4 hover:bg-green-200 transition">
                    Ver Detalles
                </button>
            </div>
        </div>
    `).join('');
}


/**
 * (NUEVAS) Funciones de Modal y Guardado para el MVZ
 * Estas funciones REUTILIZAN el modal HTML ('modal-agregar-vaca')
 * pero usan la lógica de guardado/borrado del MVZ.
 */

function abrirModalVacaMvz() {
    // Llama a la función original del propietario, pero la reconfigura
    abrirModalVaca(); // Abre y resetea el modal
    
    // Sobreescribe los botones para que llamen a las funciones del MVZ
    document.getElementById('modal-vaca-titulo').textContent = `Registrar Animal en ${currentRancho.nombre}`;
    document.getElementById('btn-guardar-siguiente-vaca').onclick = () => handleGuardarVacaMvz(false);
    document.getElementById('btn-finalizar-registro-vaca').onclick = () => handleGuardarVacaMvz(true);
}

window.handleEditarVacaMvz = function(vaca) {
    // Llama a la función original del propietario para llenar el modal
    window.handleEditarVaca(vaca); // Reutiliza toda la lógica de llenado

    // Sobreescribe el botón de guardar para que llame a la función del MVZ
    document.getElementById('modal-vaca-titulo').textContent = `Editar Animal de ${currentRancho.nombre}`;
    document.getElementById('btn-finalizar-registro-vaca').onclick = () => handleGuardarVacaMvz(true);
}

// =================================================================
// REEMPLAZA ESTA FUNCIÓN COMPLETA (Eliminar Vaca MVZ)
// =================================================================
window.handleEliminarVacaMvz = async function(vacaId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este animal? Esta acción no se puede deshacer.')) return;

    try {
        // 1. Llama a Supabase para borrar
        // (La RLS que configuramos ('Propietarios y MVZ-Admin pueden eliminar') lo permitirá)
        const { error } = await sb
            .from('vacas')
            .delete()
            .eq('id', vacaId);

        if (error) throw error; // Lanza error si Supabase falla

        // 2. Actualiza la lista LOCAL del MVZ (listaMvzGanadoCompleta)
        listaMvzGanadoCompleta = listaMvzGanadoCompleta.filter(v => v.id !== vacaId);

        // 3. Vuelve a dibujar la lista del MVZ con los filtros actuales
        aplicarFiltrosDeGanadoMvz(); 

        showToast('Animal eliminado correctamente.'); // Da feedback

    } catch (error) {
        console.error("Error en handleEliminarVacaMvz:", error);
        alert(error.message || 'Error inesperado al eliminar la vaca.');
    }
}
// =================================================================

/**
 * (NUEVA) Función CLAVE: Guardar Vaca (llamada por el MVZ)
 */
async function handleGuardarVacaMvz(cerrarAlFinalizar) {
    const form = document.getElementById('form-agregar-vaca');
    const btnSiguiente = document.getElementById('btn-guardar-siguiente-vaca');
    const btnFinalizar = document.getElementById('btn-finalizar-registro-vaca');

    if (btnSiguiente) btnSiguiente.disabled = true;
    if (btnFinalizar) btnFinalizar.disabled = true;
    mostrarMensaje('vaca-mensaje', 'Procesando...', false); 

    const nombre = form.querySelector('#vaca-nombre').value;
    const siniiga = form.querySelector('#vaca-siniiga').value;

    if (!nombre || !siniiga) {
        mostrarMensaje('vaca-mensaje', 'Nombre y SINIIGA son obligatorios.');
        if (btnSiguiente) btnSiguiente.disabled = false;
        if (btnFinalizar) btnFinalizar.disabled = false;
        return;
    }

    const vacaId = form.querySelector('#vaca-id-input').value;
    const isUpdating = vacaId && vacaId !== '';

    // ¡¡¡ LA DIFERENCIA CLAVE ESTÁ AQUÍ !!!
    // Usamos los IDs del rancho activo del MVZ, no del currentUser
    const ranchoIdParaGuardar = currentRancho.id;
    const propietarioIdParaGuardar = currentRancho.propietario_id;

    if (!ranchoIdParaGuardar || !propietarioIdParaGuardar) {
         mostrarMensaje('vaca-mensaje', 'Error: No se pudo identificar el rancho o propietario. Intenta recargar.');
         return;
    }
    // ¡¡¡ FIN DE LA DIFERENCIA !!!

    let fotoUrl = null; 

    try {
        const fotoInput = form.querySelector('#vaca-foto');
        const file = fotoInput.files[0];
        if (file) {
            const filePath = `vacas/${propietarioIdParaGuardar}_${Date.now()}`; // Sube a la carpeta del propietario
            const { error: uploadError } = await sb.storage
                .from('fotos-ganado')
                .upload(filePath, file);
            if (uploadError) throw new Error(`Error al subir foto: ${uploadError.message}`);
            const { data: urlData } = sb.storage.from('fotos-ganado').getPublicUrl(filePath);
            fotoUrl = urlData.publicUrl;
        } else if (isUpdating) {
            const vacaActual = listaMvzGanadoCompleta.find(v => v.id == vacaId);
            fotoUrl = vacaActual?.foto_url; 
        }

        const datosVaca = {
            nombre: nombre,
            numero_siniiga: siniiga,
            numero_pierna: form.querySelector('#vaca-pierna').value || null,
            sexo: form.querySelector('#vaca-sexo').value || null,
            raza: form.querySelector('#vaca-raza').value || null,
            fecha_nacimiento: form.querySelector('#vaca-nacimiento').value || null,
            padre: form.querySelector('#vaca-padre').value || null,
            madre: form.querySelector('#vaca-madre').value || null,
            origen: form.querySelector('#vaca-origen').value || null,
            lote: form.querySelector('#vaca-lote').value || null,
            ...(fotoUrl && { foto_url: fotoUrl })
        };

        if (!isUpdating) {
            datosVaca.id_usuario = propietarioIdParaGuardar; // El dueño
            datosVaca.rancho_id = ranchoIdParaGuardar; // El rancho
            datosVaca.estado = 'Activa';
        }

        let dbResult;
        if (isUpdating) {
            dbResult = await sb.from('vacas').update(datosVaca).eq('id', vacaId).select().single();
        } else {
            dbResult = await sb.from('vacas').insert(datosVaca).select().single();
        }

        const { data: vacaGuardada, error: dbError } = dbResult;
        if (dbError) throw dbError; // La RLS de Supabase (Paso 5) debe permitir esto

        mostrarMensaje('vaca-mensaje', `¡Animal ${isUpdating ? 'actualizado' : 'guardado'}!`, false);

        // Actualiza la lista local del MVZ
        if (isUpdating) {
            const index = listaMvzGanadoCompleta.findIndex(v => v.id == vacaId);
            if (index > -1) listaMvzGanadoCompleta[index] = vacaGuardada;
        } else {
            listaMvzGanadoCompleta.unshift(vacaGuardada);
        }
        aplicarFiltrosDeGanadoMvz(); // Redibuja la lista del MVZ
        
        const totalVacasEl = document.getElementById('total-vacas-header-mvz');
        if(totalVacasEl) totalVacasEl.textContent = listaMvzGanadoCompleta.length || 0;


        if (isUpdating || cerrarAlFinalizar) {
             setTimeout(() => {
                document.getElementById('modal-agregar-vaca')?.classList.add('hidden');
             }, 1200);
        } else {
            // "Guardar y Siguiente"
             setTimeout(() => {
                form.reset();
                document.getElementById('file-name-display').innerHTML = '<span class="font-semibold">Click para subir</span> o arrastra';
                if(document.getElementById('vaca-edad')) document.getElementById('vaca-edad').value = '';
                document.getElementById('sexo-selector')?.querySelector('.bg-brand-green')?.classList.remove('bg-brand-green', 'text-white');
                form.querySelector('#vaca-nombre').focus();
                mostrarMensaje('vaca-mensaje', 'Listo para el siguiente animal.', false);
             }, 1200);
        }

    } catch (error) {
        console.error("Error en handleGuardarVacaMvz:", error);
        mostrarMensaje('vaca-mensaje', error.message || 'Error inesperado. Revisa los permisos.', true);
    } finally {
        setTimeout(() => {
            if (btnSiguiente) btnSiguiente.disabled = false;
            if (btnFinalizar) btnFinalizar.disabled = false;
        }, 1200);
    }
}

    // =================================================================
    // DEFINICIONES DE DATOS (PROCEDIMIENTOS, RAZAS)
    // =================================================================
    const PROCEDIMIENTOS = {
        palpacion: {
          titulo: "Palpación",
          campos: [
            { id: "estatica", label: "Estática", tipo: "select", opciones: ["Sí", "No"] },
            { id: "ciclando", label: "Ciclando", tipo: "select", opciones: ["Sí", "No"], revela: "ciclando_detalle" },
            { id: "ciclando_detalle", label: "Detalle Ciclo", tipo: "select", opciones: ["I1","I2","I3","D1","D2","D3"], oculto: true },
            { id: "gestante", label: "Gestante", tipo: "select", opciones: ["Sí", "No"], revela: "gestante_detalle" },
            { id: "gestante_detalle", label: "Edad Gestacional", tipo: "select", opciones: ["1 a 3 meses","3 a 6 meses","6 a 9 meses"], oculto: true },
            { id: "sucia", label: "Sucia", tipo: "checkbox" },
            { id: "observaciones", label: "Observaciones", tipo: "textarea" }
          ]
        },
        inseminacion: {
          titulo: "Inseminación",
          campos: [
            { id: "tecnica", label: "Técnica", tipo: "select", opciones: ["IATF","IA Convencional"], revela: "fecha_celo" },
            { id: "fecha_celo", label: "Fecha/Hora de Celo Detectado", tipo: "datetime-local", oculto: true },
            { id: "pajilla_toro", label: "Pajilla / Toro", tipo: "text", placeholder: "Nombre del toro" },
            { id: "dosis", label: "Dosis", tipo: "select", opciones: ["1 dosis","2 dosis","3 dosis","4 dosis"] },
            { id: "observaciones", label: "Observaciones", tipo: "textarea" }
          ]
        },
        transferencia: {
          titulo: "Transferencia de embrión",
          campos: [
            { id: "donadora", label: "Donadora", tipo: "text", placeholder: "ID o nombre" },
            { id: "receptora", label: "Receptora", tipo: "text", placeholder: "ID o nombre" },
            { id: "embriologo", label: "Embriólogo", tipo: "text" },
            { id: "calidad_embrion", label: "Calidad del embrión", tipo: "select", opciones: ["I", "II", "III"] },
            { id: "estado_embrion", label: "Estado del embrión", tipo: "select", opciones: ["Fresco", "Congelado"] },
            { id: "lote_pajilla", label: "Lote/Pajilla", tipo: "text" },
            { id: "ubicacion", label: "Ubicación (cuerno)", tipo: "select", opciones: ["Derecho", "Izquierdo"] },
            { id: "observaciones", label: "Observaciones", tipo: "textarea" }
          ]
        },
        sincronizacion: {
          titulo: "Sincronización",
          campos: [
            { id: "protocolo", label: "Protocolo", tipo: "select", opciones: ["Ovsynch", "Presynch", "CIDR", "Otro"] },
            { id: "fecha_inicio", label: "Fecha de inicio", tipo: "date" },
            { id: "fecha_fin", label: "Fecha de fin", tipo: "date" },
            { id: "observaciones", label: "Observaciones", tipo: "textarea" }
          ]
        },
        medicamentos: {
      titulo: "Aplicación de Medicamentos",
      campos: [
        { id: "medicamento", label: "Medicamento Aplicado", tipo: "text", placeholder: "Ej: Vitamina B12" },
        { id: "dosis_aplicada", label: "Dosis", tipo: "text", placeholder: "Ej: 10 ml" },
        { id: "via_administracion", label: "Vía de Administración", tipo: "select", opciones: ["Intramuscular", "Subcutánea", "Intravenosa", "Oral"] },
        { id: "proximo_tratamiento", label: "Próximo Tratamiento (opcional)", tipo: "date" },
        { id: "observaciones", label: "Observaciones", tipo: "textarea" }
      ]
    }
    };
    const RAZAS_BOVINAS = [
    'Aberdeen Angus','Ayrshire','Bazadaise','Beefmaster','Belgian Blue', 'Brahman',
    'Brangus','Charolais','Chianina','Criollo','Galloway','Gelbvieh','Gir',
    'Guzerá','Gyr Lechero','Guernsey','Hereford','Holstein','Jersey','Limousin',
    'Maine-Anjou','Marchigiana','Montbéliarde','Normando','Pardo Suizo',
    'Piemontese','Pinzgauer','Romagnola','Sahiwal','Santa Gertrudis','Sardo Negro',
    'Shorthorn','Simbrah','Simmental','Sindi','Tarentaise','Wagyu'
    ].sort((a,b) => a.localeCompare(b));

     // =================================================================
    // FUNCIONES DE AYUDA (HELPERS)
    // =================================================================
    const mostrarMensaje = (elId, texto, esError = true) => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.textContent = texto;
        const colorClass = esError ? 'text-red-500' : 'text-green-600';
        el.className = `text-sm h-4 text-center ${colorClass}`;
        setTimeout(() => { if (el) el.textContent = ''; }, 4000);
    };

    function logout() {
    currentUser = null;
    currentRancho = null;
    localStorage.removeItem('pinnedRancho'); // Limpia el rancho fijado
    sessionStorage.clear();
    navigateTo('login');
    navContainer.classList.add('hidden');
}


// Reemplaza tu 'handleRegister'
window.handleRegister = async function(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    const nombre = form.querySelector('[name="nombre"]').value;
    const email = form.querySelector('[name="email"]').value.trim().toLowerCase();
    const password = form.querySelector('[name="password"]').value;
    const rol = form.querySelector('[name="rol"]').value;
    const ranchoNombre = form.querySelector('[name="rancho_nombre"]').value;

    try {
        // 1. Creamos el usuario en 'Authentication'
        const { data: authData, error: authError } = await sb.auth.signUp({
            email: email,
            password: password
        });
        if (authError) throw authError;

        // 2. Creamos el perfil en 'usuarios'
        if (authData.user) {
            const { error: profileError } = await sb
                .from('usuarios')
                .insert({
                    id: authData.user.id, // Usamos el MISMO ID de Auth
                    nombre: nombre,
                    email: email,
                    rol: rol
                });
            if (profileError) throw profileError;

            // 3. Creamos el rancho si es propietario
            if (rol === 'propietario') {
                const codigoRancho = Math.random().toString(36).substring(2, 8).toUpperCase();
                const { error: ranchoError } = await sb
                    .from('ranchos')
                    .insert({
                        nombre: ranchoNombre || `${nombre.split(' ')[0]}'s Rancho`,
                        codigo: codigoRancho,
                        propietario_id: authData.user.id
                    });
                if (ranchoError) throw ranchoError;
            }
        }
        mostrarMensaje('registro-mensaje', '¡Registro exitoso! Serás redirigido al login.', false);
        setTimeout(() => navigateTo('login'), 1500);

    } catch (err) {
        mostrarMensaje('registro-mensaje', err.message || 'Error inesperado');
    } finally {
        btn.disabled = false;
    }
}

// =================================================================
// FUNCIÓN DE LOGIN (VERSIÓN SUPABASE DIRECTO Y GLOBAL)
// =================================================================
window.handleLogin = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }

    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    try {
        // 1. Intentamos iniciar sesión con Supabase Auth
        const { data, error } = await sb.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) throw error;

        // 2. Buscamos el perfil completo en 'usuarios'
        const { data: userData, error: userError } = await sb
            .from('usuarios')
            .select('*')
            .eq('id', data.user.id)
            .single();
        if (userError) throw userError;

        // 3. NO cargamos los ranchos aquí (lo hará el dashboard)
        
        // 4. Guardamos el perfil SIN los ranchos
        currentUser = userData;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        // 5. Navegamos al dashboard
        iniciarSesion();

    } catch (err) {
        mostrarMensaje('login-mensaje', err.message || 'Error inesperado');
    } finally {
        if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
    }
}
// =================================================================


// Reemplaza tu función renderizarVistaMiMvz existente con esta
async function renderizarVistaMiMvz() {
    const ranchoPrincipal = currentUser.ranchos?.[0];
    const ranchoId = ranchoPrincipal?.id;
    const codigoContainer = document.getElementById('codigo-acceso-container');
    const container = document.getElementById('lista-mvz-container');

    if (!ranchoId) {
         container.innerHTML = '<p class="text-red-500 text-center">No hay un rancho principal asociado.</p>';
         return;
    }

    // --- Muestra el código de acceso ---
    if (ranchoPrincipal && codigoContainer) {
        codigoContainer.innerHTML = `
            <h3 class="text-lg font-semibold mb-2">Código de Acceso</h3>
            <p class="text-sm text-gray-600 mb-2">Comparte este código con tu veterinario para que pueda acceder a los datos de tu rancho.</p>
            <p class="text-2xl font-mono font-bold text-gray-800 tracking-widest bg-gray-100 p-3 rounded-lg inline-block">${ranchoPrincipal.codigo}</p>
        `;
    }

    // --- Carga y muestra la lista de veterinarios ---
    container.innerHTML = '<p class="text-gray-500">Cargando...</p>';

    try {
        // --- CAMBIO: Usar Supabase directo ---
        const { data: mvzList, error } = await sb
            .from('rancho_mvz_permisos')
            .select(`id, permisos, usuarios ( id, nombre, email )`) // Seleccionamos el perfil del MVZ
            .eq('rancho_id', ranchoId);
            
        if (error) throw error;
        // --- FIN DEL CAMBIO ---

        if (!mvzList || mvzList.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">Aún no tienes veterinarios asociados a tu rancho.</p>';
            return;
        }

        container.innerHTML = mvzList.map(item => {
            // Verificamos que el perfil de usuario exista
            if (!item.usuarios) return ''; 
            
            const permisoActual = item.permisos || 'basico';
            return `
            <div class="bg-white p-4 rounded-xl shadow-md">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <i class="fa-solid fa-user-doctor text-xl text-gray-500"></i>
                        </div>
                        <div>
                            <p class="font-semibold text-gray-800">${item.usuarios.nombre}</p>
                            <p class="text-sm text-gray-500">${item.usuarios.email}</p>
                        </div>
                    </div>
                    <button onclick="handleRevocarAccesoMvz(${item.id})" class="text-red-500 hover:text-red-700" title="Revocar acceso">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
                <div class="mt-3 pt-3 border-t border-gray-100">
                    <label class="block text-sm font-medium text-gray-700">Permisos:</label>
                    <select onchange="handleConfirmarPermisoChange(${item.id}, this, '${escapeHtml(item.usuarios.nombre)}')" data-permiso-actual="${permisoActual}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg bg-white">
                        <option value="basico" ${permisoActual === 'basico' ? 'selected' : ''}>Solo registrar actividades</option>
                        <option value="admin" ${permisoActual === 'admin' ? 'selected' : ''}>Registrar actividades y agregar ganado</option>
                    </select>
                </div>
            </div>`;
        }).join('');
    } catch (error) {
        console.error("Error cargando MVZ:", error);
        container.innerHTML = `<p class="text-red-500 text-center">Error al cargar la lista de veterinarios: ${error.message}</p>`;
    }
}

 // Reemplaza tu función renderizarVistaMisVacas existente con esta
async function renderizarVistaMisVacas() {
    // 1. Obtenemos el ranchoId directamente de currentUser
    const ranchoId = currentUser?.ranchos?.[0]?.id;
    if (!ranchoId) {
        console.error("No se encontró ranchoId en currentUser para Mi Ganado.");
        const container = document.getElementById('lista-vacas-container');
        if(container) container.innerHTML = '<p class="text-center text-red-500 mt-8">Error: No se encontró un rancho asociado.</p>';
        return;
    }

    const container = document.getElementById('lista-vacas-container');
    container.innerHTML = '<p class="text-center text-gray-500 mt-8">Cargando ganado...</p>';
    

    // --- AÑADE ESTAS LÍNEAS DE DEBUG ---
    const fab = document.getElementById('btn-abrir-modal-vaca');
    if (fab) {
        console.log("DEBUG: Botón '+' (#btn-abrir-modal-vaca) encontrado en el DOM."); // <<< NUEVA LÍNEA
        fab.onclick = () => abrirModalVaca(); // Esta línea asigna la función
        console.log("DEBUG: Se asignó la función 'abrirModalVaca' al onclick del botón '+'."); // <<< NUEVA LÍNEA
    } else {
        console.error("DEBUG: ¡ERROR CRÍTICO! No se encontró el botón '+' (#btn-abrir-modal-vaca)."); // <<< NUEVA LÍNEA
    }
    // --- FIN DE LÍNEAS DE DEBUG ---

    try {
        // --- ¡AQUÍ ESTÁ EL CAMBIO PRINCIPAL! ---
        // Ya no usamos fetch, usamos el cliente 'sb'
        console.log(`Buscando vacas para rancho ID: ${ranchoId} directamente desde Supabase...`);
        const { data: vacasData, error } = await sb
            .from('vacas')
            .select('*') // Seleccionamos todas las columnas
            .eq('rancho_id', ranchoId); // RLS se encargará de verificar el permiso

        if (error) {
            console.error("Error de Supabase al obtener vacas:", error);
            throw error; // Lanzamos el error para que lo capture el catch
        }
        console.log("Vacas recibidas de Supabase:", vacasData);
        // --- FIN DEL CAMBIO ---

        listaCompletaDeVacas = vacasData || []; // Guardamos la lista completa

        const totalVacasEl = document.getElementById('total-vacas-header');
        if(totalVacasEl) totalVacasEl.textContent = listaCompletaDeVacas.length;

        // Las funciones de filtro y renderizado siguen igual
        setupFiltrosDeGanado();
        aplicarFiltrosDeGanado(); // Muestra la lista inicial

    } catch (error) {
        console.error("Error completo en renderizarVistaMisVacas:", error);
        container.innerHTML = `<p class="text-center text-red-500 mt-8">Error al cargar el ganado: ${error.message}</p>`;
    }
}  
 // =================================================================
// AÑADE ESTA NUEVA FUNCIÓN A main.js (Renderizar Vista Mis Ranchos MVZ)
// =================================================================
async function renderizarVistaMisRanchosMVZ() {
    const container = document.getElementById('lista-ranchos-mvz-container');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-gray-500 mt-8">Cargando ranchos...</p>';

    // Obtener el ID del rancho fijado (si existe) desde localStorage
    let pinnedRanchoId = null;
    try {
        const pinnedData = localStorage.getItem('pinnedRancho');
        if (pinnedData) {
            const pinnedRancho = JSON.parse(pinnedData);
            pinnedRanchoId = pinnedRancho?.id; // Guardamos solo el ID
        }
    } catch (e) {
        console.error("Error al leer rancho fijado:", e);
        localStorage.removeItem('pinnedRancho'); // Limpia si está corrupto
    }

    try {
        // 1. Consulta a Supabase para obtener los ranchos asociados al MVZ
        const { data: permisos, error } = await sb
            .from('rancho_mvz_permisos') // Desde la tabla de permisos
            .select('ranchos (*)')      // Selecciona TODOS los datos del rancho relacionado (*)
            .eq('mvz_id', currentUser.id); // Donde el mvz_id sea el del usuario actual

        if (error) throw error; // Lanza error si la consulta falla

        // 2. Extraer solo la lista de objetos 'ranchos'
        //    (Filtra por si algún permiso no tiene rancho asociado)
        const ranchos = (permisos || []).map(p => p.ranchos).filter(Boolean);

        // 3. Renderizar la lista
        if (ranchos.length === 0) {
            container.innerHTML = `
                <div class="bg-white p-6 rounded-xl text-center text-gray-500 shadow-sm">
                    <p>Aún no tienes acceso a ningún rancho.</p>
                    <p class="text-sm mt-2">Pídele al propietario el código de acceso de su rancho y valídalo en la pestaña 'Actividades'.</p>
                </div>`;
            return;
        }

        container.innerHTML = ranchos.map(rancho => {
            const isPinned = rancho.id === pinnedRanchoId; // Comprueba si este rancho es el fijado

            // Generar el HTML para cada tarjeta de rancho
            return `
            <div class="bg-white p-4 rounded-xl shadow-md flex items-center justify-between space-x-3">
                <div class="flex items-center space-x-3 min-w-0">
                    <div class="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <i class="fa-solid fa-house-medical text-xl text-gray-500"></i> 
                        </div>
                    <div class="min-w-0">
                        <p class="text-md font-semibold text-gray-800 truncate">${escapeHtml(rancho.nombre)}</p>
                        <p class="text-xs text-gray-400">ID: ${(rancho.id && typeof rancho.id === 'string') ? rancho.id.substring(0, 8) + '...' : 'Inválido'}</p>
                        </div>
                </div>

                <div class="flex-shrink-0">
                    ${isPinned 
                        ? '<i class="fa-solid fa-thumbtack text-xl text-blue-600" title="Rancho Fijado"></i>' 
                        : '<i class="fa-solid fa-thumbtack text-xl text-gray-300" title="No fijado"></i>'
                    }
                </div>
                
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error al cargar la lista de ranchos MVZ:", error);
        container.innerHTML = `<p class="text-center text-red-500 mt-8">Error al cargar los ranchos: ${error.message}</p>`;
    }
}
// =====================================================================
// =================================================================
// FUNCIÓN DE AYUDA PARA HABILITAR/DESHABILITAR EL BOTÓN DE PDF
// =================================================================
function actualizarEstadoBotonPDF() {
    // Usamos el ID de tu botón en el HTML
    const botonPDF = document.getElementById('btn-generar-pdf-historial');
    // Usamos 'appContent' porque el botón solo existe cuando la vista está activa
    const appContent = document.getElementById('app-content'); 
    
    // Si el botón no está en la vista actual, no hagas nada
    if (!botonPDF || !appContent) return; 

    // Busca los checkboxes DENTRO del contenedor del historial
    const historialContainer = appContent.querySelector('#historial-actividades-mvz');
    if (!historialContainer) return;

    const checkboxesMarcados = historialContainer.querySelectorAll('.sesion-checkbox:checked');

    if (checkboxesMarcados.length > 0) {
        // Habilitar botón
        botonPDF.disabled = false;
        botonPDF.textContent = `Descargar (${checkboxesMarcados.length})`;
        botonPDF.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        // Deshabilitar botón
        botonPDF.disabled = true;
        botonPDF.textContent = 'Descargar';
        botonPDF.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// REEMPLAZA tu función 'abrirModalVaca' (la que está por la línea 1530) con esta:
function abrirModalVaca() {
    console.log("DEBUG: Botón + presionado. Intentando abrir modal..."); // <<< AÑADE ESTA

    const modal = document.getElementById('modal-agregar-vaca');
    const form = document.getElementById('form-agregar-vaca');
    if (!modal || !form) {
         console.error("DEBUG: ¡Error! No se encontró el elemento #modal-agregar-vaca o #form-agregar-vaca."); // <<< AÑADE ESTA
         return; // Detiene la función si falta algo
    }

    form.reset();
    document.getElementById('vaca-id-input').value = '';
    document.getElementById('vaca-edad').value = '';
    document.getElementById('vaca-mensaje').textContent = '';

    // Limpia el display de la foto (para el nuevo diseño)
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileNameDisplay) {
        fileNameDisplay.innerHTML = '<span class="font-semibold">Click para subir</span> o arrastra';
        fileNameDisplay.classList.add('text-gray-500');
        fileNameDisplay.classList.remove('text-brand-green', 'font-semibold');
    }

    // Limpia el selector de sexo
    const sexoSelector = document.getElementById('sexo-selector');
    if (sexoSelector) {
        sexoSelector.querySelectorAll('button').forEach(b => {
            b.classList.remove('bg-brand-green', 'text-white');
            b.setAttribute('aria-pressed', 'false');
        });
    }
    const sexoInput = document.getElementById('vaca-sexo');
    if(sexoInput) sexoInput.value = '';

    // Conecta el botón 'X' para cerrar
    const btnCerrar = modal.querySelector('#btn-cerrar-modal-vaca');
    if (btnCerrar) btnCerrar.onclick = () => modal.classList.add('hidden');

    // Configura el modal para "CREAR"
    modal.querySelector('#modal-vaca-titulo').textContent = 'Registrar Nuevo Animal';
    document.getElementById('btn-guardar-siguiente-vaca').style.display = 'flex';
    document.getElementById('btn-finalizar-registro-vaca').innerHTML = '<i class="fa-solid fa-check-circle mr-2"></i>Guardar y Finalizar';

    // Conecta los botones de acción
    document.getElementById('btn-guardar-siguiente-vaca').onclick = () => handleGuardarVaca(false);
    document.getElementById('btn-finalizar-registro-vaca').onclick = () => handleGuardarVaca(true);

    // ¡Conecta las funciones auxiliares! (Esto arregla el bug)
    conectarAyudantesFormVaca();

// Justo antes de mostrar el modal
    console.log("DEBUG: Formulario preparado. Mostrando modal..."); // <<< AÑADE ESTA
    modal.classList.remove('hidden');
    console.log("DEBUG: Modal debería estar visible ahora."); // <<< AÑADE ESTA


    modal.classList.remove('hidden');
}

// REEMPLAZA tu función 'handleEditarVaca' (la que está por la línea 1566) con esta:
window.handleEditarVaca = function(vaca) {
    const modal = document.getElementById('modal-agregar-vaca');
    const form = document.getElementById('form-agregar-vaca');
    if (!modal || !form) return;

    form.reset();
    
    // Limpia el display de la foto
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileNameDisplay) {
        fileNameDisplay.innerHTML = vaca.foto_url ? 'Foto cargada anteriormente' : '<span class="font-semibold">Click para subir</span> o arrastra';
        fileNameDisplay.classList.add('text-gray-500');
        fileNameDisplay.classList.remove('text-brand-green', 'font-semibold');
    }

    // Rellenar el formulario
    form.querySelector('#vaca-id-input').value = vaca.id;
    form.querySelector('#vaca-nombre').value = vaca.nombre || '';
    form.querySelector('#vaca-siniiga').value = vaca.numero_siniiga || '';
    form.querySelector('#vaca-pierna').value = vaca.numero_pierna || '';
    form.querySelector('#vaca-lote').value = vaca.lote || '';
    form.querySelector('#vaca-raza').value = vaca.raza || '';
    form.querySelector('#vaca-nacimiento').value = vaca.fecha_nacimiento || '';
    form.querySelector('#vaca-padre').value = vaca.padre || '';
    form.querySelector('#vaca-madre').value = vaca.madre || '';
    form.querySelector('#vaca-origen').value = vaca.origen || 'Natural';

    // Seleccionar el sexo
    const sexo = vaca.sexo || 'Hembra';
    const sexoInput = document.getElementById('vaca-sexo');
    const sexoSelector = document.getElementById('sexo-selector');
    sexoInput.value = sexo;
    sexoSelector.querySelectorAll('button').forEach(btn => {
        if (btn.dataset.value === sexo) {
            btn.classList.add('bg-brand-green', 'text-white');
            btn.setAttribute('aria-pressed', 'true');
        } else {
            btn.classList.remove('bg-brand-green', 'text-white');
            btn.setAttribute('aria-pressed', 'false');
        }
    });

    // Conecta el botón 'X' para cerrar
    const btnCerrar = modal.querySelector('#btn-cerrar-modal-vaca');
    if (btnCerrar) btnCerrar.onclick = () => modal.classList.add('hidden');

    // Configura el modal para "EDITAR"
    modal.querySelector('#modal-vaca-titulo').textContent = 'Editar Animal';
    document.getElementById('btn-guardar-siguiente-vaca').style.display = 'none'; // Oculta "Guardar y Siguiente"

    const btnFinalizar = document.getElementById('btn-finalizar-registro-vaca');
    btnFinalizar.innerHTML = '<i class="fa-solid fa-save mr-2"></i>Actualizar Cambios';
    btnFinalizar.onclick = () => handleGuardarVaca(true); // Siempre cierra al editar

    // 3. Conectar cálculo de EDAD (Ahora usa la función helper)
    const nacimientoInput = document.getElementById('vaca-nacimiento');
    if (nacimientoInput) {
        // Llama a la función helper cada vez que la fecha cambie
        nacimientoInput.onchange = () => {
            calcularYMostrarEdad(nacimientoInput.value); 
        };
    }
    modal.classList.remove('hidden');
}
    async function handleEliminarVaca(vacaId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este animal? Esta acción no se puede deshacer.')) return;
        
        try {
            const res = await fetch(`/api/vacas/${vacaId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('No se pudo eliminar la vaca.');
            
            renderizarVistaMisVacas(); // Recargar la lista
        } catch (error) {
            alert(error.message || 'Error inesperado');
        }
    }
// Reemplaza window.verHistorialVaca
window.verHistorialVaca = async function(vacaId, vacaNombre) {
    const modalHistorial = document.getElementById('modal-historial-vaca');
    if (!modalHistorial) return;

    const prettyLabel = (k) => String(k || '').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    const btnCerrarModalHistorial = document.getElementById('btn-cerrar-modal-historial');
    if(btnCerrarModalHistorial) btnCerrarModalHistorial.onclick = () => modalHistorial.classList.add('hidden');

    document.getElementById('modal-historial-nombre-vaca').textContent = vacaNombre;
    const contenidoEl = document.getElementById('modal-historial-contenido');
    contenidoEl.innerHTML = '<p class="text-gray-500">Cargando...</p>';
    modalHistorial.classList.remove('hidden');

    try {
        // Esta consulta funcionará gracias a la Política 2
        const { data: historial, error } = await sb
            .from('actividades')
            .select('descripcion, fecha_actividad, tipo_actividad, usuarios (nombre)')
            .eq('id_vaca', vacaId)
            .order('fecha_actividad', { ascending: false });

        if (error) throw error;

        if (historial.length === 0) {
            contenidoEl.innerHTML = '<p class="text-gray-500">No hay actividades registradas para este animal.</p>';
            return;
        }

        contenidoEl.innerHTML = historial.map(item => {
            let detalles = item.descripcion || {};
            if (typeof detalles === 'string') {
                try { detalles = JSON.parse(detalles); } catch (e) { detalles = { 'Nota': detalles }; }
            }
            
            const detallesHtml = Object.entries(detalles)
                .map(([key, value]) => `<p><strong class="font-medium text-gray-600">${prettyLabel(key)}:</strong> ${value}</p>`)
                .join('');
            
            const mvzNombre = item.usuarios?.nombre || 'Desconocido';

            return `
            <div class="bg-gray-50 p-3 rounded-lg border mb-2">
                <p class="font-bold text-brand-green">${item.tipo_actividad}</p>
                <p class="text-xs text-gray-500 mb-2">
  Misma fecha               ${new Date(item.fecha_actividad + 'T00:00:00Z').toLocaleDateString('es-MX', { timeZone: 'UTC' })} por ${mvzNombre}
                </p>
                <div class="text-sm space-y-1">${detallesHtml}</div>
            </div>
            `;
        }).join('');
  } catch (error) {
        contenidoEl.innerHTML = `<p class="text-red-500">Error al cargar el historial: ${error.message}</p>`; // ✅ CORREGIDO
    }
}

// Reemplaza tu función renderizarVistaEstadisticas
async function renderizarVistaEstadisticas() {
    const ranchoId = currentUser?.ranchos?.[0]?.id;
    if (!ranchoId) return;

    const contenidoContainer = document.getElementById('contenido-estadisticas');
    contenidoContainer.innerHTML = '<p class="text-center text-gray-500">Cargando datos...</p>';

    try {
        // 1. Obtener todas las vacas del rancho
        const { data: vacas, error: vacasError } = await sb
            .from('vacas')
            .select('id, lote, raza');
        if (vacasError) throw vacasError;

        if (!vacas || vacas.length === 0) {
            contenidoContainer.innerHTML = '<p class="text-center text-gray-500">No hay datos suficientes para mostrar estadísticas.</p>';
            return;
        }

        // 2. Obtener la última palpación de todas las vacas (PLANC B DE CALCULO MANUAL)
        const cowIds = vacas.map(v => v.id);
        const { data: todasLasActividades, error: actError } = await sb
            .from('actividades')
            .select('id_vaca, descripcion, tipo_actividad, created_at')
            .in('id_vaca', cowIds)
            .eq('tipo_actividad', 'Palpación')
            .order('fecha_actividad', { ascending: false }) // 1. Ordena por fecha (más nueva primero)
            .order('created_at', { ascending: false });    // 2. Si fechas iguales, ordena por hora de creación (más nueva primero)

        if (actError) throw actError;

        // 3. Procesamiento manual de estadísticas (simulando la lógica del servidor)
        const estadoMap = new Map();
        (todasLasActividades || []).forEach(act => {
            if (!estadoMap.has(act.id_vaca)) {
                let desc = act.descripcion || {};
                if (typeof desc === 'string') { try { desc = JSON.parse(desc); } catch (e) { desc = {}; } }
                estadoMap.set(act.id_vaca, desc);
            }
        });

        const stats = vacas.reduce((acc, vaca) => {
            const lote = vaca.lote || 'Sin Lote';
            acc[lote] = acc[lote] || { totalVacas: 0, estados: { Gestante: 0, Estatica: 0, Ciclando: 0 }, razas: {} };
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
        
        datosEstadisticasCompletos = stats; // Guardamos para el renderizado del gráfico
        // --- FIN DEL CÁLCULO MIGRADO ---


        // 4. Renderizado de pestañas (no cambia)
        const lotes = Object.keys(datosEstadisticasCompletos);
        const tabsContainer = document.getElementById('tabs-lotes-container');
        tabsContainer.innerHTML = '';

        lotes.forEach(lote => {
            const tabButton = document.createElement('button');
            tabButton.className = 'py-2 px-4 text-gray-500 font-semibold border-b-2 border-transparent';
            tabButton.textContent = lote === 'Sin Lote' ? 'Sin Asignar' : `Lote ${lote}`;
            tabButton.dataset.loteId = lote;
            tabsContainer.appendChild(tabButton);
        });

        tabsContainer.querySelectorAll('button').forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabsContainer.querySelector('.text-brand-green.border-brand-green')?.classList.remove('text-brand-green', 'border-brand-green');
                e.currentTarget.classList.add('text-brand-green', 'border-brand-green');
                renderizarGraficoLote(e.currentTarget.dataset.loteId);
            });
        });

        if (tabsContainer.firstChild) {
            tabsContainer.firstChild.click();
        }

    } catch (error) {
        console.error("Error al cargar estadísticas:", error);
        contenidoContainer.innerHTML = `<p class="text-center text-red-500">${error.message || 'Error al cargar estadísticas.'}</p>`;
    }
}
    
    function renderizarGraficoLote(loteId) {
        const datosLote = datosEstadisticasCompletos[loteId];
        const contenidoContainer = document.getElementById('contenido-estadisticas');
        if (!datosLote || !contenidoContainer) {
             if (contenidoContainer) contenidoContainer.innerHTML = `<p class="text-center text-red-500">No se encontraron datos para el lote ${loteId}.</p>`;
             return;
        }

        // Estructura HTML para la vista de estadísticas
        contenidoContainer.innerHTML = `
            <div class="bg-white p-4 rounded-xl shadow-md">
                <div class="mb-4">
                    <h2 class="text-lg font-bold text-gray-900">Lote ${loteId}: Estado Reproductivo</h2>
                    <p class="text-sm text-gray-500">Última Actualización: ${new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <div class="relative h-64 w-full mx-auto mb-4">
                    <canvas id="grafico-reproductivo"></canvas>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span class="text-3xl font-bold text-gray-800">${datosLote.totalVacas || 0}</span>
                        <span class="text-sm text-gray-500">Total de Vacas</span>
                    </div>
                </div>
                <div id="stats-resumen-texto" class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm"></div>
            </div>`;

        const ctx = document.getElementById('grafico-reproductivo')?.getContext('2d');
        const estados = datosLote.estados || {};
        const totalVacas = datosLote.totalVacas || 1;
        const data = {
            labels: ['Gestantes', 'Estáticas', 'Ciclando'],
            datasets: [{
                data: [estados.Gestante || 0, estados.Estatica || 0, estados.Ciclando || 0],
                backgroundColor: ['#10b981', '#f59e0b', '#f97316'],
                borderColor: '#ffffff',
                borderWidth: 4,
                hoverOffset: 8
            }]
        };
        
        if (miGrafico) miGrafico.destroy();
        if (ctx) {
            miGrafico = new Chart(ctx, {
                type: 'doughnut', data, options: {
                responsive: true, maintainAspectRatio: false, cutout: '70%',
                plugins: { legend: { display: false } }
            }});
        }
        
        document.getElementById('stats-resumen-texto').innerHTML = `
            <p><strong>Gestantes:</strong> ${estados.Gestante || 0} vacas (${Math.round(((estados.Gestante||0)/totalVacas)*100)}%)</p>
            <p><strong>Estáticas:</strong> ${estados.Estatica || 0} vacas (${Math.round(((estados.Estatica||0)/totalVacas)*100)}%)</p>
            <p><strong>Ciclando:</strong> ${estados.Ciclando || 0} vacas (${Math.round(((estados.Ciclando||0)/totalVacas)*100)}%)</p>
            <p><strong>Raza Pred.:</strong> ${Object.keys(datosLote.razas || {})[0] || 'N/A'}</p>
        `;
    }


    const accionesContainerTop = document.getElementById('acciones-rapidas-container');
    if (accionesContainerTop) accionesContainerTop.innerHTML = ''; // safe init

// =================================================================
// REEMPLAZA ESTA FUNCIÓN (initActividadesMvzListeners)
// =================================================================
async function initActividadesMvzListeners() {
    const modoCont = document.getElementById('modo-seleccion-container');
    const ranchoActions = document.getElementById('rancho-actions-container');
    loteActividadActual = []; 

    // Lógica para cargar el rancho fijado
    const pinnedRanchoData = localStorage.getItem('pinnedRancho');
    if (pinnedRanchoData) {
        try {
            const rancho = JSON.parse(pinnedRanchoData);
            if (rancho && rancho.id && rancho.nombre) {
                
                // --- INICIO: VERIFICAR PERMISO DEL RANCHO FIJADO ---
                let permisoNivel = 'basico'; // Por defecto
                if (rancho.id !== null) { // Solo consulta si no es 'Independiente'
                    const { data: permiso, error: permisoError } = await sb
                        .from('rancho_mvz_permisos')
                        .select('permisos')
                        .eq('rancho_id', rancho.id)
                        .eq('mvz_id', currentUser.id)
                        .maybeSingle();
                    
                    if (permisoError) throw permisoError;
                    if (permiso) permisoNivel = permiso.permisos;
                }
                // --- FIN: VERIFICAR PERMISO ---

                currentRancho = rancho;
                currentRancho.permission_level = permisoNivel; // <-- ¡AQUÍ ESTÁ LA MAGIA!
                
                iniciarActividadUI();
                await cargarVacasParaMVZ();
                return; // Salta la pantalla de selección de modo
            }
        } catch (e) {
            localStorage.removeItem('pinnedRancho'); 
        }
    }

    // Si no hay rancho fijado, muestra la selección de modo
    if (modoCont) modoCont.classList.remove('hidden');
    if (ranchoActions) ranchoActions.classList.add('hidden');

    const btnShow = document.getElementById('btn-show-rancho-registrado');
    if (btnShow) btnShow.onclick = () => {
        const container = document.getElementById('rancho-access-container');
        if (container) container.classList.toggle('hidden');
    };
    const btnInd = document.getElementById('btn-iniciar-independiente');
if (btnInd) btnInd.onclick = () => {
    currentRancho = { id: null, nombre: 'Trabajo Independiente', permission_level: 'basico' }; // <-- CORREGIDO
    iniciarActividadUI();
};
    const btnValidar = document.getElementById('btn-validar-rancho');
    if (btnValidar) btnValidar.onclick = handleValidarRancho;
}

// =================================================================
// REEMPLAZA ESTA FUNCIÓN (handleValidarRancho)
// =================================================================
async function handleValidarRancho() {
    const codigoEl = document.getElementById('codigo-rancho');
    const codigo = codigoEl ? codigoEl.value.trim().toUpperCase() : '';
    if (!codigo) { mostrarMensaje('mensaje-rancho', 'El código no puede estar vacío.'); return; }
    
    try {
        // 1. Buscamos el rancho por su código
        const { data: rancho, error: ranchoError } = await sb
            .from('ranchos')
            .select('*')
            .eq('codigo', codigo)
            .maybeSingle();

        if (ranchoError) throw ranchoError;
        if (!rancho) throw new Error('Código de rancho no válido.');

        // 2. Verificamos/Creamos el permiso
        const { data: permiso, error: permisoError } = await sb
            .from('rancho_mvz_permisos')
            .select('id, permisos') // <-- Pedimos los permisos
            .eq('rancho_id', rancho.id)
            .eq('mvz_id', currentUser.id)
            .maybeSingle();

        if (permisoError) throw permisoError;

        let permisoNivel = 'basico'; // Por defecto

        if (!permiso) {
            // 3. Si no existe, lo creamos con permiso 'basico'
            console.log("Creando enlace de permiso MVZ-Rancho...");
            const { error: insertPermisoError } = await sb
                .from('rancho_mvz_permisos')
                .insert({
                    rancho_id: rancho.id,
                    mvz_id: currentUser.id,
                    permisos: 'basico' // Por defecto
                });
            if (insertPermisoError) throw insertPermisoError;
            // permisoNivel ya es 'basico'
        } else {
            // 4. Si ya existía, usamos el nivel de permiso guardado
            permisoNivel = permiso.permisos; 
        }

        // 5. Guardamos el rancho Y su nivel de permiso en el estado global
        currentRancho = rancho;
        currentRancho.permission_level = permisoNivel; // <-- ¡AQUÍ ESTÁ LA MAGIA!

        iniciarActividadUI(); // Llama a la función que dibuja las acciones
        await cargarVacasParaMVZ(); 
    } catch (err) {
        mostrarMensaje('mensaje-rancho', err.message || 'Error inesperado');
    }
}

// =================================================================
// REEMPLAZA ESTA FUNCIÓN COMPLETA (iniciarActividadUI - Corrección de Diseño)
// =================================================================
function iniciarActividadUI() {
    document.getElementById('modo-seleccion-container')?.classList.add('hidden');
    document.getElementById('rancho-actions-container')?.classList.remove('hidden');

    const esIndependiente = !currentRancho?.id;

    // --- Actualiza Encabezado (sin cambios) ---
    const nombreActivoEl = document.getElementById('rancho-nombre-activo');
    if (nombreActivoEl) nombreActivoEl.textContent = esIndependiente ? 'Trabajo Independiente' : (currentRancho?.nombre || '');
    const logoEl = document.getElementById('rancho-logo');
    if (logoEl) logoEl.src = currentRancho?.logo_url || 'assets/logo.png';
    const loteInfoEl = document.getElementById('lote-info');   if (loteInfoEl) loteInfoEl.textContent = `${loteActividadActual.length} vacas`;
    
    // --- Lógica de Fijado (sin cambios) ---
    const btnFijarPrincipal = document.getElementById('btn-fijar-rancho');
    const ranchoIndependienteContainer = document.getElementById('rancho-independiente-input-container');
    if (esIndependiente) {
        if (ranchoIndependienteContainer) ranchoIndependienteContainer.classList.remove('hidden');
        if (btnFijarPrincipal) btnFijarPrincipal.classList.add('hidden');
    } else { 
        if (ranchoIndependienteContainer) ranchoIndependienteContainer.classList.add('hidden');
        if (btnFijarPrincipal) btnFijarPrincipal.classList.remove('hidden');
        if (btnFijarPrincipal) {
            const pinnedRancho = JSON.parse(localStorage.getItem('pinnedRancho') || 'null');
            const isPinned = pinnedRancho && pinnedRancho.id === currentRancho?.id;
            btnFijarPrincipal.querySelector('i').classList.toggle('text-white', isPinned);
            btnFijarPrincipal.querySelector('i').classList.toggle('text-white/50', !isPinned);
            btnFijarPrincipal.onclick = () => {
                const currentlyPinned = JSON.parse(localStorage.getItem('pinnedRancho') || 'null');
                if (currentlyPinned && currentlyPinned.id === currentRancho?.id) {
                    localStorage.removeItem('pinnedRancho');
                    btnFijarPrincipal.querySelector('i').classList.replace('text-white', 'text-white/50');
                    alert('Rancho desfijado.');
                } else {
                    localStorage.setItem('pinnedRancho', JSON.stringify(currentRancho));
                    btnFijarPrincipal.querySelector('i').classList.replace('text-white/50', 'text-white');
                    alert(`Rancho '${currentRancho.nombre}' fijado.`);
                }
            };
        }
    }
   
    // ==============================================
    // --- INICIO: LÓGICA DE DIBUJO DE ACCIONES (CORREGIDA) ---
    // ==============================================
    const accionesContainer = document.getElementById('acciones-rapidas-container');
    if (accionesContainer) {
        accionesContainer.innerHTML = ''; // Limpiamos

        // --- CORRECCIÓN 1: Quitar las clases grid para que los elementos se apilen verticalmente ---
        accionesContainer.className = 'space-y-4'; // Añade espacio vertical entre elementos

        // --- 1. Dibuja el botón "Administrar Ganado" (solo si es admin) ---
        if (currentRancho && currentRancho.permission_level === 'admin') {
            const adminBtn = document.createElement('button');
            adminBtn.className = 'w-full p-4 rounded-2xl shadow-sm flex items-center justify-center space-x-3 bg-gray-800 text-white';
            adminBtn.innerHTML = `
                <i class="fa-solid fa-cow text-2xl"></i>
                <span class="font-bold text-md">Administrar Ganado</span>
            `;
            adminBtn.onclick = () => navigateTo('mvz-ganado');
            accionesContainer.appendChild(adminBtn);
        }

        // --- 2. Añade el título "Actividades de Registro" ---
        const tituloActividades = document.createElement('h3');
        tituloActividades.className = 'text-lg font-bold text-gray-800'; // Quitamos mb-3
        tituloActividades.textContent = 'Actividades de Registro';
        accionesContainer.appendChild(tituloActividades);

        // --- 3. Crea el contenedor de scroll horizontal ---
        const scrollerDiv = document.createElement('div');
        scrollerDiv.className = 'flex overflow-x-auto py-2 horizontal-scrollbar-hidden';
        accionesContainer.appendChild(scrollerDiv);

        // --- 4. Define y dibuja las tarjetas de ACTIVIDADES ---
        const acciones = [
            { id: 'palpacion', titulo: 'Palpación', icono: 'fa-stethoscope', color: 'bg-blue-100', textColor: 'text-blue-800' },
            { id: 'inseminacion', titulo: 'Inseminación', icono: 'fa-syringe', color: 'bg-green-100', textColor: 'text-green-800' },
            { id: 'transferencia', titulo: 'Transferencia', icono: 'fa-flask-vial', color: 'bg-yellow-100', textColor: 'text-yellow-800' },
            { id: 'sincronizacion', titulo: 'Sincronización', icono: 'fa-clock-rotate-left', color: 'bg-purple-100', textColor: 'text-purple-800' },
            { id: 'medicamentos', titulo: 'Medicamentos', icono: 'fa-pills', color: 'bg-red-100', textColor: 'text-red-800' },
            { id: 'otros', titulo: 'Otros', icono: 'fa-ellipsis', color: 'bg-gray-100', textColor: 'text-gray-800' }
        ];

        acciones.forEach(accion => {
            const card = document.createElement('button');
            // --- CORRECCIÓN 2: Reducir el ancho de la tarjeta ---
            card.className = `flex-shrink-0 w-32 h-28 p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center mr-3 ${accion.color}`; // Cambiado w-36 a w-32
            card.onclick = () => abrirModalActividad(accion.id);
            card.innerHTML = `
                <i class="fa-solid ${accion.icono} text-3xl ${accion.textColor}"></i>
                <span class="font-bold text-md text-center mt-3 ${accion.textColor}">${accion.titulo}</span>
            `;
            scrollerDiv.appendChild(card); 
        });
    }
    // ==============================================
    // --- FIN: LÓGICA DE DIBUJO DE ACCIONES (CORREGIDA) ---
    // ==============================================
    
    renderizarHistorialMVZ(); // Esto se queda igual
}

// REEMPLAZA tu función abrirModalActividad
function abrirModalActividad(tipo) {
    const modal = document.getElementById('modal-actividad');
    const form = document.getElementById('form-actividad-vaca');
    if (!modal || !form) return;

    form.reset(); 
    form.querySelectorAll('select').forEach(select => { select.selectedIndex = -1; }); 
    renderizarCamposProcedimiento(tipo);
    modal.classList.remove('hidden');

    const tituloEl = document.getElementById('modal-actividad-titulo');
    if (tituloEl && PROCEDIMIENTOS[tipo]) {
        tituloEl.textContent = PROCEDIMIENTOS[tipo].titulo;
    }
    
    const actividadLoteEl = document.getElementById('actividad-lote');
    if (actividadLoteEl) {
        actividadLoteEl.innerHTML = ''; 
        for (let i = 1; i <= 10; i++) {
            actividadLoteEl.innerHTML += `<option value="${i}">Lote ${i}</option>`;
        }
    }

    const btnCerrar = document.getElementById('btn-cerrar-modal-actividad');
    if (btnCerrar) btnCerrar.onclick = () => modal.classList.add('hidden');

    const btnGuardar = document.getElementById('btn-guardar-siguiente');
    if (btnGuardar) btnGuardar.onclick = () => handleAgregarVacaAlLote(tipo, true);

    const btnFinalizar = document.getElementById('btn-finalizar-actividad-modal');
    if (btnFinalizar) btnFinalizar.onclick = async () => {
        if (document.getElementById('actividad-arete')?.value.trim()) {
            handleAgregarVacaAlLote(tipo, false); 
        }
        await handleFinalizarYReportar();
        modal.classList.add('hidden');
    };
     
    // --- LÓGICA DE AUTOCOMPLETADO (CORREGIDA) ---
    crearAutocompletadoParcial('actividad-arete', 'sugerencias-arete-container', vacasIndex);
    crearAutocompletado('actividad-raza', 'sugerencias-raza-container', RAZAS_BOVINAS);
    
    const areteInput = document.getElementById('actividad-arete');
    const razaInput = document.getElementById('actividad-raza');
    if (areteInput && razaInput) {
        areteInput.addEventListener('input', () => {
            const areteCompleto = areteInput.value.trim();
            const vacaEncontrada = vacasIndex.get(areteCompleto);
            if (vacaEncontrada) { 
                razaInput.value = vacaEncontrada.raza || '';
            }
        });
    }
}

// Reemplaza handleFinalizarYReportar
async function handleFinalizarYReportar() {
    const btn = document.getElementById('btn-finalizar-actividad-modal');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Procesando...';
    }

    if (!currentRancho) {
        alert('Error: No se ha definido un rancho de trabajo.');
        if(btn){ btn.disabled = false; btn.textContent = 'Finalizar Actividad'; }
        return;
    }

    if (loteActividadActual.length === 0) {
        alert("No hay actividades en el lote para reportar.");
        if(btn){ btn.disabled = false; btn.textContent = 'Finalizar Actividad'; }
        return;
    }
    
    const sesionId = crypto.randomUUID(); 
    const nombreDelRancho = currentRancho.id === null
        ? document.getElementById('rancho-independiente-nombre')?.value?.trim() || 'Independiente'
        : currentRancho.nombre;

    // 1. Preparamos los datos para Supabase
    const actividadesParaInsertar = loteActividadActual.map(item => ({
        tipo_actividad: item.tipoLabel,
        descripcion: item.detalles, // Objeto JSON
        fecha_actividad: item.fecha,
        id_vaca: item.vacaId, // UUID de la vaca
        id_usuario: currentUser.id, // UUID del MVZ
        sesion_id: sesionId,
        rancho_id: currentRancho.id, 
        extra_data: { arete: item.areteVaca, raza: item.raza, lote: item.loteNumero, rancho_nombre: nombreDelRancho }
    }));
    
    try {
        // 2. Insertamos en Supabase (RLS debe permitir INSERT en actividades)
        const { error: insertError } = await sb
            .from('actividades')
            .insert(actividadesParaInsertar);

        if (insertError) throw insertError;

        // 3. MANTENEMOS el fetch al server.js SOLO para el PDF
        const payloadPDF = {
            mvzId: currentUser.id, ranchoId: currentRancho.id, loteActividad: loteActividadActual,
            mvzNombre: currentUser.nombre || '', ranchoNombre: nombreDelRancho
        };

        console.log("Datos enviados a /api/actividades:", JSON.stringify(payloadPDF, null, 2));

        const res = await fetch('/api/actividades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadPDF)
        });
        if (!res.ok) throw new Error('Los datos se guardaron, pero falló la generación del PDF.');

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_${loteActividadActual[0].tipoLabel}_${new Date().toISOString().slice(0,10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        loteActividadActual = [];
        const loteInfoEl = document.getElementById('lote-info');
        if (loteInfoEl) loteInfoEl.textContent = `0 vacas`;
        renderizarHistorialMVZ(); // Recarga el historial del MVZ

    } catch (err) {
        console.error("Error al finalizar y/o generar PDF:", err);
        alert(err.message || 'Hubo un error inesperado.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Finalizar Actividad';
        }
    }
}

/*
 * =================================================================
 * REEMPLAZA OTRA VEZ ESTA FUNCIÓN (Historial MVZ - Fecha Fix v3 FINAL)
 * =================================================================
 * Usa 'sesion.fecha' y la formatea correctamente.
 */
async function renderizarHistorialMVZ() {
    const historialContainer = document.getElementById('historial-actividades-mvz');
    if (!historialContainer) return; 

    historialContainer.innerHTML = '<p class="text-gray-500 text-center">Cargando historial...</p>';

    try {
        if (!currentUser || !currentUser.id) {
            throw new Error("No se pudo identificado al usuario actual.");
        }

        const { data: sesiones, error } = await sb
            .rpc('get_sesiones_actividad_mvz', { 
                mvz_id: currentUser.id 
            });

        if (error) throw error;
        
        // --- LÍNEA DE DEBUG AÑADIDA ---
        console.log("Datos crudos de sesiones:", sesiones); 
        // --- FIN DE LÍNEA DE DEBUG ---

        if (!sesiones || sesiones.length === 0) {
            historialContainer.innerHTML = `
                <div class="bg-white p-4 rounded-xl text-center text-gray-500">
                    <p>No hay reportes recientes.</p>
                </div>
            `;
            actualizarEstadoBotonPDF(); 
            return;
        }

        historialContainer.innerHTML = sesiones.map(sesion => {
            
            // --- INICIO DE LA CORRECCIÓN "Fecha Real v3" ---
            let fechaFormateada = 'Sin fecha';
            
            // Usamos 'sesion.fecha' que viene como 'YYYY-MM-DD'
            if (sesion.fecha) { 
                // Forzamos la interpretación como UTC
                const fechaObj = new Date(sesion.fecha + 'T00:00:00Z'); 
                
                if (!isNaN(fechaObj.getTime())) { 
                    fechaFormateada = fechaObj.toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        timeZone: 'UTC' 
                    });
                } else {
                     console.warn("Fecha inválida recibida:", sesion.fecha); 
                }
            }
            // --- FIN DE LA CORRECCIÓN ---

            return ` 
            <div class="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between mb-3 w-full">
                <div class="flex items-center flex-1 min-w-0">
                    <input type="checkbox" data-sesion-id="${sesion.sesion_id}" class="h-5 w-5 rounded border-gray-300 mr-4 sesion-checkbox">
                    <div class="min-w-0">
                        <p class="font-bold text-gray-800 truncate">
                            ${sesion.tipo_actividad} en <em>${sesion.rancho_nombre}</em>
                        </p>
                        <p class="text-sm text-gray-500">
                            ${sesion.conteo} animales - ${fechaFormateada}
                        </p>
                    </div>
                </div>

                ${ // Condición para mostrar el botón de borrar
                    currentUser.rol === 'propietario' 
                    ? // Si es propietario, dibuja el botón:
                      `<button data-sesion-id="${sesion.sesion_id}" class="btn-eliminar-sesion text-red-400 hover:text-red-600 px-2 ml-2 flex-shrink-0">
                           <i class="fa-solid fa-trash-can text-xl"></i>
                       </button>`
                    : // Si NO es propietario, no dibujes nada:
                      '' 
                }
            </div>
            `;
        }).join('');

        // Conectar botones de eliminar (sin cambios)
        historialContainer.querySelectorAll('.btn-eliminar-sesion').forEach(button => {
            const clickListener = async (e) => { 
                button.removeEventListener('click', clickListener); 
                const sesionId = e.currentTarget.dataset.sesionId;

                if (!confirm('¿Estás seguro de que quieres eliminar esta sesión?')) {
                    button.addEventListener('click', clickListener);
                    return; 
                }
                
                try {
                    const { error: deleteError } = await sb
                        .from('actividades') // Tabla donde están los registros
                        .delete()
                        .eq('sesion_id', sesionId); // Filtra por el ID de la sesión a borrar

                    if (deleteError) throw deleteError;
                    
                    renderizarHistorialMVZ(); // Recarga la lista

                } catch (error) {
                    console.error("DEBUG: Error al eliminar sesión:", error);
                    alert(error.message || 'Error al eliminar la sesión.');
                    button.addEventListener('click', clickListener); 
                }
             };
            button.addEventListener('click', clickListener);
        });

        // Actualizar botón PDF (sin cambios)
        actualizarEstadoBotonPDF();

    } catch (error) {
        console.error("Error al cargar historial MVZ:", error);
        historialContainer.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl" role="alert">
                <strong class="font-bold">¡Error!</strong>
                <span class="block sm:inline">No se pudo cargar el historial.</span>
                <p class="text-sm">${error.message}</p>
            </div>
        `;
    }
}
/*
 * =================================================================
 * PASO 2: AÑADE ESTA NUEVA FUNCIÓN (Helper del PDF)
 * =================================================================
 * Revisa los checkboxes marcados y activa/desactiva el botón de descarga.
 */
function actualizarEstadoBotonPDF() {
    // Usamos el ID de tu botón en el HTML
    const botonPDF = document.getElementById('btn-generar-pdf-historial');
    const appContent = document.getElementById('app-content'); 

    // Si el botón no está en la vista actual, no hagas nada
    if (!botonPDF || !appContent) return; 

    // Busca los checkboxes DENTRO del contenedor del historial
    const historialContainer = appContent.querySelector('#historial-actividades-mvz');
    if (!historialContainer) return;

    const checkboxesMarcados = historialContainer.querySelectorAll('.sesion-checkbox:checked');

    if (checkboxesMarcados.length > 0) {
        // Habilitar botón
        botonPDF.disabled = false;
        botonPDF.textContent = `Descargar (${checkboxesMarcados.length})`;
        botonPDF.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        // Deshabilitar botón
        botonPDF.disabled = true;
        botonPDF.textContent = 'Descargar';
        botonPDF.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// NOTA: Asegúrate de llamar a esta función cuando la página cargue
// o cuando el usuario inicie sesión.
// renderizarHistorialMVZ();

// pequeño helper para escapar HTML en textos dinámicos
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// toast simple (si no tienes, crea uno similar)
function showToast(msg, ms = 1800) {
  const t = document.getElementById('vaca-toast') || document.createElement('div');
  t.id = 'vaca-toast';
  t.className = 'fixed left-1/2 -translate-x-1/2 bottom-8 bg-gray-800 text-white text-sm px-4 py-2 rounded-lg';
  t.textContent = msg;
  document.body.appendChild(t);
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.remove(), ms);
}


    // Reemplaza tu función handleGenerarPdfDeHistorial
async function handleGenerarPdfDeHistorial() {
    const checkboxes = document.querySelectorAll('#historial-actividades-mvz input[type="checkbox"]:checked');
    const sesionesSeleccionadas = Array.from(checkboxes).map(cb => cb.dataset.sesionId);

    if (sesionesSeleccionadas.length === 0) {
        alert('Por favor, selecciona al menos una actividad del historial para generar el reporte.');
        return;
    }
    
    // --- Mantenemos la llamada FETCH porque el servidor contiene la lógica PDF ---
    try {
        const res = await fetch('/api/historial/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sesion_ids: sesionesSeleccionadas, mvzNombre: currentUser?.nombre || '' })
        });

        if (!res.ok) {
            const txt = await res.text().catch(()=>null);
            throw new Error(txt || 'El servidor no pudo generar el PDF.');
        }
        
        // Procesa y descarga el PDF (lógica que ya existía)
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_historial_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (err) {
        console.error("Error al generar PDF de historial:", err);
        alert('Hubo un error al generar el reporte.');
    }
}
    
 function renderizarCamposProcedimiento(tipo) {
    const container = document.getElementById('campos-dinamicos-procedimiento');
    if (!container) return;
    container.innerHTML = '';
    const proc = PROCEDIMIENTOS[tipo];
    if (!proc) return;

    // Crea el HTML para cada campo del formulario
    container.innerHTML = proc.campos.map(campo => {
        if (campo.id === 'raza') return '';
        const revelaAttr = campo.revela ? `data-revela-target="${campo.revela}"` : '';
        const ocultoClass = campo.oculto ? 'hidden' : '';

        // CORRECCIÓN: Se eliminó la lógica duplicada y se limpió la creación de campos
        if (campo.tipo === 'select') {
            // Añadimos una primera opción vacía y seleccionada por defecto
            const opciones = [`<option value="" disabled selected>Selecciona una opción</option>`, ...campo.opciones.map(o => `<option value="${o}">${o}</option>`)].join('');
            return `<div class="${ocultoClass}"><label class="block text-sm font-medium text-gray-700">${campo.label}</label><select name="${campo.id}" ${revelaAttr} class="mt-1 w-full p-2 border border-gray-300 rounded-lg bg-white">${opciones}</select></div>`;
        } else if (campo.tipo === 'textarea') {
            return `<div><label class="block text-sm font-medium text-gray-700">${campo.label}</label><textarea name="${campo.id}" rows="2" class="mt-1 w-full p-2 border border-gray-300 rounded-lg"></textarea></div>`;
        } else if (campo.tipo === 'checkbox') {
            return `<label class="flex items-center space-x-2 mt-2"><input type="checkbox" name="${campo.id}" value="Sí" class="h-5 w-5 rounded border-gray-300"><span class="text-sm font-medium text-gray-700">${campo.label}</span></label>`;
        } else { // text, date, etc.
            return `<div class="${ocultoClass}"><label class="block text-sm font-medium text-gray-700">${campo.label}</label><input type="${campo.tipo || 'text'}" name="${campo.id}" placeholder="${campo.placeholder || ''}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg"></div>`;
        }
    }).join('');

    // Añade la lógica para mostrar/ocultar campos
    container.querySelectorAll('[data-revela-target]').forEach(triggerEl => {
        triggerEl.addEventListener('change', () => {
            const targetName = triggerEl.dataset.revelaTarget;
            const targetEl = container.querySelector(`[name="${targetName}"]`);
            if (targetEl) {
                const show = triggerEl.value === 'Sí' || triggerEl.value === 'IA Convencional';
                targetEl.closest('div').classList.toggle('hidden', !show);
            }
        });
    });
}

// Reemplaza cargarVacasParaMVZ
async function cargarVacasParaMVZ() {
    if (!currentRancho || !currentRancho.id) return;
    try {
        // Ahora esta consulta SÍ FUNCIONARÁ gracias a la Política 1 y al enlace creado en handleValidarRancho
        const { data: vacas, error } = await sb
            .from('vacas')
            .select('id, numero_siniiga, raza')
            .eq('rancho_id', currentRancho.id); 

        if (error) throw error;

        const datalist = document.getElementById('lista-aretes-autocompletar');
        if (datalist) datalist.innerHTML = '';
        
        vacasIndex.clear();
        (vacas || []).forEach(v => {
            // Poblar el índice (clave para la búsqueda parcial)
            vacasIndex.set(String(v.numero_siniiga).trim(), { id: v.id, raza: v.raza || '' });
        });
        console.log(`DEBUG: Índice de vacas cargado con ${vacasIndex.size} animales.`);
    } catch (err) { 
        console.error("Error cargando vacas para MVZ:", err); 
    }
}

// Reemplaza handleAgregarVacaAlLote
function handleAgregarVacaAlLote(tipoActividad, limpiarForm) {
    const form = document.getElementById('form-actividad-vaca');
    const areteInput = document.getElementById('actividad-arete');
    const loteNumero = document.getElementById('actividad-lote')?.value;
    const arete = areteInput ? areteInput.value.trim() : '';

    if (!arete) {
        if (!limpiarForm) return; 
        mostrarMensaje('mensaje-vaca', 'El número de arete es obligatorio.');
        return;
    }
    
    // Busca la vaca en el índice
    const vacaEncontrada = vacasIndex.get(arete);
    // Obtenemos el ID (UUID) de la vaca
    const idDeLaVaca = vacaEncontrada ? vacaEncontrada.id : null;

    // --- CONSTRUCCIÓN MANUAL DE DETALLES ---
    const detalles = {};
    const camposDinamicos = document.getElementById('campos-dinamicos-procedimiento');
    if (camposDinamicos) {
        camposDinamicos.querySelectorAll('input, select, textarea').forEach(el => {
            const key = el.name;
            if (!key) return; 
            if (el.type === 'checkbox') {
                if (el.checked) {
                    detalles[key] = 'Sí';
                }
            } else if (el.value) {
                detalles[key] = el.value;
            }
        });
    }
    // --- FIN CONSTRUCCIÓN MANUAL ---
        
    loteActividadActual.push({
        vacaId: idDeLaVaca, // <-- ID de la vaca (UUID)
        areteVaca: arete,
        raza: form.querySelector('#actividad-raza').value.trim() || 'N/A',
        loteNumero: loteNumero,
        tipo: tipoActividad,
        tipoLabel: PROCEDIMIENTOS[tipoActividad].titulo,
        fecha: new Date().toISOString().split('T')[0],
        detalles: detalles // Objeto JSON con {gestante: 'Sí'}
    });
        
    mostrarMensaje('mensaje-vaca', `Vaca ${arete} agregada.`, false);
    const loteInfoEl = document.getElementById('lote-info');
    if (loteInfoEl) loteInfoEl.textContent = `${loteActividadActual.length} vacas (Lote ${loteNumero})`;

    if (limpiarForm && form) {
        form.reset();
        form.querySelectorAll('select').forEach(select => { select.selectedIndex = -1; });
        renderizarCamposProcedimiento(tipoActividad);
        if (areteInput) areteInput.focus();
    }
}
// =================================================================
// LÓGICA COMPLETA DEL CALENDARIO MVZ
// =================================================================

// Reemplaza renderizarVistaCalendario
async function renderizarVistaCalendario() {
    // Primero, conectamos los botones del modal (no cambia)
    const modal = document.getElementById('modal-agregar-evento');
    const btnAbrirModal = document.getElementById('btn-abrir-modal-evento');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-evento');
    const form = document.getElementById('form-agregar-evento');

    if (btnAbrirModal) btnAbrirModal.onclick = async () => {
        form.reset();
        document.getElementById('evento-id-input').value = '';
        await cargarSelectDeRanchos(); // Carga la lista de ranchos (ya migrada)
        modal.querySelector('h2').textContent = 'Agendar Evento';
        document.getElementById('btn-guardar-evento').textContent = 'Guardar Evento';
        modal.classList.remove('hidden');
    };
    if (btnCerrarModal) btnCerrarModal.onclick = () => modal.classList.add('hidden');
    if (form) form.onsubmit = handleGuardarEvento;

    const containerCalendario = document.getElementById('calendario-visual-container');
    const containerLista = document.getElementById('lista-eventos-calendario');

    if (!containerCalendario || !containerLista) return;
    
    containerCalendario.innerHTML = '<p class="text-center text-gray-500 p-4">Cargando calendario...</p>';
    containerLista.innerHTML = '<p class="text-center text-gray-500">Cargando eventos...</p>';

    try {
        // --- CAMBIO: Usar Supabase directo ---
        const { data: eventos, error: eventosError } = await sb
            .from('eventos')
            .select('*, ranchos (nombre)') // Incluye el nombre del rancho
            .eq('mvz_id', currentUser.id)
            .gte('fecha_evento', new Date().toISOString()) 
            .order('fecha_evento', { ascending: true });
            
        if (eventosError) throw eventosError;
        // --- FIN DEL CAMBIO ---

        // 2. Dibuja la lista de "Próximos Eventos" (Muestra cómo se accede al rancho)
        if (eventos.length === 0) {
            containerLista.innerHTML = '<p class="text-center text-gray-500">No tienes eventos próximos agendados.</p>';
        } else {
            containerLista.innerHTML = eventos.map(e => {
                   const fecha = new Date(e.fecha_evento);
                   const rancho = e.nombre_rancho_texto || e.ranchos?.nombre || 'General';
                   return `
                       <div class="bg-white p-4 rounded-xl shadow-md space-y-2">
                            <div>
                                <p class="font-bold text-brand-green">${e.titulo}</p>
                                <p class="text-sm text-gray-600"><i class="fa-solid fa-house-medical w-5 text-center mr-1 text-gray-400"></i>Rancho: ${rancho}</p>
                                <p class="text-sm text-gray-600"><i class="fa-solid fa-clock w-5 text-center mr-1 text-gray-400"></i>${fecha.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}</p>
                                ${e.descripcion ? `<p class="text-xs text-gray-500 mt-2 pt-2 border-t">${e.descripcion}</p>` : ''}
                            </div>
                            <div class="flex justify-end space-x-3 pt-2 border-t border-gray-100">
                                <button onclick='handleEliminarEvento(${e.id})' class="text-sm text-red-600 font-semibold">Eliminar</button>
                                <button onclick='handleEditarEvento(${JSON.stringify(e)})' class="text-sm bg-gray-600 text-white font-semibold px-4 py-1 rounded-md">Editar</button>
                            </div>
                        </div>`;
            }).join('');
        }

        // 3. Dibuja el calendario visual (no cambia)
        if (typeof FullCalendar === 'undefined') {
            throw new Error("La librería FullCalendar no está cargada.");
        }
        
        const eventosParaCalendario = eventos.map(e => ({
            id: e.id,
            title: e.titulo,
            start: e.fecha_evento,
        }));
        
        containerCalendario.innerHTML = ''; 
        const calendario = new FullCalendar.Calendar(containerCalendario, {
            initialView: 'dayGridMonth',
            locale: 'es',
            height: 'auto',
            headerToolbar: { left: 'prev', center: 'title', right: 'next' },
            events: eventosParaCalendario,
            eventClick: function(info) {
                const eventoOriginal = eventos.find(e => e.id == info.event.id);
                if (eventoOriginal) handleEditarEvento(eventoOriginal);
            }
        });
        
        calendario.render();

    } catch (error) {
        console.error("Error al renderizar la vista del calendario:", error);
        containerCalendario.innerHTML = `<p class="text-center text-red-500 p-4">${error.message}</p>`;
        containerLista.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
    }
}

function mostrarDetalleEvento(evento) {
    const modal = document.getElementById('modal-detalle-evento');
    if (!modal) return;

    document.getElementById('detalle-evento-titulo').textContent = evento.titulo;
    
    const fecha = new Date(evento.fecha_evento);
    document.getElementById('detalle-evento-fecha').innerHTML = `<i class="fa-solid fa-clock w-5 text-center mr-1 text-gray-400"></i> ${fecha.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}`;
    
    const rancho = evento.nombre_rancho_texto || evento.ranchos?.nombre || 'General';
    document.getElementById('detalle-evento-rancho').innerHTML = `<i class="fa-solid fa-house-medical w-5 text-center mr-1 text-gray-400"></i> Rancho: ${rancho}`;
    
    const descripcionEl = document.getElementById('detalle-evento-descripcion');
    if (evento.descripcion) {
        descripcionEl.textContent = evento.descripcion;
        descripcionEl.classList.remove('hidden');
    } else {
        descripcionEl.classList.add('hidden');
    }

    document.getElementById('btn-cerrar-detalle-evento').onclick = () => modal.classList.add('hidden');
    document.getElementById('btn-eliminar-detalle-evento').onclick = () => {
        modal.classList.add('hidden');
        handleEliminarEvento(evento.id);
    };
    document.getElementById('btn-editar-detalle-evento').onclick = () => {
        modal.classList.add('hidden');
        handleEditarEvento(evento); 
    };

    modal.classList.remove('hidden');
}

async function inicializarCalendarioVisual() {
    // Espera un instante para asegurar que el DOM esté 100% listo
    await new Promise(resolve => setTimeout(resolve, 0));

    const container = document.getElementById('calendario-visual-container');
    if (!container || typeof FullCalendar === 'undefined') {
        console.error("FullCalendar no está cargado o el contenedor no existe.");
        if(container) container.innerHTML = '<p class="text-center text-red-500 text-xs p-2">Error al cargar la herramienta del calendario.</p>';
        return;
    }
    container.innerHTML = ''; // Limpia el contenedor

    try {
        // 1. Obtiene los eventos del MVZ
        const res = await fetch(`/api/eventos/mvz/${currentUser.id}`);
        if (!res.ok) throw new Error('No se pudieron cargar los eventos para el calendario');
        const eventos = await res.json();

        // 2. Transforma los eventos al formato que FullCalendar entiende
        const eventosParaCalendario = eventos.map(e => ({
            id: e.id,
            title: e.titulo,
            start: e.fecha_evento,
            extendedProps: {
                rancho: e.nombre_rancho_texto || e.ranchos?.nombre || 'General'
            }
        }));

        // 3. Configura e inicializa el calendario
        const calendario = new FullCalendar.Calendar(container, {
            initialView: 'dayGridMonth',
            locale: 'es',
            height: 'auto',
            headerToolbar: {
                left: 'prev',
                center: 'title',
                right: 'next'
            },
            events: eventosParaCalendario,
            eventClick: function(info) {
                // Al hacer clic en un evento, abre el modal de edición
                const eventoOriginal = eventos.find(e => e.id == info.event.id);
                if (eventoOriginal) {
                    handleEditarEvento(eventoOriginal);
                }
            }
        });
        
        // 4. Dibuja el calendario en la pantalla
        calendario.render();

    } catch (error) {
        console.error("Error al inicializar el calendario visual:", error);
        container.innerHTML = '<p class="text-center text-red-500 text-xs p-2">No se pudo cargar el calendario.</p>';
    }
}

async function cargarEventos() {
    const container = document.getElementById('lista-eventos-calendario');
    container.innerHTML = '<p class="text-gray-500 text-center">Cargando...</p>';
    try {
        const res = await fetch(`/api/eventos/mvz/${currentUser.id}`);
        if (!res.ok) throw new Error('No se pudieron cargar los eventos');
        const eventos = await res.json();
        if (eventos.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 mt-8">No tienes eventos próximos agendados.</p>';
        } else {
            container.innerHTML = eventos.map(e => {
                 const fecha = new Date(e.fecha_evento);
                 const rancho = e.nombre_rancho_texto || e.ranchos?.nombre || 'General';
                 // Pasamos el objeto de evento completo a las funciones
                 return `
                    <div class="bg-white p-4 rounded-xl shadow-md space-y-2">
                        <div>
                            <p class="font-bold text-brand-green">${e.titulo}</p>
                            <p class="text-sm text-gray-600"><i class="fa-solid fa-house-medical w-5 text-center mr-1 text-gray-400"></i>Rancho: ${rancho}</p>
                            <p class="text-sm text-gray-600"><i class="fa-solid fa-clock w-5 text-center mr-1 text-gray-400"></i>${fecha.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}</p>
                            ${e.descripcion ? `<p class="text-xs text-gray-500 mt-2 pt-2 border-t">${e.descripcion}</p>` : ''}
                        </div>
                        <div class="flex justify-end space-x-3 pt-2 border-t border-gray-100">
                            <button onclick='handleEliminarEvento(${e.id})' class="text-sm text-red-600 font-semibold">Eliminar</button>
                            <button onclick='handleEditarEvento(${JSON.stringify(e)})' class="text-sm bg-gray-600 text-white font-semibold px-4 py-1 rounded-md">Editar</button>
                        </div>
                    </div>`;
            }).join('');
        }
    } catch (error) {
        container.innerHTML = '<p class="text-red-500 text-center">Error al cargar eventos.</p>';
    }
}

// Reemplaza tu función cargarSelectDeRanchos
async function cargarSelectDeRanchos() {
    const select = document.getElementById('select-ranchos-evento');
    if (!select) return;
    select.innerHTML = '<option value="">Otro / No especificar</option>'; // Opción por defecto
    try {
        // --- CAMBIO: Usar Supabase directo ---
        // Le pedimos a Supabase la lista de ranchos a los que el MVZ (auth.uid()) tiene acceso
        const { data: permisos, error } = await sb
            .from('rancho_mvz_permisos')
            .select('ranchos (id, nombre)') 
            .eq('mvz_id', currentUser.id);

        if (error) throw error;
        // --- FIN DEL CAMBIO ---

        // Mapeamos los resultados (permisos) para obtener solo los datos del rancho
        const ranchos = (permisos || []).map(p => p.ranchos).filter(r => r && r.id);

        ranchos.forEach(r => {
            if(r) select.innerHTML += `<option value="${r.id}">${r.nombre}</option>`;
        });
    } catch (error) { 
        console.error('Error cargando ranchos para select:', error); 
    }
}

// Reemplaza tu función handleGuardarEvento
async function handleGuardarEvento(e) {
    e.preventDefault();
    const form = e.target;
    const btn = document.getElementById('btn-guardar-evento');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const eventoId = payload.evento_id; 

    // Decide si es una actualización (UPDATE) o una creación (INSERT)
    const isUpdating = eventoId && eventoId !== '';

    payload.mvz_id = currentUser.id;

    // Convertir rancho_id a null si está vacío, para evitar errores de tipo
    payload.rancho_id = (payload.rancho_id === '' || payload.rancho_id === null) ? null : payload.rancho_id;
    
    // Eliminamos el campo que usamos solo en el frontend
    delete payload.evento_id; 

    try {
        let dbResult;

        // --- CAMBIO: Usar Supabase directo ---
        if (isUpdating) {
            // Actualización (UPDATE)
            dbResult = await sb
                .from('eventos')
                .update(payload)
                .eq('id', eventoId); // RLS verifica si mvz_id es el usuario actual
        } else {
            // Creación (INSERT)
            dbResult = await sb
                .from('eventos')
                .insert(payload); // RLS verifica si mvz_id es el usuario actual
        }

        const { error: dbError } = dbResult;
        if (dbError) throw dbError;
        // --- FIN DEL CAMBIO ---

        mostrarMensaje('evento-mensaje', `¡Evento ${isUpdating ? 'actualizado' : 'guardado'} con éxito!`, false);
        setTimeout(() => {
            document.getElementById('modal-agregar-evento').classList.add('hidden');
            form.reset();
            // Llama a la versión migrada (que haremos después)
            renderizarVistaCalendario(); 
            cargarDashboardMVZ();
        }, 1200);
    } catch (error) {
        mostrarMensaje('evento-mensaje', error.message || 'Error inesperado', true);
    } finally {
        btn.disabled = false;
        // El texto del botón se restablece en renderizarVistaCalendario
    }
}

// INICIALIZACIÓN DE LA APLICACIÓN
    function initApp() {
        setupNavigation();

        // =================================================================
        // INICIO DE LA INTEGRACIÓN DE LISTENERS (PASO 3)
        // =================================================================
        // Usamos la variable 'appContent' (definida en la línea 40)
        // para la delegación de eventos.
        if (appContent) {

            // 1. Listener para el botón de PDF
            appContent.addEventListener('click', (e) => {
                // Si el clic ocurrió en TU botón de historial
                if (e.target.id === 'btn-generar-pdf-historial') {
                    // Llama a tu función existente (línea 1250)
                    handleGenerarPdfDeHistorial(); 
                }
            });
    
            // 2. Listener para los checkboxes
            appContent.addEventListener('change', (e) => {
                // Si el cambio ocurrió en un checkbox de sesión
                if (e.target.classList.contains('sesion-checkbox')) {
                    // Llama a la nueva función helper
                    actualizarEstadoBotonPDF(); 
                }
            });

        } else {
            console.error("Error crítico: #app-content no encontrado. Los listeners de PDF no funcionarán.");
        }
        // =================================================================
        // FIN DE LA INTEGRACIÓN
        // =================================================================

        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            try { currentUser = JSON.parse(savedUser); } catch(e){}
            iniciarSesion();
        } else {
            if (navContainer) navContainer.classList.add('hidden');
            navigateTo('login');
        }
    }
   
// =================================================================
// AÑADE ESTA NUEVA FUNCIÓN (con confirmación de permisos)
// =================================================================
window.handleConfirmarPermisoChange = async function(permisoId, selectElement, mvzNombre) {
    const nuevoPermiso = selectElement.value; // El permiso que el usuario acaba de seleccionar
    const permisoActual = selectElement.dataset.permisoActual; // El permiso que tenía ANTES del clic

    // 1. Si el usuario está intentando CAMBIAR A ADMIN
    if (nuevoPermiso === 'admin' && permisoActual !== 'admin') {
        const mensajeConfirmacion = `¿Estás seguro de que quieres dar permisos de Administrador a ${mvzNombre}?\n\nAl confirmar, este veterinario podrá:\n\n- Añadir nuevos animales.\n- Editar la información de tu ganado.\n- Eliminar animales de tu rancho.\n\nTendrá control casi total sobre los datos de tu ganado.`;
        
        if (!window.confirm(mensajeConfirmacion)) {
            // Si el usuario presiona "Cancelar", revierte el dropdown
            selectElement.value = permisoActual;
            return; // No hagas nada más
        }
        // Si presiona "Aceptar", continúa...
    }

    // 2. Si el usuario confirmó (o si está cambiando a 'basico'), guarda el cambio en Supabase
    try {
        const { error } = await sb
            .from('rancho_mvz_permisos')
            .update({ permisos: nuevoPermiso })
            .eq('id', permisoId);
            
        if (error) throw error;

        // 3. Actualiza el estado 'data-permiso-actual' en el dropdown
        selectElement.dataset.permisoActual = nuevoPermiso;
        
        // Muestra un toast/alerta de éxito (usando tu función 'showToast')
        showToast(`Permisos actualizados para ${mvzNombre}.`);

    } catch (error) { 
        alert(error.message || 'Error al actualizar el permiso.'); 
        // Si falla, revierte el dropdown al valor original
        selectElement.value = permisoActual;
    }
}
// =================================================================

// Reemplaza window.handleCompletarEvento
window.handleCompletarEvento = async function(eventoId) {
    try {
        // --- CAMBIO: Usar Supabase directo ---
        const { error } = await sb
            .from('eventos')
            .update({ completado: true })
            .eq('id', eventoId);
            
        if (error) throw error;
        // --- FIN DEL CAMBIO ---
        cargarDashboardMVZ(); // Recarga el dashboard
    } catch (error) { 
        alert(error.message || 'No se pudo completar el evento.'); 
    }
}

// Reemplaza window.handleCancelarEvento
window.handleCancelarEvento = async function(eventoId) {
    if (!confirm('¿Estás seguro de que quieres cancelar este evento?')) return;
    try {
        // --- CAMBIO: Usar Supabase directo ---
        // Simplemente borramos la fila, ya que es un evento
        const { error } = await sb
            .from('eventos')
            .delete()
            .eq('id', eventoId);
            
        if (error) throw error;
        // --- FIN DEL CAMBIO ---
        cargarDashboardMVZ(); // Recarga el dashboard
    } catch (error) { 
        alert(error.message || 'No se pudo cancelar el evento.'); 
    }
}

// ... la función initApp(); debe quedar debajo de esto
    // =================================================================
// FUNCIÓN DE AUTOCOMPLETADO PERSONALIZADO
// =================================================================
function crearAutocompletado(inputId, containerId, data) {
    const inputEl = document.getElementById(inputId);
    const containerEl = document.getElementById(containerId);

    if (!inputEl || !containerEl) return;

    inputEl.addEventListener('input', () => {
        const query = inputEl.value.toLowerCase();
        containerEl.innerHTML = ''; // Limpia sugerencias anteriores

        if (query.length === 0) {
            containerEl.classList.add('hidden');
            return;
        }

        const sugerencias = data.filter(item => item.toLowerCase().includes(query));

        if (sugerencias.length > 0) {
            sugerencias.forEach(item => {
                const divSugerencia = document.createElement('div');
                divSugerencia.className = 'p-2 cursor-pointer hover:bg-gray-100';
                divSugerencia.textContent = item;
                divSugerencia.onclick = () => {
                    inputEl.value = item; // Rellena el input
                    containerEl.classList.add('hidden'); // Oculta la lista
                };
                containerEl.appendChild(divSugerencia);
            });
            containerEl.classList.remove('hidden'); // Muestra la lista
        } else {
            containerEl.classList.add('hidden'); // Oculta si no hay sugerencias
        }
    });

    // Oculta la lista si se hace clic en cualquier otro lugar de la pantalla
    document.addEventListener('click', (e) => {
        if (e.target !== inputEl) {
            containerEl.classList.add('hidden');
        }
    });
}
// main.js - Nueva función de autocompletado con búsqueda parcial para Aretes
function crearAutocompletadoParcial(inputId, containerId, vacaIndexMap) {
    const inputEl = document.getElementById(inputId);
    const containerEl = document.getElementById(containerId);

    if (!inputEl || !containerEl) return;

    // Quitamos y volvemos a poner el listener para evitar duplicados
    inputEl.removeEventListener('input', handleInput); 
    inputEl.addEventListener('input', handleInput);

    function handleInput() {
        const query = inputEl.value.trim();
        containerEl.innerHTML = '';

        if (query.length < 3) { // Pedimos al menos 3 dígitos para empezar a sugerir
            containerEl.classList.add('hidden');
            return;
        }

        const queryLastFour = query.slice(-4); // Lógica clave: tomamos los últimos 4 dígitos
        let sugerencias = [];

        // Iteramos sobre todos los aretes indexados
        for (const [arete, datos] of vacaIndexMap.entries()) {
            // Condición: Si el arete termina con los últimos 4 dígitos escritos O incluye toda la consulta
            if (arete.endsWith(queryLastFour) || arete.includes(query)) {
                sugerencias.push({ arete: arete, raza: datos.raza });
            }
        }

        if (sugerencias.length > 0) {
            sugerencias.forEach(item => {
                const divSugerencia = document.createElement('div');
                divSugerencia.className = 'p-2 cursor-pointer hover:bg-gray-100 text-sm';
                divSugerencia.textContent = `${item.arete} (${item.raza})`;
                divSugerencia.onclick = () => {
                    inputEl.value = item.arete; // Rellena con el arete COMPLETO
                    // 🚨 Autocompleta la raza que estaba guardada en el índice
                    document.getElementById('actividad-raza').value = item.raza; 
                    containerEl.classList.add('hidden');
                };
                containerEl.appendChild(divSugerencia);
            });
            containerEl.classList.remove('hidden');
        } else {
            containerEl.classList.add('hidden');
        }
    }

    // Cerrar la lista si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (e.target !== inputEl) {
            containerEl.classList.add('hidden');
        }
    });
}
// =================================================================
// FUNCIONES PARA EDITAR Y ELIMINAR EVENTOS
// =================================================================

// Abre el modal con los datos del evento para editarlo
window.handleEditarEvento = async function(evento) {
    const modal = document.getElementById('modal-agregar-evento');
    const form = document.getElementById('form-agregar-evento');
    form.reset();
    await cargarSelectDeRanchos(); // Asegura que la lista de ranchos esté cargada

    // Rellenar el formulario con los datos del evento
    form.querySelector('#evento-id-input').value = evento.id;
    form.querySelector('[name="titulo"]').value = evento.titulo;

    // Formatear la fecha para el input datetime-local
    const fechaParaInput = new Date(evento.fecha_evento).toISOString().slice(0, 16);
    form.querySelector('[name="fecha_evento"]').value = fechaParaInput;

    form.querySelector('[name="rancho_id"]').value = evento.rancho_id || '';
    form.querySelector('[name="nombre_rancho_texto"]').value = evento.nombre_rancho_texto || '';
    form.querySelector('[name="descripcion"]').value = evento.descripcion || '';

    // Cambiar el texto del botón y el título del modal
    document.getElementById('modal-agregar-evento').querySelector('h2').textContent = 'Editar Evento';
    document.getElementById('btn-guardar-evento').textContent = 'Actualizar Evento';

    modal.classList.remove('hidden');
}

// Elimina un evento tras confirmación
// Reemplaza window.handleEliminarEvento
window.handleEliminarEvento = async function(eventoId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer.')) {
        return;
    }
    try {
        // --- CAMBIO: Usar Supabase directo ---
        const { error } = await sb
            .from('eventos')
            .delete()
            .eq('id', eventoId);

        if (error) throw error;
        // --- FIN DEL CAMBIO ---

        renderizarVistaCalendario(); // Recarga la lista del calendario
        cargarDashboardMVZ(); // Recarga el inicio por si el evento era para hoy
    } catch (error) {
        alert(error.message || 'No se pudo eliminar el evento.');
    }
}

// Sobrescribimos renderizarVistaCalendario para que resetee el botón
async function renderizarVistaCalendario() {
    // Primero, conectamos los botones del modal para que siempre funcionen
    const modal = document.getElementById('modal-agregar-evento');
    const btnAbrirModal = document.getElementById('btn-abrir-modal-evento');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-evento');
    const form = document.getElementById('form-agregar-evento');

    if (btnAbrirModal) btnAbrirModal.onclick = async () => {
        form.reset();
        document.getElementById('evento-id-input').value = '';
        await cargarSelectDeRanchos();
        modal.querySelector('h2').textContent = 'Agendar Evento';
        document.getElementById('btn-guardar-evento').textContent = 'Guardar Evento';
        modal.classList.remove('hidden');
    };
    if (btnCerrarModal) btnCerrarModal.onclick = () => modal.classList.add('hidden');
    if (form) form.onsubmit = handleGuardarEvento;

    // Ahora, vamos a buscar los datos y a dibujar todo
    const containerCalendario = document.getElementById('calendario-visual-container');
    const containerLista = document.getElementById('lista-eventos-calendario');

    if (!containerCalendario || !containerLista) return;
    
    containerCalendario.innerHTML = '<p class="text-center text-gray-500 p-4">Cargando calendario...</p>';
    containerLista.innerHTML = '<p class="text-center text-gray-500">Cargando eventos...</p>';

    try {
        // 1. Obtenemos los eventos UNA SOLA VEZ
        const res = await fetch(`/api/eventos/mvz/${currentUser.id}`);
        if (!res.ok) throw new Error('No se pudieron cargar los eventos.');
        const eventos = await res.json();

        // 2. Dibujamos la lista de "Próximos Eventos"
        if (eventos.length === 0) {
            containerLista.innerHTML = '<p class="text-center text-gray-500">No tienes eventos próximos agendados.</p>';
        } else {
            containerLista.innerHTML = eventos.map(e => {
                 const fecha = new Date(e.fecha_evento);
                 const rancho = e.nombre_rancho_texto || e.ranchos?.nombre || 'General';
                 return `
                    <div class="bg-white p-4 rounded-xl shadow-md space-y-2">
                        <div>
                            <p class="font-bold text-brand-green">${e.titulo}</p>
                            <p class="text-sm text-gray-600"><i class="fa-solid fa-house-medical w-5 text-center mr-1 text-gray-400"></i>Rancho: ${rancho}</p>
                            <p class="text-sm text-gray-600"><i class="fa-solid fa-clock w-5 text-center mr-1 text-gray-400"></i>${fecha.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}</p>
                            ${e.descripcion ? `<p class="text-xs text-gray-500 mt-2 pt-2 border-t">${e.descripcion}</p>` : ''}
                        </div>
                        <div class="flex justify-end space-x-3 pt-2 border-t border-gray-100">
                            <button onclick='handleEliminarEvento(${e.id})' class="text-sm text-red-600 font-semibold">Eliminar</button>
                            <button onclick='handleEditarEvento(${JSON.stringify(e)})' class="text-sm bg-gray-600 text-white font-semibold px-4 py-1 rounded-md">Editar</button>
                        </div>
                    </div>`;
            }).join('');
        }

        // 3. Dibujamos el calendario visual
        if (typeof FullCalendar === 'undefined') {
            throw new Error("La librería FullCalendar no está cargada.");
        }
        
        const eventosParaCalendario = eventos.map(e => ({
            id: e.id,
            title: e.titulo,
            start: e.fecha_evento,
        }));
        
        containerCalendario.innerHTML = ''; // Limpiamos el "Cargando..."
        const calendario = new FullCalendar.Calendar(containerCalendario, {
            initialView: 'dayGridMonth',
            locale: 'es',
            height: 'auto',
            headerToolbar: { left: 'prev', center: 'title', right: 'next' },
            events: eventosParaCalendario,
            eventClick: function(info) {
                const eventoOriginal = eventos.find(e => e.id == info.event.id);
                if (eventoOriginal) handleEditarEvento(eventoOriginal);
            }
        });
        
        calendario.render();

    } catch (error) {
        console.error("Error al renderizar la vista del calendario:", error);
        containerCalendario.innerHTML = `<p class="text-center text-red-500 p-4">${error.message}</p>`;
        containerLista.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
    }
}
// =================================================================
// FUNCIÓN PARA INICIALIZAR EL CALENDARIO VISUAL
// =================================================================
async function inicializarCalendarioVisual() {
    // Espera a que el DOM esté completamente listo
    await new Promise(resolve => setTimeout(resolve, 0));

    const container = document.getElementById('calendario-visual-container');
    if (!container || typeof FullCalendar === 'undefined') {
        console.error("FullCalendar no está cargado. Revisa el script en index.html.");
        container.innerHTML = '<p class="text-center text-red-500 text-xs p-2">Error al cargar la herramienta del calendario.</p>';
        return;
    }
    container.innerHTML = ''; // Limpia el contenedor

    try {
        const res = await fetch(`/api/eventos/mvz/${currentUser.id}`);
        if (!res.ok) throw new Error('No se pudieron cargar los eventos para el calendario');
        const eventos = await res.json();

        const eventosParaCalendario = eventos.map(e => ({
            id: e.id,
            title: e.titulo,
            start: e.fecha_evento,
            extendedProps: { rancho: e.nombre_rancho_texto || e.ranchos?.nombre || 'General' }
        }));

        const calendario = new FullCalendar.Calendar(container, {
            initialView: 'dayGridMonth',
            locale: 'es',
            height: 'auto', // Se ajusta al contenedor
            headerToolbar: { left: 'prev', center: 'title', right: 'next' },
            events: eventosParaCalendario,
            eventClick: function(info) {
    // Al hacer clic en un evento, ahora muestra la nueva tarjeta de detalles
    const eventoOriginal = eventos.find(e => e.id == info.event.id);
    if (eventoOriginal) {
        mostrarDetalleEvento(eventoOriginal);
    }
}
        });

        calendario.render();

    } catch (error) {
        console.error("Error al inicializar el calendario visual:", error);
        container.innerHTML = '<p class="text-center text-red-500 text-xs p-2">No se pudo cargar el calendario.</p>';
    }
}
// --- PEGA ESTAS DOS NUEVAS FUNCIONES al final de tu main.js, antes de initApp() ---
// Reemplaza window.handleRevocarAccesoMvz
window.handleRevocarAccesoMvz = async function(permisoId) {
    if (!confirm('¿Estás seguro de que quieres revocar el acceso a este veterinario?')) return;
    try {
        // --- CAMBIO: Usar Supabase directo ---
        const { error } = await sb
            .from('rancho_mvz_permisos')
            .delete()
            .eq('id', permisoId);
            
        if (error) throw error;
        // --- FIN DEL CAMBIO ---
        
        renderizarVistaMiMvz(); // Recarga la lista
    } catch (error) { 
        alert(error.message || 'Error al revocar el acceso.'); 
    }
}

// =================================================================
// FUNCIONES PARA FILTRAR LA LISTA DE GANADO (VERSIÓN CORREGIDA)
// =================================================================

function setupFiltrosDeGanado() {
    const btnSexo = document.getElementById('filtro-btn-sexo');
    const btnLote = document.getElementById('filtro-btn-lote');
    const btnRaza = document.getElementById('filtro-btn-raza');

    if (btnSexo) btnSexo.onclick = () => {
        const opciones = ['Hembra', 'Macho'];
        abrirModalDeFiltro('sexo', opciones, 'Selecciona un Sexo');
    };

    if (btnLote) btnLote.onclick = () => {
        const lotesUnicos = [...new Set(listaCompletaDeVacas.map(v => v.lote).filter(Boolean))].sort((a,b) => a - b);
        abrirModalDeFiltro('lote', lotesUnicos.map(l => `Lote ${l}`), 'Selecciona un Lote');
    };

    if (btnRaza) btnRaza.onclick = () => {
        const razasUnicas = [...new Set(listaCompletaDeVacas.map(v => v.raza).filter(Boolean))].sort();
        abrirModalDeFiltro('raza', razasUnicas, 'Selecciona una Raza');
    };

    const busquedaInput = document.getElementById('filtro-busqueda-ganado');
    if (busquedaInput) busquedaInput.addEventListener('input', aplicarFiltrosDeGanado);
}

function abrirModalDeFiltro(tipoFiltro, opciones, titulo) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1002]';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    const contenido = document.createElement('div');
    contenido.className = 'bg-white rounded-xl shadow-lg p-4 w-11/12 max-w-xs';
    contenido.innerHTML = `<h3 class="font-bold text-lg mb-4">${titulo}</h3>`;

    const btnQuitar = document.createElement('div');
    btnQuitar.className = 'p-2 text-center text-red-600 font-semibold cursor-pointer border rounded-lg mb-2';
    btnQuitar.textContent = 'Quitar Filtro';
    btnQuitar.onclick = () => {
        filtrosActivos[tipoFiltro] = '';
        aplicarFiltrosDeGanado();
        modal.remove();
    };
    contenido.appendChild(btnQuitar);

    opciones.forEach(opcion => {
        const btnOpcion = document.createElement('div');
        btnOpcion.className = 'p-3 cursor-pointer hover:bg-gray-100 border-b';
        btnOpcion.textContent = opcion;
        btnOpcion.onclick = (e) => {
            e.stopPropagation();
            filtrosActivos[tipoFiltro] = tipoFiltro === 'lote' ? opcion.replace('Lote ', '') : opcion;
            aplicarFiltrosDeGanado();
            modal.remove();
        };
        contenido.appendChild(btnOpcion);
    });

    modal.appendChild(contenido);
    document.body.appendChild(modal);
}

function aplicarFiltrosDeGanado() {
    const busqueda = document.getElementById('filtro-busqueda-ganado').value.toLowerCase();
    const { sexo, lote, raza } = filtrosActivos;

    let vacasFiltradas = [...listaCompletaDeVacas];

    if (busqueda) {
        vacasFiltradas = vacasFiltradas.filter(v => 
            v.numero_siniiga?.toLowerCase().includes(busqueda) ||
            v.numero_pierna?.toLowerCase().includes(busqueda)
        );
    }
    if (sexo) {
        vacasFiltradas = vacasFiltradas.filter(v => v.sexo === sexo);
    }
    if (lote) {
        vacasFiltradas = vacasFiltradas.filter(v => v.lote == lote);
    }
    if (raza) {
        vacasFiltradas = vacasFiltradas.filter(v => v.raza === raza);
    }

    const btnSexo = document.getElementById('filtro-btn-sexo');
    const btnLote = document.getElementById('filtro-btn-lote');
    const btnRaza = document.getElementById('filtro-btn-raza');

    if (btnSexo) btnSexo.classList.toggle('activo', !!sexo);
    if (btnLote) btnLote.classList.toggle('activo', !!lote);
    if (btnRaza) btnRaza.classList.toggle('activo', !!raza);

    // --- AÑADE ESTE BLOQUE CLAVE ---
    const totalVacasEl = document.getElementById('total-vacas-header');
    if (totalVacasEl) {
        // Actualizamos el contador con el número exacto de vacas filtradas
        totalVacasEl.textContent = vacasFiltradas.length;
    }
    // ¡¡AQUÍ ESTÁ LA CORRECCIÓN!! El nombre de la función es renderizarListaDeVacas
    renderizarListaDeVacas(vacasFiltradas);
}

// =================================================================
// FUNCIÓN PARA DIBUJAR LA LISTA DE VACAS CON EL NUEVO DISEÑO
// =================================================================
function renderizarListaDeVacas(vacas) {
    const container = document.getElementById('lista-vacas-container');
    if (!container) return;

    if (!vacas || vacas.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 mt-8 bg-white p-6 rounded-xl shadow-md">No se encontraron animales con esos filtros.</p>';
        return;
    }

    container.innerHTML = vacas.map(vaca => `
        <div class="bg-white rounded-xl shadow-md overflow-hidden">
            <img src="${vaca.foto_url || 'https://via.placeholder.com/300x200'}" alt="Foto de ${vaca.nombre}" class="w-full h-40 object-cover">
            <div class="p-4">
                <div class="flex justify-between items-start">
                    <h3 class="text-xl font-bold text-gray-900">${vaca.nombre}</h3>
                    <div class="flex items-center space-x-3">
                        <button onclick='handleEditarVaca(${JSON.stringify(vaca)})' class="text-gray-500 hover:text-blue-600" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                        <button onclick='handleEliminarVaca(${vaca.id})' class="text-gray-500 hover:text-red-600" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
                <div class="text-sm text-gray-600 mt-2 space-y-1">
                    <p><strong>Raza:</strong> ${vaca.raza || 'N/A'}</p>
                    <p><strong>Lote:</strong> ${vaca.lote || 'Sin asignar'}</p>
                    <p><strong>ID (Arete):</strong> #${vaca.numero_siniiga}</p>
                </div>
                <button onclick="verHistorialVaca(${vaca.id}, '${vaca.nombre}')" class="w-full bg-green-100 text-green-800 font-semibold p-2 rounded-lg mt-4 hover:bg-green-200 transition">
                    Ver Detalles
                </button>
            </div>
        </div>
    `).join('');
}

// =================================================================
// FUNCIONES PARA EDITAR Y ELIMINAR VACAS
// =================================================================
window.handleEditarVaca = function(vaca) {
    const modal = document.getElementById('modal-agregar-vaca');
    const form = document.getElementById('form-agregar-vaca');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('file-name-display').textContent = '';

    // Rellenar el formulario
    form.querySelector('#vaca-id-input').value = vaca.id;
    form.querySelector('#vaca-nombre').value = vaca.nombre || '';
    form.querySelector('#vaca-siniiga').value = vaca.numero_siniiga || '';
    form.querySelector('#vaca-pierna').value = vaca.numero_pierna || '';
    form.querySelector('#vaca-lote').value = vaca.lote || '';
    form.querySelector('#vaca-raza').value = vaca.raza || '';
    form.querySelector('#vaca-nacimiento').value = vaca.fecha_nacimiento || '';
    calcularYMostrarEdad(vaca.fecha_nacimiento || '');
    form.querySelector('#vaca-padre').value = vaca.padre || '';
    form.querySelector('#vaca-madre').value = vaca.madre || '';
    form.querySelector('#vaca-origen').value = vaca.origen || 'Natural';

    // Seleccionar el sexo
    const sexo = vaca.sexo || 'Hembra';
    const sexoInput = document.getElementById('vaca-sexo');
    const sexoSelector = document.getElementById('sexo-selector');
    sexoInput.value = sexo;
    sexoSelector.querySelectorAll('button').forEach(btn => {
        if (btn.dataset.value === sexo) {
            btn.classList.add('bg-brand-green', 'text-white');
            btn.setAttribute('aria-pressed', 'true');
        } else {
            btn.classList.remove('bg-brand-green', 'text-white');
            btn.setAttribute('aria-pressed', 'false');
        }
    });

    // Conecta el botón 'X' para cerrar
    const btnCerrar = modal.querySelector('#btn-cerrar-modal-vaca');
   if (btnCerrar) btnCerrar.onclick = () => modal.classList.add('hidden');

    // Configura el modal para "EDITAR"
    modal.querySelector('#modal-vaca-titulo').textContent = 'Editar Animal';
    document.getElementById('btn-guardar-siguiente-vaca').style.display = 'none'; // Oculta "Guardar y Siguiente"

    const btnFinalizar = document.getElementById('btn-finalizar-registro-vaca');
    btnFinalizar.textContent = 'Actualizar Cambios';
    btnFinalizar.onclick = () => handleGuardarVaca(true); // Siempre cierra al editar

    // Conecta las funciones auxiliares
    conectarAyudantesFormVaca();

    modal.classList.remove('hidden');
}

// Reemplaza window.handleEliminarVaca
window.handleEliminarVaca = async function(vacaId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este animal? Esta acción no se puede deshacer.')) return;
    
    try {
        // --- CAMBIO: Usar Supabase directo ---
        const { error } = await sb
            .from('vacas')
            .delete()
            .eq('id', vacaId); // RLS verifica si eres el dueño y si puedes borrar
            
        if (error) throw error;
        // --- FIN DEL CAMBIO ---

        // Actualizamos la lista local eliminando la vaca borrada
        listaCompletaDeVacas = listaCompletaDeVacas.filter(v => v.id !== vacaId);
        aplicarFiltrosDeGanado();
        
    } catch (error) {
        alert(error.message || 'Error inesperado al eliminar la vaca.');
    }
}
async function renderizarVistaCalendarioPropietario() {
    await inicializarCalendarioPropietario();
}

async function inicializarCalendarioPropietario() {
    const container = document.getElementById('calendario-propietario-container');
    const listaEventosEl = document.getElementById('lista-eventos-propietario');
    const ranchoId = currentUser?.ranchos?.[0]?.id;

    if (!container || !ranchoId) return;
    container.innerHTML = '';

    try {
        // Obtenemos los eventos del rancho desde el servidor
        const res = await fetch(`/api/rancho/${ranchoId}/eventos-proximos`);
        const eventos = await res.json();
        
        // Dibuja la lista de eventos
        if (listaEventosEl) {
            if (eventos.length === 0) {
                listaEventosEl.innerHTML = '<p class="text-center text-gray-500">No hay eventos programados.</p>';
            } else {
                listaEventosEl.innerHTML = eventos.map(e => `...`).join(''); // Lógica para dibujar cada evento
            }
        }

        // Transforma los eventos para el calendario visual
        const eventosParaCalendario = eventos.map(e => ({
            id: e.id,
            title: e.titulo,
            start: e.fecha_evento
        }));

        // Inicializa FullCalendar
        const calendario = new FullCalendar.Calendar(container, {
            initialView: 'dayGridMonth',
            locale: 'es',
            events: eventosParaCalendario,
            // ... más opciones ...
        });
        
        calendario.render();

    } catch (error) {
        console.error("Error al inicializar calendario del propietario:", error);
        container.innerHTML = '<p class="text-red-500">No se pudo cargar el calendario.</p>';
    }
}
// =================================================================
// FUNCIÓN PARA MOSTRAR LA TARJETA DE DETALLE DEL EVENTO
// =================================================================
function mostrarDetalleEvento(evento) {
    const modal = document.getElementById('modal-detalle-evento');
    if (!modal) return;

    // Llenar los datos de la tarjeta
    document.getElementById('detalle-evento-titulo').textContent = evento.titulo;

    const fecha = new Date(evento.fecha_evento);
    document.getElementById('detalle-evento-fecha').innerHTML = `<i class="fa-solid fa-clock w-5 text-center mr-1 text-gray-400"></i> ${fecha.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}`;

    const rancho = evento.nombre_rancho_texto || evento.ranchos?.nombre || 'General';
    document.getElementById('detalle-evento-rancho').innerHTML = `<i class="fa-solid fa-house-medical w-5 text-center mr-1 text-gray-400"></i> Rancho: ${rancho}`;

    const descripcionEl = document.getElementById('detalle-evento-descripcion');
    if (evento.descripcion) {
        descripcionEl.textContent = evento.descripcion;
        descripcionEl.classList.remove('hidden');
    } else {
        descripcionEl.classList.add('hidden');
    }

    // Conectar los botones de la tarjeta
    document.getElementById('btn-cerrar-detalle-evento').onclick = () => modal.classList.add('hidden');
    document.getElementById('btn-eliminar-detalle-evento').onclick = () => {
        modal.classList.add('hidden');
        handleEliminarEvento(evento.id);
    };
    document.getElementById('btn-editar-detalle-evento').onclick = () => {
        modal.classList.add('hidden');

        // Reutilizamos la función que ya teníamos para editar
        handleEditarEvento(evento); 
    };

    // Mostrar la tarjeta
    modal.classList.remove('hidden');
}
// =================================================================
// LÓGICA PARA LA PANTALLA DE AJUSTES DEL PROPIETARIO
// =================================================================
let selectedRanchoLogoFile = null; // Variable para guardar el archivo de imagen seleccionado

function renderizarVistaAjustesPropietario() {
    // 1. Cargar los datos actuales en los campos del formulario
    const nombreInput = document.getElementById('ajustes-nombre-propietario');
    const emailInput = document.getElementById('ajustes-email-propietario');
    const ranchoInput = document.getElementById('ajustes-rancho-nombre');
    const ranchoLogoPreview = document.getElementById('ajustes-rancho-logo-preview');
    const ranchoLogoInput = document.getElementById('ajustes-rancho-logo-input');
    const btnSeleccionarLogo = document.getElementById('btn-seleccionar-logo');

    if (nombreInput) nombreInput.value = currentUser.nombre || '';
    if (emailInput) emailInput.value = currentUser.email || '';
    if (ranchoInput && currentUser.ranchos?.[0]) {
        ranchoInput.value = currentUser.ranchos[0].nombre || '';
    }
    // Añadimos un timestamp para asegurarnos de que el navegador no use el caché viejo
if (ranchoLogoPreview && currentUser.ranchos?.[0]?.logo_url) {
    const originalUrl = currentUser.ranchos[0].logo_url;
    ranchoLogoPreview.src = originalUrl.includes('?') 
        ? `${originalUrl}&t=${Date.now()}` 
        : `${originalUrl}?t=${Date.now()}`;
}
    // 2. Conectar los eventos para la subida de logo
    if (btnSeleccionarLogo && ranchoLogoInput) {
        btnSeleccionarLogo.onclick = () => ranchoLogoInput.click(); // Al hacer clic en el botón, activa el input de archivo
        ranchoLogoInput.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                selectedRanchoLogoFile = file; // Guardar el archivo seleccionado
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (ranchoLogoPreview) ranchoLogoPreview.src = e.target.result; // Previsualizar la imagen
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // 3. Conectar los botones de guardar y cerrar sesión
    const btnGuardar = document.getElementById('btn-guardar-ajustes-propietario');
    const btnLogout = document.getElementById('btn-logout-ajustes');
    const btnCambiarPassword = document.getElementById('btn-cambiar-password'); // Asumiendo que ya lo tienes del template anterior

    if (btnGuardar) btnGuardar.onclick = handleGuardarAjustesPropietario;
    if (btnLogout) btnLogout.onclick = logout;
    if (btnCambiarPassword) btnCambiarPassword.onclick = () => mostrarAlerta('info', 'Funcionalidad de cambio de contraseña', 'Esta funcionalidad aún no está implementada. ¡Pronto estará disponible!'); // Placeholder
}

// Reemplaza tu función handleGuardarAjustesPropietario
// Reemplaza tu función handleGuardarAjustesPropietario
async function handleGuardarAjustesPropietario() {
    const btnGuardar = document.getElementById('btn-guardar-ajustes-propietario');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    const nuevoNombre = document.getElementById('ajustes-nombre-propietario').value;
    const nuevoNombreRancho = document.getElementById('ajustes-rancho-nombre').value;
    const ranchoId = currentUser.ranchos?.[0]?.id;

    try {
        const updates = [];
        let logoUrl = currentUser.ranchos?.[0]?.logo_url;
        let ranchoActualizado = currentUser.ranchos?.[0];

        // 1. Actualizar el nombre del usuario
        updates.push(sb
            .from('usuarios')
            .update({ nombre: nuevoNombre })
            .eq('id', currentUser.id)
            .select()
            .single()
        );

        // 2. Actualizar el nombre del rancho
        if (ranchoId) {
            updates.push(sb
                .from('ranchos')
                .update({ nombre: nuevoNombreRancho })
                .eq('id', ranchoId)
                .select()
                .single()
            );
        }

        // 3. Subir y actualizar el logo del rancho (si se seleccionó un nuevo archivo)
        if (selectedRanchoLogoFile && ranchoId) {
    const file = selectedRanchoLogoFile;
    const filePath = `logos/${ranchoId}/logo_${Date.now()}_${file.name}`;

    // 3a. Subir archivo al Storage (bucket 'ranchos_logos')
    const { error: uploadError } = await sb.storage
        .from('ranchos_logos')
        .upload(filePath, file);

    if (uploadError) throw new Error(`Error al subir logo: ${uploadError.message}`);
    
    // 3b. Obtener URL pública
    const { data: urlData } = sb.storage
        .from('ranchos_logos')
        .getPublicUrl(filePath);
    
    logoUrl = urlData.publicUrl;
    
    // <<< 🐛 LÍNEA DE DEBUG CRÍTICA 🐛 >>>
    console.log("DEBUG: URL de Storage generada:", logoUrl); 
    // <<< --------------------------- >>>

    // 3c. Actualizar la URL en la tabla 'ranchos'
    updates.push(sb
        .from('ranchos')
        .update({ logo_url: logoUrl })
        .eq('id', ranchoId)
        .select()
        .single()
    );
}
        // Esperar a que todas las promesas de actualización se completen
        const results = await Promise.all(updates);

        // Procesar resultados y actualizar currentUser
        let usuarioActualizado = {};
        for (const res of results) {
            if (res.data) {
                // Si la fila actualizada tiene columna 'rol' (es un usuario)
                if (res.data.rol) {
                    usuarioActualizado = res.data;
                } 
                // Si la fila actualizada tiene columna 'propietario_id' (es un rancho)
                else if (res.data.propietario_id) {
                    ranchoActualizado = { ...ranchoActualizado, ...res.data };
                }
            }
        }

        // <<< 🐛 LÍNEA DE DEBUG CRÍTICA 🐛 >>>
console.log("DEBUG: Intentando actualizar localmente el logo a:", ranchoActualizado?.logo_url || logoUrl);
        
        // Actualizar datos locales
        currentUser.nombre = usuarioActualizado.nombre || currentUser.nombre;
        if (ranchoId) {
            currentUser.ranchos[0] = ranchoActualizado;
        }
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        selectedRanchoLogoFile = null;

        mostrarMensaje('ajustes-mensaje', '¡Cambios guardados con éxito!', false);
        
        // Refrescar el dashboard para ver los cambios de nombre/logo
        setTimeout(() => navigateTo('inicio-propietario'), 1000);

    } catch (error) {
        console.error("Error al guardar ajustes:", error);
        mostrarMensaje('ajustes-mensaje', error.message || 'Error de permisos al guardar.', true);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Cambios';
    }
}
// =================================================================
// LÓGICA PARA LA PANTALLA DE AJUSTES DEL MVZ
// =================================================================

function renderizarVistaAjustesMvz() {
    // 1. Cargar datos actuales
    const nombreInput = document.getElementById('ajustes-nombre-mvz');
    const emailInput = document.getElementById('ajustes-email-mvz');
    const cedulaInput = document.getElementById('ajustes-cedula-mvz');
    const especialidadInput = document.getElementById('ajustes-especialidad-mvz');
    const avatarPreview = document.getElementById('ajustes-mvz-avatar-preview');
    const avatarInput = document.getElementById('ajustes-mvz-avatar-input');
    const btnSeleccionarAvatar = document.getElementById('btn-seleccionar-avatar-mvz');

    if (nombreInput) nombreInput.value = currentUser.nombre || '';
    if (emailInput) emailInput.value = currentUser.email || '';
    if (avatarPreview) avatarPreview.src = currentUser.avatar_url || 'assets/avatar_mvz_default.png';
    
    if (currentUser.info_profesional) {
        if (cedulaInput) cedulaInput.value = currentUser.info_profesional.cedula || '';
        if (especialidadInput) especialidadInput.value = currentUser.info_profesional.especialidad || '';
    }
    

    // 2. Conectar eventos de la foto
    if (btnSeleccionarAvatar && avatarInput) {
        btnSeleccionarAvatar.onclick = () => avatarInput.click();
        avatarInput.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                selectedMvzAvatarFile = file;
                const reader = new FileReader();
                reader.onload = (e) => { if (avatarPreview) avatarPreview.src = e.target.result; };
                reader.readAsDataURL(file);
            }
        };
    }

    // 3. Conectar otros botones
    const btnGuardar = document.getElementById('btn-guardar-ajustes-mvz');
    const btnLogout = document.getElementById('btn-logout-ajustes-mvz');
    const btnCambiarPassword = document.getElementById('btn-cambiar-password-mvz');

    if (btnGuardar) btnGuardar.onclick = handleGuardarAjustesMvz;
    if (btnLogout) btnLogout.onclick = logout;
    if (btnCambiarPassword) btnCambiarPassword.onclick = () => { alert('Funcionalidad de cambio de contraseña en construcción.'); };
}

// Reemplaza tu función handleGuardarAjustesMvz
async function handleGuardarAjustesMvz() {
    const btnGuardar = document.getElementById('btn-guardar-ajustes-mvz');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
        let avatarUrl = currentUser.avatar_url; // URL actual
        const nuevoNombre = document.getElementById('ajustes-nombre-mvz').value;
        const nuevaCedula = document.getElementById('ajustes-cedula-mvz').value;
        const nuevaEspecialidad = document.getElementById('ajustes-especialidad-mvz').value;
        const infoProfesional = { cedula: nuevaCedula, especialidad: nuevaEspecialidad };

        // 1. Subir nueva foto de perfil si existe (directo a Supabase Storage)
        if (selectedMvzAvatarFile) {
            const file = selectedMvzAvatarFile;
            const filePath = `avatars/usuario_${currentUser.id}_${Date.now()}`;

            const { error: uploadError } = await sb.storage
                .from('avatars') // Asumiendo que el bucket 'avatars' tiene política INSERT
                .upload(filePath, file);
            
            if (uploadError) throw new Error(`Error al subir avatar: ${uploadError.message}`);

            const { data: urlData } = sb.storage
                .from('avatars')
                .getPublicUrl(filePath);
            
            avatarUrl = urlData.publicUrl;
        }

        // 2. Actualizar datos de texto y la URL del avatar en la tabla 'usuarios'
        const updatePayload = { 
            nombre: nuevoNombre, 
            info_profesional: infoProfesional, 
            avatar_url: avatarUrl 
        };

        const { data: usuarioActualizado, error: userError } = await sb
            .from('usuarios')
            .update(updatePayload)
            .eq('id', currentUser.id)
            .select()
            .single();

        if (userError) throw userError;

        // 3. Actualizar currentUser y limpiar
        currentUser = { ...currentUser, ...usuarioActualizado };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        selectedMvzAvatarFile = null; 

        mostrarMensaje('ajustes-mvz-mensaje', '¡Cambios guardados con éxito!', false);

    } catch (error) {
        console.error("Error al guardar ajustes MVZ:", error);
        mostrarMensaje('ajustes-mvz-mensaje', error.message || 'Error de permisos al guardar.', true);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Cambios';
    }
}

// =================================================================
// LÓGICA PARA LA PANTALLA DE AJUSTES DEL MVZ
// =================================================================

function renderizarVistaAjustesMvz() {
    // 1. Cargar datos actuales
    const nombreInput = document.getElementById('ajustes-nombre-mvz');
    const emailInput = document.getElementById('ajustes-email-mvz');
    const cedulaInput = document.getElementById('ajustes-cedula-mvz');
    const especialidadInput = document.getElementById('ajustes-especialidad-mvz');
    const avatarPreview = document.getElementById('ajustes-mvz-avatar-preview');
    const avatarInput = document.getElementById('ajustes-mvz-avatar-input');
    const btnSeleccionarAvatar = document.getElementById('btn-seleccionar-avatar-mvz');

    if (nombreInput) nombreInput.value = currentUser.nombre || '';
    if (emailInput) emailInput.value = currentUser.email || '';
    if (avatarPreview) avatarPreview.src = currentUser.avatar_url || 'assets/avatar_mvz_default.png';

    if (currentUser.info_profesional) {
        if (cedulaInput) cedulaInput.value = currentUser.info_profesional.cedula || '';
        if (especialidadInput) especialidadInput.value = currentUser.info_profesional.especialidad || '';
    }

    // 2. Conectar eventos de la foto
    if (btnSeleccionarAvatar && avatarInput) {
        btnSeleccionarAvatar.onclick = () => avatarInput.click();
        avatarInput.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                selectedMvzAvatarFile = file;
                const reader = new FileReader();
                reader.onload = (e) => { if (avatarPreview) avatarPreview.src = e.target.result; };
                reader.readAsDataURL(file);
            }
        };
    }

    // 3. Conectar otros botones
    const btnGuardar = document.getElementById('btn-guardar-ajustes-mvz');
    const btnLogout = document.getElementById('btn-logout-ajustes-mvz');
    const btnCambiarPassword = document.getElementById('btn-cambiar-password-mvz');

    if (btnGuardar) btnGuardar.onclick = handleGuardarAjustesMvz;
    if (btnLogout) btnLogout.onclick = logout;
    if (btnCambiarPassword) btnCambiarPassword.onclick = () => { alert('Funcionalidad de cambio de contraseña en construcción.'); };
}

// Pega esta función en CUALQUIER LUGAR de tu main.js (afuera de otra función)
function conectarAyudantesFormVaca() {
    // 1. Conectar selector de SEXO
    const sexoSelector = document.getElementById('sexo-selector');
    const sexoInput = document.getElementById('vaca-sexo');
    if (sexoSelector && sexoInput) {
        sexoSelector.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                // Deselecciona el botón activo
                sexoSelector.querySelector('.bg-brand-green')?.classList.remove('bg-brand-green', 'text-white');
                // Selecciona el nuevo
                btn.classList.add('bg-brand-green', 'text-white');
                sexoInput.value = btn.dataset.value;
            };
        });
    }

    // 2. Conectar autocompletado de RAZA
    // (Tú ya tienes la función 'crearAutocompletado' y 'RAZAS_BOVINAS' en tu main.js)
    crearAutocompletado('vaca-raza', 'sugerencias-vaca-raza-container', RAZAS_BOVINAS);

    // 3. Conectar cálculo de EDAD
    const nacimientoInput = document.getElementById('vaca-nacimiento');
    const edadInput = document.getElementById('vaca-edad');
    if (nacimientoInput && edadInput) {
        nacimientoInput.onchange = () => {
            if (!nacimientoInput.value) {
                edadInput.value = '';
                return;
            }
            try {
                const nacimiento = new Date(nacimientoInput.value + 'T00:00:00-06:00'); // Asume zona horaria local
                const hoy = new Date();
                if (nacimiento > hoy) {
                    edadInput.value = 'Fecha futura';
                    return;
                }
                let edadMeses = (hoy.getFullYear() - nacimiento.getFullYear()) * 12;
                edadMeses -= nacimiento.getMonth();
                edadMeses += hoy.getMonth();
                if (hoy.getDate() < nacimiento.getDate()) edadMeses--;
        
                const anios = Math.floor(edadMeses / 12);
                const meses = edadMeses % 12;
                edadInput.value = `${anios} años y ${meses} meses`;
            } catch(e) {
                edadInput.value = 'Fecha inválida';
            }
        };
    }

    // 4. Conectar nombre de archivo de FOTO (para el nuevo diseño)
    const fotoInput = document.getElementById('vaca-foto');
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fotoInput && fileNameDisplay) {
        fotoInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                fileNameDisplay.textContent = file.name; // Muestra el nombre
                fileNameDisplay.classList.remove('text-gray-500');
                fileNameDisplay.classList.add('text-brand-green', 'font-semibold');
            } else {
                fileNameDisplay.innerHTML = '<span class="font-semibold">Click para subir</span> o arrastra'; // Vuelve al default
                fileNameDisplay.classList.add('text-gray-500');
                fileNameDisplay.classList.remove('text-brand-green', 'font-semibold');
            }
        };
    }
}

// =================================================================
// NUEVA FUNCIÓN HELPER para Calcular y Mostrar Edad
// =================================================================
function calcularYMostrarEdad(fechaNacimientoStr) {
    const edadInput = document.getElementById('vaca-edad');
    if (!edadInput) return; // Salir si el campo Edad no existe

    if (!fechaNacimientoStr) {
        edadInput.value = ''; // Limpiar si no hay fecha
        return;
    }

    try {
        // Asegura que la fecha se interprete correctamente (YYYY-MM-DD)
        const nacimiento = new Date(fechaNacimientoStr + 'T00:00:00Z'); // Interpreta como UTC
        const hoy = new Date();

        // Validaciones básicas
        if (isNaN(nacimiento.getTime())) {
             edadInput.value = 'Fecha inválida';
             return;
        }
         if (nacimiento > hoy) {
            edadInput.value = 'Fecha futura';
            return;
        }

        // Cálculo de edad (igual que antes)
        let edadMeses = (hoy.getFullYear() - nacimiento.getFullYear()) * 12;
        edadMeses -= nacimiento.getMonth();
        edadMeses += hoy.getMonth();
         // Ajuste si aún no cumple el día del mes
         if (hoy.getDate() < nacimiento.getDate()) {
             // Si estamos en el mismo mes y año, pero el día es anterior, son 0 meses
             if (edadMeses === 0 && hoy.getFullYear() === nacimiento.getFullYear() && hoy.getMonth() === nacimiento.getMonth()) {
                 // Caso especial: menos de un mes de edad
             } else {
                 edadMeses--; // Si no, simplemente resta un mes
             }
         }
         // Asegurarse de que edadMeses no sea negativo si es muy joven
         if (edadMeses < 0) edadMeses = 0;


        const anios = Math.floor(edadMeses / 12);
        const meses = edadMeses % 12;

        if (anios > 0) {
             edadInput.value = `${anios} año${anios > 1 ? 's' : ''}${meses > 0 ? ` y ${meses} mes${meses > 1 ? 'es' : ''}` : ''}`;
        } else {
             edadInput.value = `${meses} mes${meses > 1 ? 'es' : ''}`;
        }


    } catch(e) {
        console.error("Error calculando edad:", e);
        edadInput.value = 'Error cálculo';
    }
}
// =====================================================================

// =================================================================
// FUNCIÓN PARA GUARDAR O ACTUALIZAR VACA (¡LA QUE FALTABA!)
// =================================================================
// Reemplaza tu función window.handleGuardarVaca con esta nueva versión
window.handleGuardarVaca = async function(cerrarAlFinalizar) {
    const form = document.getElementById('form-agregar-vaca');
    const btnSiguiente = document.getElementById('btn-guardar-siguiente-vaca');
    const btnFinalizar = document.getElementById('btn-finalizar-registro-vaca');

    if (btnSiguiente) btnSiguiente.disabled = true;
    if (btnFinalizar) btnFinalizar.disabled = true;
    mostrarMensaje('vaca-mensaje', 'Procesando...', false); // Mensaje inicial

    const nombre = form.querySelector('#vaca-nombre').value;
    const siniiga = form.querySelector('#vaca-siniiga').value;

    if (!nombre || !siniiga) {
        mostrarMensaje('vaca-mensaje', 'Nombre y SINIIGA son obligatorios.');
        if (btnSiguiente) btnSiguiente.disabled = false;
        if (btnFinalizar) btnFinalizar.disabled = false;
        return;
    }

    const vacaId = form.querySelector('#vaca-id-input').value;
    const isUpdating = vacaId && vacaId !== '';
    const debeCerrar = isUpdating || cerrarAlFinalizar;
    let fotoUrl = null; // Variable para la URL de la foto

    try {
        // --- ¡AQUÍ ESTÁ EL CAMBIO! ---

        // PASO 1: Subir la foto (SI HAY UNA NUEVA)
        const fotoInput = form.querySelector('#vaca-foto');
        const file = fotoInput.files[0];
        if (file) {
            console.log('Intentando subir foto a Supabase Storage...');
            // Nombre único para el archivo en Storage
            const filePath = `vacas/${currentUser.id}_${Date.now()}`;

            // Subimos directo al bucket 'fotos-ganado' (debe ser privado y tener políticas)
            const { error: uploadError } = await sb.storage
                .from('fotos-ganado')
                .upload(filePath, file);

            if (uploadError) {
                console.error("Error de Supabase Storage al subir foto:", uploadError);
                throw new Error(`Error al subir foto: ${uploadError.message}`);
            }

            // Obtenemos la URL pública para guardarla en la tabla 'vacas'
            const { data: urlData } = sb.storage
                .from('fotos-ganado')
                .getPublicUrl(filePath);

            fotoUrl = urlData.publicUrl;
            console.log('Foto subida, URL:', fotoUrl);
        } else {
            console.log('No se seleccionó foto nueva.');
            // Si estamos editando y no hay foto nueva, mantenemos la URL existente (si la hay)
            if (isUpdating) {
                // Necesitamos obtener la URL actual de la vaca que estamos editando
                const vacaActual = listaCompletaDeVacas.find(v => v.id == vacaId);
                fotoUrl = vacaActual?.foto_url; // Mantiene la URL si ya existía
            }
        }

        // PASO 2: Preparar los datos para la TABLA 'vacas'
        const datosVaca = {
            nombre: nombre,
            numero_siniiga: siniiga,
            numero_pierna: form.querySelector('#vaca-pierna').value || null,
            sexo: form.querySelector('#vaca-sexo').value || null,
            raza: form.querySelector('#vaca-raza').value || null,
            fecha_nacimiento: form.querySelector('#vaca-nacimiento').value || null,
            padre: form.querySelector('#vaca-padre').value || null,
            madre: form.querySelector('#vaca-madre').value || null,
            origen: form.querySelector('#vaca-origen').value || null,
            lote: form.querySelector('#vaca-lote').value || null,
            // Incluimos la fotoUrl SOLO si tenemos una (nueva o existente)
            ...(fotoUrl && { foto_url: fotoUrl })
        };

        // Si es una NUEVA vaca, añadimos los IDs de propietario y rancho
        if (!isUpdating) {
            datosVaca.id_usuario = currentUser.id; // RLS usará esto
            datosVaca.rancho_id = currentUser.ranchos?.[0]?.id; // RLS usará esto
            // Asegurarnos de que rancho_id no sea undefined
             if (!datosVaca.rancho_id) {
                 throw new Error("No se pudo determinar el rancho para la nueva vaca.");
             }
        }

        // PASO 3: Guardar los datos en la TABLA 'vacas'
        let dbResult;
        console.log(`Intentando ${isUpdating ? 'actualizar' : 'insertar'} datos en tabla 'vacas':`, datosVaca);
        if (isUpdating) {
            // Si es ACTUALIZACIÓN
            dbResult = await sb
                .from('vacas')
                .update(datosVaca)
                .eq('id', vacaId) // RLS verificará permiso sobre este ID
                .select() // Pedimos que nos devuelva la fila actualizada
                .single(); // Esperamos solo un resultado
        } else {
            // Si es CREACIÓN
            dbResult = await sb
                .from('vacas')
                .insert(datosVaca) // RLS verificará permiso para insertar
                .select() // Pedimos que nos devuelva la fila insertada
                .single(); // Esperamos solo un resultado
        }

        const { data: vacaGuardada, error: dbError } = dbResult;

        if (dbError) {
             console.error(`Error de Supabase al ${isUpdating ? 'actualizar' : 'insertar'} vaca:`, dbError);
            throw dbError; // Falla si RLS lo prohíbe o hay otro error DB
        }
        console.log(`Vaca ${isUpdating ? 'actualizada' : 'guardada'} con éxito:`, vacaGuardada);
        // --- FIN DEL CAMBIO ---


        mostrarMensaje('vaca-mensaje', `¡Animal ${isUpdating ? 'actualizado' : 'guardado'}!`, false);

        // Lógica para cerrar modal o limpiar formulario (sigue igual)
        if (debeCerrar) {
            setTimeout(() => {
                document.getElementById('modal-agregar-vaca')?.classList.add('hidden');
                // IMPORTANTE: Ya no llamamos a renderizarVistaMisVacas() aquí
                // En su lugar, actualizamos la lista local y redibujamos
                if (isUpdating) {
                    // Reemplazar vaca en la lista local
                    const index = listaCompletaDeVacas.findIndex(v => v.id == vacaId);
                    if (index > -1) listaCompletaDeVacas[index] = vacaGuardada;
                } else {
                    // Añadir nueva vaca al inicio de la lista local
                    listaCompletaDeVacas.unshift(vacaGuardada);
                }
                aplicarFiltrosDeGanado(); // Redibuja la lista con los datos actualizados
                 // Actualiza el contador en el header
                 const totalVacasEl = document.getElementById('total-vacas-header');
                 if(totalVacasEl) totalVacasEl.textContent = listaCompletaDeVacas.length || 0;

            }, 1200);
        } else {
            // Si es "Guardar y Siguiente"
             // Añadir nueva vaca al inicio de la lista local
             listaCompletaDeVacas.unshift(vacaGuardada);
             aplicarFiltrosDeGanado(); // Redibuja la lista con los datos actualizados
             // Actualiza el contador en el header
             const totalVacasEl = document.getElementById('total-vacas-header');
             if(totalVacasEl) totalVacasEl.textContent = listaCompletaDeVacas.length || 0;

            setTimeout(() => {
                form.reset();
                // Limpiar display foto
                const fileNameDisplay = document.getElementById('file-name-display');
                 if (fileNameDisplay) {
                     fileNameDisplay.innerHTML = '<span class="font-semibold">Click para subir</span> o arrastra';
                     fileNameDisplay.classList.add('text-gray-500');
                     fileNameDisplay.classList.remove('text-brand-green', 'font-semibold');
                 }
                // Limpiar edad
                const edadInput = document.getElementById('vaca-edad');
                if (edadInput) edadInput.value = '';
                // Limpiar sexo
                const sexoSelector = document.getElementById('sexo-selector');
                sexoSelector.querySelector('.bg-brand-green')?.classList.remove('bg-brand-green', 'text-white');
                form.querySelector('#vaca-nombre').focus();
                mostrarMensaje('vaca-mensaje', 'Listo para el siguiente animal.', false);
            }, 1200);
        }

    } catch (error) {
        console.error("Error completo en handleGuardarVaca:", error);
        mostrarMensaje('vaca-mensaje', error.message || 'Error inesperado', true);
    } finally {
        // Habilitar botones de nuevo
        setTimeout(() => {
            if (btnSiguiente) btnSiguiente.disabled = false;
            if (btnFinalizar) btnFinalizar.disabled = false;
        }, 1200); // Dar tiempo a que se muestre el mensaje
    }
}
// --- PEGA ESTAS FUNCIONES DE AYUDA AL FINAL DE main.js ---

// 1. Helper para escapar HTML (seguridad)
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 2. Helper para mostrar mensajes Toast (usa tu 'vaca-toast')
function showToast(msg, ms = 1800) {
  const t = document.getElementById('vaca-toast');
  if (!t) return; // Si no existe el toast, no hace nada
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.add('hidden'), ms);
}
// =================================================================
// AÑADE ESTA NUEVA FUNCIÓN A main.js (Manejar Subida de Excel)
// =================================================================
async function handleUploadExcel() {
    const inputFile = document.getElementById('input-archivo-excel');
    const btnImportar = document.getElementById('btn-importar-ganado');
    const mensajeEl = document.getElementById('importar-mensaje');
    const ranchoId = currentUser?.ranchos?.[0]?.id; // Obtiene el ID del rancho del propietario

    if (!inputFile || !inputFile.files || inputFile.files.length === 0) {
        if (mensajeEl) mostrarMensaje('importar-mensaje', 'Por favor, selecciona un archivo Excel primero.');
        return;
    }
    if (!ranchoId) {
        if (mensajeEl) mostrarMensaje('importar-mensaje', 'Error: No se pudo identificar tu rancho.');
        return;
    }

    const file = inputFile.files[0];

    // Validar tipo de archivo (opcional pero recomendado)
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
         if (mensajeEl) mostrarMensaje('importar-mensaje', 'Formato de archivo inválido. Solo se aceptan .xlsx o .xls');
         return;
    }

    // Deshabilitar botón y mostrar mensaje de carga
    if (btnImportar) {
        btnImportar.disabled = true;
        btnImportar.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Procesando...';
    }
    if (mensajeEl) mensajeEl.textContent = 'Subiendo y procesando archivo, por favor espera...';
    if (mensajeEl) mensajeEl.className = 'mt-4 text-sm text-center h-auto min-h-[1.25rem] text-gray-600'; // Estilo normal

    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append('archivoGanado', file); // 'archivoGanado' debe coincidir con el nombre esperado en Multer (backend)

    try {
        // Hacer la petición FETCH al nuevo endpoint del backend
        // (Asegúrate de que ':ranchoId' se reemplace con el ID real)
        const response = await fetch(`/api/vacas/importar/${ranchoId}`, {
            method: 'POST',
            body: formData // No necesitas 'Content-Type', FormData lo maneja
        });

        const result = await response.json();

        if (!response.ok) {
            // Si el backend envió un error (ej. 400, 500)
            throw new Error(result.message || `Error del servidor: ${response.status}`);
        }

        // Mostrar resultado exitoso del backend
        if (mensajeEl) {
             let feedbackMsg = `¡Importación completada! ${result.vacasImportadas || 0} animales añadidos.`;
             if (result.errores && result.errores.length > 0) {
                 feedbackMsg += ` Se encontraron errores en ${result.errores.length} fila(s): ${result.errores.join(', ')}.`;
                 mensajeEl.className = 'mt-4 text-sm text-center h-auto min-h-[1.25rem] text-orange-700 bg-orange-50 p-2 rounded'; // Estilo advertencia
             } else {
                 mensajeEl.className = 'mt-4 text-sm text-center h-auto min-h-[1.25rem] text-green-700 bg-green-50 p-2 rounded'; // Estilo éxito
             }
             mensajeEl.textContent = feedbackMsg;
             // Actualizar la vista de "Mi Ganado" en segundo plano
             renderizarVistaMisVacas();
        }

    } catch (error) {
        console.error("Error durante la importación:", error);
        if (mensajeEl) mostrarMensaje('importar-mensaje', `Error: ${error.message}`, true); // Muestra error en rojo
    } finally {
        // Volver a habilitar el botón y restaurar texto
        if (btnImportar) {
            btnImportar.disabled = false;
            btnImportar.innerHTML = 'Importar Ganado';
        }
        // Limpiar selección de archivo (opcional)
        // inputFile.value = '';
        // document.getElementById('nombre-archivo-seleccionado').textContent = '';
    }
}
// =====================================================================
    initApp();
});