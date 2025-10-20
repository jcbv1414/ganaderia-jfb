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
        }else if (viewId === 'inicio-propietario') {
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
            } else if (viewId === 'ajustes-mvz') { // <-- ¡ESTA ES LA "PUERTA" QUE FALTABA!
    renderizarVistaAjustesMvz();
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
    // CORRECCIÓN: Usar logo_url del rancho, no del usuario
    if (avatarEl) avatarEl.src = ranchoPrincipal?.logo_url || 'assets/logo.png';

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


    // PARTE 2: Carga de Estadísticas y Lotes (¡AHORA USAREMOS SUPABASE DIRECTO!)
    const lotesContainer = document.getElementById('lotes-container-scroll'); // ID correcto
    const lotesPlaceholder = document.getElementById('lotes-placeholder');
    if (lotesPlaceholder) lotesPlaceholder.textContent = 'Cargando lotes...';

    try {
        // --- ¡NUEVA LLAMADA DIRECTA A SUPABASE! ---
        // Asumiendo que tienes una función RPC 'get_rancho_stats' o similar.
        // Si no la tienes, podemos adaptarlo para calcularlo aquí como antes.
        // Por ahora, usaremos un placeholder fetch (CAMBIAR ESTO POR RPC)
         console.log(`Intentando fetch a /api/rancho/${ranchoId}/estadisticas (ESTO DEBE CAMBIARSE A RPC)`);
         // TEMPORALMENTE LLAMAREMOS AL VIEJO ENDPOINT HASTA QUE MIGREMOS A RPC
         const resStats = await fetch(`/api/rancho/${ranchoId}/estadisticas`);
         if (!resStats.ok) {
             const errorData = await resStats.text(); // Leer el error como texto
             console.error("Error en fetch stats:", errorData);
             throw new Error('No se pudieron cargar las estadísticas.');
         }
         const stats = await resStats.json();
         console.log("Estadísticas recibidas:", stats);
        // --- FIN DE LA LLAMADA ---

        let totalVacas = 0, totalGestantes = 0;
        Object.values(stats).forEach(lote => {
            totalVacas += lote.totalVacas || 0;
            totalGestantes += lote.estados?.Gestante || 0;
        });

        document.getElementById('resumen-total-vacas').textContent = totalVacas;
        document.getElementById('resumen-vacas-gestantes').textContent = totalGestantes;
        document.getElementById('resumen-alertas').textContent = 0; // Placeholder

        if (lotesContainer) {
             if (Object.keys(stats).length === 0) {
                 if(lotesPlaceholder) lotesPlaceholder.textContent = 'No hay lotes con datos.';
                 lotesContainer.innerHTML = ''; // Limpiar por si acaso
             } else {
                 if(lotesPlaceholder) lotesPlaceholder.style.display = 'none'; // Ocultar "Cargando..."
                 lotesContainer.innerHTML = Object.entries(stats).map(([numeroLote, datosLote]) => {
                     const vacasEnLote = datosLote.totalVacas || 0;
                     const gestantesEnLote = datosLote.estados?.Gestante || 0;
                     const porcentaje = vacasEnLote > 0 ? Math.round((gestantesEnLote / vacasEnLote) * 100) : 0;
                     const nombreLote = numeroLote === 'Sin Lote' ? 'Animales sin Lote' : `Lote ${numeroLote}`;
                     // Usamos el diseño con flex-shrink-0
                     return `<div class="flex-shrink-0 w-72 bg-white p-4 rounded-xl shadow-md flex items-center justify-between"><div class="flex items-center"><div class="progress-ring mr-4" style="--value: ${porcentaje}; --color: #22c55e;"><span class="progress-ring-percent">${porcentaje}%</span></div><div><p class="font-semibold">${nombreLote}</p><p class="text-sm text-gray-500">Gestación</p></div></div><i class="fa-solid fa-chevron-right text-gray-400"></i></div>`;
                 }).join('');
             }
        }

    } catch (error) {
        console.error("Error procesando estadísticas del propietario:", error);
        if (lotesPlaceholder) lotesPlaceholder.textContent = 'Error al cargar lotes.';
        if (lotesContainer) lotesContainer.innerHTML = '';
    }

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
async function cargarDashboardMVZ() {
    // Actualiza el saludo, la fecha y LA FOTO DE PERFIL del MVZ
    const nombreEl = document.getElementById('dash-nombre-mvz');
    if (nombreEl) nombreEl.textContent = currentUser.nombre.split(' ')[0];
    
    const fechaEl = document.getElementById('dash-fecha-actual-mvz');
    if (fechaEl) fechaEl.textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

    const avatarEl = document.getElementById('dash-mvz-avatar');
    if (avatarEl) avatarEl.src = currentUser.avatar_url || 'assets/avatar_mvz_default.png';

    try {
        const resDash = await fetch(`/api/dashboard/mvz/${currentUser.id}`);
        if (resDash.ok) {
            const dataDash = await resDash.json();
            const resumenVisitasEl = document.getElementById('resumen-visitas');
            if (resumenVisitasEl) resumenVisitasEl.textContent = dataDash.actividadesHoy || 0;
            const resumenAlertasEl = document.getElementById('resumen-alertas-mvz');
            if (resumenAlertasEl) resumenAlertasEl.textContent = dataDash.alertas || 0;
        }

        // Cargar eventos del calendario
        const resEventos = await fetch(`/api/eventos/mvz/${currentUser.id}`);
        const eventos = (await resEventos.json()).filter(e => !e.completado);
        
        const eventosContainer = document.getElementById('lista-eventos');
        const pendientesContainer = document.getElementById('lista-pendientes');

        const hoy = new Date();
        const hoyAnio = hoy.getFullYear();
        const hoyMes = hoy.getMonth();
        const hoyDia = hoy.getDate();

        const eventosHoy = eventos.filter(e => {
            const fechaEvento = new Date(e.fecha_evento);
            return fechaEvento.getFullYear() === hoyAnio && fechaEvento.getMonth() === hoyMes && fechaEvento.getDate() === hoyDia;
        });

        const eventosProximos = eventos.filter(e => !eventosHoy.includes(e));

        if (pendientesContainer) {
             if (eventosHoy.length > 0) {
                pendientesContainer.innerHTML = eventosHoy.map((e, i) => {
                     const rancho = e.nombre_rancho_texto || e.ranchos?.nombre || 'General';
                    return `<div class="bg-white p-3 rounded-lg shadow-sm mb-3"><p><strong>${i+1}.</strong> ${e.titulo} <em class="text-gray-500">(${rancho})</em></p><div class="flex justify-end space-x-2 mt-2"><button onclick="handleCancelarEvento(${e.id})" class="text-xs text-red-600 font-semibold px-2 py-1">Cancelar</button><button onclick="handleCompletarEvento(${e.id})" class="text-xs bg-green-600 text-white font-semibold px-3 py-1 rounded-full">Completar</button></div></div>`;
                }).join('');
            } else {
                 pendientesContainer.innerHTML = '<div class="bg-white p-4 rounded-xl shadow-md"><p class="text-sm text-gray-500">No hay pendientes para hoy.</p></div>';
            }
        }

        if (eventosContainer) {
            if (eventosProximos.length > 0) {
                 eventosContainer.innerHTML = eventosProximos.slice(0, 3).map(e => {
                    const fecha = new Date(e.fecha_evento);
                    const manana = new Date(); manana.setDate(new Date().getDate() + 1);
                    let textoFecha = fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
                    if (fecha.toDateString() === manana.toDateString()) textoFecha = 'Mañana';
                    const rancho = e.nombre_rancho_texto || e.ranchos?.nombre || 'General';
                    return `<div class="bg-white p-4 rounded-xl shadow-md mb-3"><div class="flex justify-between items-center"><p><i class="fa-solid fa-calendar-alt text-brand-green mr-2"></i><strong>${textoFecha}:</strong> ${e.titulo} <em>(${rancho})</em></p><i class="fa-solid fa-chevron-right text-gray-400"></i></div></div>`;
                }).join('');
            } else {
                eventosContainer.innerHTML = '<div class="bg-white p-4 rounded-xl shadow-md"><p class="text-sm text-gray-500">No hay más eventos programados.</p></div>';
            }
        }
    } catch (error) { 
        console.error("Error cargando dashboard MVZ:", error); 
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
    // =================================================================
    // MANEJADORES DE AUTENTICACIÓN
    // =================================================================
    // Reemplaza tu 'handleLogin' existente con esta nueva versión
// Reemplaza tu 'handleRegister' existente con esta nueva versión
window.handleRegister = async function(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    // Obtenemos los datos del formulario
    const nombre = form.querySelector('[name="nombre"]').value;
    const email = form.querySelector('[name="email"]').value.trim().toLowerCase();
    const password = form.querySelector('[name="password"]').value;
    const rol = form.querySelector('[name="rol"]').value;
    const ranchoNombre = form.querySelector('[name="rancho_nombre"]').value;

    try {
        // --- ¡AQUÍ ESTÁ EL CAMBIO! ---
        
        // 1. Creamos el usuario en la sección 'Authentication'
        const { data: authData, error: authError } = await sb.auth.signUp({
            email: email,
            password: password
        });

        if (authError) throw authError;

        // Si el usuario se creó en Auth (authData.user.id),
        // procedemos a crear su perfil en nuestra tabla 'usuarios'
        if (authData.user) {
            const { error: profileError } = await sb
                .from('usuarios')
                .insert({
                    id: authData.user.id, // ¡Usamos el MISMO ID de Auth!
                    nombre: nombre,
                    email: email,
                    rol: rol
                    // Ya no guardamos la contraseña aquí
                });
            
            if (profileError) throw profileError;

            // 2. Si es propietario, creamos su rancho (como antes)
            if (rol === 'propietario') {
                const codigoRancho = Math.random().toString(36).substring(2, 8).toUpperCase();
                const { error: ranchoError } = await sb
                    .from('ranchos')
                    .insert({
                        nombre: ranchoNombre || `${nombre.split(' ')[0]}'s Rancho`,
                        codigo: codigoRancho,
                        propietario_id: authData.user.id // Usamos el ID de Auth
                    });
                
                if (ranchoError) throw ranchoError;
            }
        }
        // --- FIN DEL CAMBIO ---

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

        // 3. NO cargamos los ranchos aquí

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


async function renderizarVistaMiMvz() {
    // --- Muestra el código de acceso ---
    const ranchoPrincipal = currentUser.ranchos?.[0];
    const codigoContainer = document.getElementById('codigo-acceso-container');
    if (ranchoPrincipal && codigoContainer) {
        codigoContainer.innerHTML = `
            <h3 class="text-lg font-semibold mb-2">Código de Acceso</h3>
            <p class="text-sm text-gray-600 mb-2">Comparte este código con tu veterinario para que pueda acceder a los datos de tu rancho.</p>
            <p class="text-2xl font-mono font-bold text-gray-800 tracking-widest bg-gray-100 p-3 rounded-lg inline-block">${ranchoPrincipal.codigo}</p>
        `;
    }

    // --- Carga y muestra la lista de veterinarios ---
    const container = document.getElementById('lista-mvz-container');
    container.innerHTML = '<p class="text-gray-500">Cargando...</p>';

    try {
        const res = await fetch(`/api/rancho/${ranchoPrincipal.id}/mvz`);
        if (!res.ok) throw new Error('Error al cargar veterinarios');
        const mvzList = await res.json();

        if (!mvzList || mvzList.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">Aún no tienes veterinarios asociados a tu rancho.</p>';
            return;
        }

        container.innerHTML = mvzList.map(item => {
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
                    <select onchange="handleCambiarPermisoMvz(${item.id}, this.value)" class="mt-1 w-full p-2 border border-gray-300 rounded-lg bg-white">
                        <option value="basico" ${permisoActual === 'basico' ? 'selected' : ''}>Solo registrar actividades</option>
                        <option value="admin" ${permisoActual === 'admin' ? 'selected' : ''}>Registrar actividades y agregar ganado</option>
                    </select>
                </div>
            </div>`;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-red-500 text-center">No se pudo cargar la lista de veterinarios.</p>';
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
    if (fab) fab.onclick = () => abrirModalVaca(); // Esto sigue igual

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
        if(totalVacasEl) totalVacasEl.textContent = listaCompletaDeVacas.length || 0;

        // Las funciones de filtro y renderizado siguen igual
        setupFiltrosDeGanado();
        aplicarFiltrosDeGanado(); // Muestra la lista inicial

    } catch (error) {
        console.error("Error completo en renderizarVistaMisVacas:", error);
        container.innerHTML = `<p class="text-center text-red-500 mt-8">Error al cargar el ganado: ${error.message}</p>`;
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

    // ¡Conecta las funciones auxiliares!
    conectarAyudantesFormVaca();
    // Dispara el 'change' para que calcule la edad al abrir
    const nacimientoInput = document.getElementById('vaca-nacimiento');
    if(nacimientoInput) nacimientoInput.dispatchEvent(new Event('change')); 

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
        const res = await fetch(`/api/actividades/vaca/${vacaId}`);
        if (!res.ok) throw new Error('No se pudo cargar el historial.');
        const historial = await res.json();

        if (historial.length === 0) {
            contenidoEl.innerHTML = '<p class="text-gray-500">No hay actividades registradas para este animal.</p>';
            return;
        }

        contenidoEl.innerHTML = historial.map(item => {
            // ----- INICIO DE LA CORRECCIÓN CLAVE -----
            // 1. Preparamos una variable para los detalles.
            let detalles = item.descripcion || {};

            // 2. Si los detalles son un texto (string), intentamos "traducirlos" a un objeto.
            if (typeof detalles === 'string') {
                try {
                    detalles = JSON.parse(detalles);
                } catch (e) {
                    // Si no se puede traducir (porque es un texto simple), lo mostramos como una nota.
                    detalles = { 'Nota': detalles };
                }
            }
            
            // 3. Ahora sí, creamos el HTML a partir del objeto ya corregido.
            const detallesHtml = Object.entries(detalles)
                .map(([key, value]) => `<p><strong class="font-medium text-gray-600">${prettyLabel(key)}:</strong> ${value}</p>`)
                .join('');
            // ----- FIN DE LA CORRECCIÓN CLAVE -----

            return `
            <div class="bg-gray-50 p-3 rounded-lg border mb-2">
                <p class="font-bold text-brand-green">${item.tipo_actividad}</p>
                <p class="text-xs text-gray-500 mb-2">
                    ${new Date(item.fecha_actividad + 'T00:00:00Z').toLocaleDateString('es-MX', { timeZone: 'UTC' })} por ${item.usuarios?.nombre || 'Desconocido'}
                </p>
                <div class="text-sm space-y-1">${detallesHtml}</div>
            </div>
            `;
        }).join('');
    } catch (error) {
        contenidoEl.innerHTML = `<p class="text-red-500">Error al cargar el historial: ${error.message}</p>`;
    }
}

    async function renderizarVistaEstadisticas() {
    const ranchoId = currentUser?.ranchos?.[0]?.id;
    if (!ranchoId) return;

    const contenidoContainer = document.getElementById('contenido-estadisticas');
    contenidoContainer.innerHTML = '<p class="text-center text-gray-500">Cargando datos...</p>';

    try {
        const res = await fetch(`/api/rancho/${ranchoId}/estadisticas`);
        if (!res.ok) throw new Error('No se pudieron cargar las estadísticas del servidor.');

        datosEstadisticasCompletos = await res.json();
        const lotes = Object.keys(datosEstadisticasCompletos);

        if (lotes.length === 0) {
            contenidoContainer.innerHTML = '<p class="text-center text-gray-500">No hay datos suficientes para mostrar estadísticas.</p>';
            return;
        }

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
        contenidoContainer.innerHTML = `<p class="text-center text-red-500">${error.message || 'Error'}</p>`;
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

    async function initActividadesMvzListeners() {
    const modoCont = document.getElementById('modo-seleccion-container');
    const ranchoActions = document.getElementById('rancho-actions-container');
    loteActividadActual = []; // Reinicia el lote actual

    // Lógica para cargar el rancho fijado al iniciar
    const pinnedRanchoData = localStorage.getItem('pinnedRancho');
    if (pinnedRanchoData) {
        try {
            const rancho = JSON.parse(pinnedRanchoData);
            if (rancho && rancho.id && rancho.nombre) {
                currentRancho = rancho;
                iniciarActividadUI();
                await cargarVacasParaMVZ();
                return; // Importante: Salta la pantalla de selección de modo
            }
        } catch (e) {
            localStorage.removeItem('pinnedRancho'); // Limpia si hay datos corruptos
        }
    }

    // Si no hay rancho fijado, muestra la selección de modo de trabajo
    if (modoCont) modoCont.classList.remove('hidden');
    if (ranchoActions) ranchoActions.classList.add('hidden');

    const btnShow = document.getElementById('btn-show-rancho-registrado');
    if (btnShow) btnShow.onclick = () => {
        const container = document.getElementById('rancho-access-container');
        if (container) container.classList.toggle('hidden');
    };
    const btnInd = document.getElementById('btn-iniciar-independiente');
    if (btnInd) btnInd.onclick = () => {
        currentRancho = { id: null, nombre: 'Trabajo Independiente' };
        iniciarActividadUI();
    };
    const btnValidar = document.getElementById('btn-validar-rancho');
    if (btnValidar) btnValidar.onclick = handleValidarRancho;
}

    async function handleValidarRancho() {
        const codigoEl = document.getElementById('codigo-rancho');
        const codigo = codigoEl ? codigoEl.value.trim().toUpperCase() : '';
        if (!codigo) { mostrarMensaje('mensaje-rancho', 'El código no puede estar vacío.'); return; }
        try {
            const res = await fetch(`/api/rancho/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message || 'Código inválido');
            currentRancho = respuesta;
            iniciarActividadUI();
            await cargarVacasParaMVZ();
        } catch (err) {
            mostrarMensaje('mensaje-rancho', err.message || 'Error inesperado');
        }
    }

function iniciarActividadUI() {
    document.getElementById('modo-seleccion-container')?.classList.add('hidden');
    document.getElementById('rancho-actions-container')?.classList.remove('hidden');

    const esIndependiente = !currentRancho?.id;

    // Actualiza el encabezado
    const nombreActivoEl = document.getElementById('rancho-nombre-activo');
    if (nombreActivoEl) nombreActivoEl.textContent = esIndependiente ? 'Trabajo Independiente' : (currentRancho?.nombre || '');
    const logoEl = document.getElementById('rancho-logo');
    if (logoEl) logoEl.src = currentRancho?.logo_url || 'assets/logo.png';
    
    // --- LÓGICA DE FIJADO RESTAURADA ---
    const btnFijarPrincipal = document.getElementById('btn-fijar-rancho');
    const btnFijarIndependiente = document.getElementById('btn-fijar-rancho-independiente');
    const ranchoIndependienteContainer = document.getElementById('rancho-independiente-input-container');

    if (esIndependiente) {
        if (ranchoIndependienteContainer) ranchoIndependienteContainer.classList.remove('hidden');
        if (btnFijarPrincipal) btnFijarPrincipal.classList.add('hidden');
        
        // Carga el nombre del rancho independiente si estaba fijado
        const pinnedRanchoData = localStorage.getItem('pinnedRancho');
        if (pinnedRanchoData) {
            try {
                const pinnedRancho = JSON.parse(pinnedRanchoData);
                if (pinnedRancho.nombre === 'Trabajo Independiente' && pinnedRancho.extra_data?.nombre_independiente) {
                    document.getElementById('rancho-independiente-nombre').value = pinnedRancho.extra_data.nombre_independiente;
                }
            } catch (e) { console.error("Error al leer rancho fijado:", e); }
        }

        if (btnFijarIndependiente) {
            btnFijarIndependiente.onclick = () => {
                const nombreIndependiente = document.getElementById('rancho-independiente-nombre').value.trim();
                if (!nombreIndependiente) {
                    alert('Escribe un nombre para el rancho antes de fijarlo.');
                    return;
                }
                const newPinnedRancho = { id: null, nombre: 'Trabajo Independiente', extra_data: { nombre_independiente: nombreIndependiente } };
                localStorage.setItem('pinnedRancho', JSON.stringify(newPinnedRancho));
                alert(`Rancho independiente '${nombreIndependiente}' fijado.`);
                // Actualiza el color del ícono
                btnFijarIndependiente.querySelector('i').classList.replace('text-white/50', 'text-white');
            };
        }
    } else { // Si es un rancho registrado
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
    
   // Dibuja las nuevas tarjetas de acción (esta es la parte que cambia)
    const accionesContainer = document.getElementById('acciones-rapidas-container');
    if (accionesContainer) {
        accionesContainer.innerHTML = ''; // Limpiamos
        
        // Define tus nuevas acciones con sus iconos y colores
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
            card.className = `p-4 rounded-2xl shadow-sm text-left flex flex-col justify-between h-28 ${accion.color}`;
            card.onclick = () => abrirModalActividad(accion.id);
            card.innerHTML = `
                <i class="fa-solid ${accion.icono} text-2xl ${accion.textColor} mb-2"></i>
                <span class="font-bold text-md ${accion.textColor}">${accion.titulo}</span>
            `;
            accionesContainer.appendChild(card);
        });
    }
    
    renderizarHistorialMVZ();
}

   function abrirModalActividad(tipo) {
    const modal = document.getElementById('modal-actividad');
    const form = document.getElementById('form-actividad-vaca');
    if (!modal || !form) return;

    // Reemplaza esta parte en abrirModalActividad
form.reset(); // Limpia textos y checkboxes

// AÑADE ESTA LÍNEA para limpiar los menús desplegables
form.querySelectorAll('select').forEach(select => { select.selectedIndex = -1; }); // Pone los selects en blanco

// Vuelve a generar los campos para asegurar que los condicionales se oculten
renderizarCamposProcedimiento(tipo);

    modal.classList.remove('hidden');

    const tituloEl = document.getElementById('modal-actividad-titulo');
    if (tituloEl && PROCEDIMIENTOS[tipo]) {
        tituloEl.textContent = PROCEDIMIENTOS[tipo].titulo;
    }
    // ----- PEGA ESTE BLOQUE -----
const actividadLoteEl = document.getElementById('actividad-lote');
if (actividadLoteEl) {
    // Llenamos con opciones del 1 al 10
    actividadLoteEl.innerHTML = ''; // Limpiamos primero
    for (let i = 1; i <= 10; i++) {
        actividadLoteEl.innerHTML += `<option value="${i}">Lote ${i}</option>`;
    }
}

    // ... (el resto de la función sigue igual, conectando los botones) ...
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
      const areteInput = document.getElementById('actividad-arete');
    const razaInput = document.getElementById('actividad-raza');
    if (areteInput && razaInput) {
        areteInput.oninput = () => {
            const vacaEncontrada = vacasIndex.get(areteInput.value.trim());
            if (vacaEncontrada) {
                razaInput.value = vacaEncontrada.raza || '';
            }
        };
    }
    crearAutocompletado('actividad-raza', 'sugerencias-raza-container', RAZAS_BOVINAS);


}

async function handleFinalizarYReportar() {
    const btn = document.getElementById('btn-finalizar-actividad-modal');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Procesando...';
    }

    // --- INICIO DE LA CORRECCIÓN CLAVE ---
    // 1. Verificamos explícitamente que tenemos un rancho activo antes de continuar.
    if (!currentRancho) {
        alert('Error: No se ha definido un rancho de trabajo. Por favor, reinicia la actividad.');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Finalizar Actividad';
        }
        return;
    }
    // --- FIN DE LA CORRECCIÓN CLAVE ---

    if (loteActividadActual.length === 0) {
        alert("No hay actividades en el lote para reportar. Guarda al menos un animal antes de finalizar.");
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Finalizar Actividad';
        }
        return;
    }

    try {
        const nombreDelRancho = currentRancho.id === null
            ? document.getElementById('rancho-independiente-nombre')?.value?.trim() || 'Independiente'
            : currentRancho.nombre;

        const payload = {
            mvzId: currentUser?.id,
            ranchoId: currentRancho.id, // Ahora usamos el ID que ya verificamos que existe
            loteActividad: loteActividadActual,
            mvzNombre: currentUser?.nombre || '',
            ranchoNombre: nombreDelRancho
        };

        const res = await fetch('/api/actividades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            try {
                const errData = await res.json();
                throw new Error(errData.message || 'Error en el servidor al generar el reporte.');
            } catch (e) {
                throw new Error(res.statusText);
            }
        }

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
        renderizarHistorialMVZ();

    } catch (err) {
        console.error("Error al finalizar y generar PDF:", err);
        alert(err.message || 'Hubo un error inesperado.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Finalizar Actividad';
        }
    }
}

    async function renderizarHistorialMVZ() {
    const historialContainer = document.getElementById('historial-actividades-mvz');
    if (!historialContainer) return;
    historialContainer.innerHTML = '<p class="text-gray-500 text-center">Cargando historial...</p>';

    try {
        const res = await fetch(`/api/actividades/mvz/${currentUser?.id || ''}`);
        if (!res.ok) throw new Error('No se pudo cargar el historial.');
        const sesiones = await res.json();

        if (!sesiones || sesiones.length === 0) {
            historialContainer.innerHTML = '<div class="bg-white p-4 rounded-xl text-center text-gray-500"><p>No hay reportes recientes.</p></div>';
            return;
        }
        
        historialContainer.innerHTML = sesiones.map(sesion => {
            const fechaUTC = new Date(sesion.fecha + 'T00:00:00Z');
            const fecha = fechaUTC.toLocaleDateString('es-MX', {day: 'numeric', month: 'long', timeZone: 'UTC'});
            return `
            <div class="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between">
                <div class="flex items-center">
                    <input type="checkbox" data-sesion-id="${sesion.sesion_id}" class="h-6 w-6 rounded border-gray-300 mr-4">
                    <div>
                        <p class="font-bold text-gray-800">${sesion.tipo_actividad} en <em>${sesion.rancho_nombre}</em></p>
                        <p class="text-sm text-gray-500">${sesion.conteo} animales - ${fecha}</p>
                    </div>
                </div>
                <button data-sesion-id="${sesion.sesion_id}" class="btn-eliminar-sesion text-red-400 hover:text-red-600 px-2">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
            `;
        }).join('');
        
        // Reconectar los botones de eliminar
        historialContainer.querySelectorAll('.btn-eliminar-sesion').forEach(button => {
            button.addEventListener('click', async (e) => {
                const sesionId = e.currentTarget.dataset.sesionId;
                if (!confirm('¿Estás seguro de que quieres eliminar esta sesión?')) return;
                try {
                    const deleteRes = await fetch(`/api/sesiones/${sesionId}`, { method: 'DELETE' });
                    if (!deleteRes.ok) throw new Error('No se pudo eliminar la sesión.');
                    renderizarHistorialMVZ(); // Recarga la lista
                } catch (error) {
                    alert(error.message || 'Error al eliminar la sesión.');
                }
            });
        });

    } catch (error) {
        historialContainer.innerHTML = '<p class="text-red-500 text-center">Error al cargar historial.</p>';
    }
}

    async function handleGenerarPdfDeHistorial() {
        const checkboxes = document.querySelectorAll('#historial-actividades-mvz input[type="checkbox"]:checked');
        const sesionesSeleccionadas = Array.from(checkboxes).map(cb => cb.dataset.sesionId);

        if (sesionesSeleccionadas.length === 0) {
            alert('Por favor, selecciona al menos una actividad del historial para generar el reporte.');
            return;
        }

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

    async function cargarVacasParaMVZ() {
        if (!currentRancho || !currentRancho.id) return;
        try {
            const res = await fetch(`/api/vacas/rancho/${currentRancho.id}`);
            if (!res.ok) throw new Error('No se pudieron cargar vacas');
            const vacas = await res.json();
            const datalist = document.getElementById('lista-aretes-autocompletar');
            if (datalist) datalist.innerHTML = '';
            vacasIndex.clear();
            (vacas || []).forEach(v => {
                if (datalist) datalist.insertAdjacentHTML('beforeend', `<option value="${v.numero_siniiga}">`);
                vacasIndex.set(String(v.numero_siniiga).trim(), { id: v.id, nombre: v.nombre, raza: v.raza || '' });
            });
        } catch (err) { console.error("Error cargando vacas para MVZ:", err); }
    }

    function handleAgregarVacaAlLote(tipoActividad, limpiarForm) {
        const form = document.getElementById('form-actividad-vaca');
        const areteInput = document.getElementById('actividad-arete');
        const loteNumero = document.getElementById('actividad-lote')?.value;
        const arete = areteInput ? areteInput.value.trim() : '';

        if (!arete) {
            if (!limpiarForm) return; // Si es el click final y no hay arete, no hacemos nada.
            mostrarMensaje('mensaje-vaca', 'El número de arete es obligatorio.');
            return;
        }
        const vacaEncontrada = vacasIndex.get(arete);
    // 2. Extrae el ID numérico de la vaca. Si no se encuentra, será 'null'.
    const idDeLaVaca = vacaEncontrada ? vacaEncontrada.id : null;

        const formData = new FormData(form);
        const detalles = {};
        for (const [key, value] of formData.entries()) {
            if (!['actividad-lote', 'actividad-arete', 'raza'].includes(key) && value) {
                detalles[key] = value;
            }
        }
        
         loteActividadActual.push({
        vacaId: idDeLaVaca,
        areteVaca: arete,
        raza: form.querySelector('#actividad-raza').value.trim() || 'N/A',
        loteNumero: loteNumero,
        tipo: tipoActividad,
        tipoLabel: PROCEDIMIENTOS[tipoActividad].titulo,
        fecha: new Date().toISOString().split('T')[0],
        detalles: detalles
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

async function renderizarVistaCalendario() {
    // 1. Conecta los botones del modal de "Crear Evento"
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

    // 2. Elementos donde se dibujará todo
    const containerCalendario = document.getElementById('calendario-visual-container');
    const containerLista = document.getElementById('lista-eventos-calendario');

    if (!containerCalendario || !containerLista) return;
    
    containerCalendario.innerHTML = '<p class="text-center p-4">Cargando calendario...</p>';
    containerLista.innerHTML = '<p class="text-center">Cargando eventos...</p>';

    try {
        // 3. Obtiene los eventos del servidor
        const res = await fetch(`/api/eventos/mvz/${currentUser.id}`);
        if (!res.ok) throw new Error('No se pudieron cargar los eventos.');
        const eventos = await res.json();

        // 4. Dibuja la lista de eventos de abajo
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

        // 5. Dibuja el calendario visual
        if (typeof FullCalendar === 'undefined') throw new Error("La librería FullCalendar no está cargada.");
        
        containerCalendario.innerHTML = '';
        const calendario = new FullCalendar.Calendar(containerCalendario, {
            initialView: 'dayGridMonth',
            locale: 'es',
            height: 'auto',
            headerToolbar: { left: 'prev', center: 'title', right: 'next' },
            events: eventos.map(e => ({ id: e.id, title: e.titulo, start: e.fecha_evento })),
            eventClick: function(info) {
                const eventoOriginal = eventos.find(e => e.id == info.event.id);
                if (eventoOriginal) {
                    mostrarDetalleEvento(eventoOriginal); // Llama a la función de la tarjeta flotante
                }
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

async function cargarSelectDeRanchos() {
    const select = document.getElementById('select-ranchos-evento');
    if (!select) return;
    select.innerHTML = '<option value="">Otro / No especificar</option>'; // Opción por defecto
    try {
        // Ahora le preguntamos a nuestra nueva ruta en el servidor
        const res = await fetch(`/api/ranchos/mvz/${currentUser.id}`);
        if (!res.ok) throw new Error('Error del servidor al cargar ranchos');
        const ranchos = await res.json();

        ranchos.forEach(r => {
            if(r) select.innerHTML += `<option value="${r.id}">${r.nombre}</option>`;
        });
    } catch (error) { 
        console.error('Error cargando ranchos para select:', error); 
    }
}

async function handleGuardarEvento(e) {
    e.preventDefault();
    const form = e.target;
    const btn = document.getElementById('btn-guardar-evento');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const eventoId = payload.evento_id; // Obtenemos el ID del campo oculto

    // Decide si es una actualización (PUT) o una creación (POST)
    const isUpdating = eventoId && eventoId !== '';
    const method = isUpdating ? 'PUT' : 'POST';
    const url = isUpdating ? `/api/eventos/${eventoId}` : '/api/eventos';

    payload.mvz_id = currentUser.id;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const respuesta = await res.json();
        if (!res.ok) throw new Error(respuesta.message);

        mostrarMensaje('evento-mensaje', `¡Evento ${isUpdating ? 'actualizado' : 'guardado'} con éxito!`, false);
        setTimeout(() => {
            document.getElementById('modal-agregar-evento').classList.add('hidden');
            form.reset();
            cargarEventos();
            cargarDashboardMVZ();
        }, 1200);
    } catch (error) {
        mostrarMensaje('evento-mensaje', error.message, true);
    } finally {
        btn.disabled = false;
        // El texto del botón se restablece en renderizarVistaCalendario
    }
}

    // INICIALIZACIÓN DE LA APLICACIÓN
    function initApp() {
        setupNavigation();
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            try { currentUser = JSON.parse(savedUser); } catch(e){}
            iniciarSesion();
        } else {
            if (navContainer) navContainer.classList.add('hidden');
            navigateTo('login');
        }
        
    }
   // ----- REEMPLAZA LAS DOS ÚLTIMAS FUNCIONES CON ESTE BLOQUE -----

// Hacemos la función global añadiendo "window." al principio
window.handleCompletarEvento = async function(eventoId) {
    try {
        const res = await fetch(`/api/eventos/${eventoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completado: true })
        });
        if (!res.ok) throw new Error('No se pudo completar el evento.');
        cargarDashboardMVZ(); // Recarga el dashboard para que el evento desaparezca
    } catch (error) { alert(error.message); }
}

// Hacemos también esta función global
window.handleCancelarEvento = async function(eventoId) {
    if (!confirm('¿Estás seguro de que quieres cancelar este evento?')) return;
    try {
        const res = await fetch(`/api/eventos/${eventoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ borrar: true })
        });
        if (!res.ok) throw new Error('No se pudo cancelar el evento.');
        cargarDashboardMVZ(); // Recarga el dashboard para que el evento desaparezca
    } catch (error) { alert(error.message); }
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
window.handleEliminarEvento = async function(eventoId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer.')) {
        return;
    }
    try {
        const res = await fetch(`/api/eventos/${eventoId}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('No se pudo eliminar el evento.');

        cargarEventos(); // Recarga la lista del calendario
        cargarDashboardMVZ(); // Recarga el inicio por si el evento era para hoy
    } catch (error) {
        alert(error.message);
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
window.handleRevocarAccesoMvz = async function(permisoId) {
    if (!confirm('¿Estás seguro de que quieres revocar el acceso a este veterinario?')) return;
    try {
        const res = await fetch(`/api/rancho/mvz/${permisoId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('No se pudo revocar el acceso.');
        renderizarVistaMiMvz(); // Recarga la lista
    } catch (error) { alert(error.message); }
}

window.handleCambiarPermisoMvz = async function(permisoId, nuevoPermiso) {
    try {
        const res = await fetch(`/api/rancho/mvz/${permisoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permisos: nuevoPermiso })
        });
        if (!res.ok) throw new Error('No se pudo actualizar el permiso.');
        // Opcional: mostrar un mensaje de éxito
    } catch (error) { alert(error.message); }
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

// Reemplaza también renderizarVistaMisVacas para asegurarte de que todo está conectado
async function renderizarVistaMisVacas() {
    const ranchoId = currentUser.ranchos?.[0]?.id;
    if (!ranchoId) return;

    const container = document.getElementById('lista-vacas-container');
    container.innerHTML = '<p class="text-center text-gray-500 mt-8">Ganaderia JFB</p>';
    const fab = document.getElementById('btn-abrir-modal-vaca');
    if (fab) fab.onclick = () => abrirModalVaca();

    try {
        const res = await fetch(`/api/vacas/rancho/${ranchoId}`);
        if (!res.ok) throw new Error('Error al obtener vacas');
        listaCompletaDeVacas = await res.json();

        const totalVacasEl = document.getElementById('total-vacas-header');
        if(totalVacasEl) totalVacasEl.textContent = (listaCompletaDeVacas && listaCompletaDeVacas.length) || 0;
        
        setupFiltrosDeGanado();
        
        aplicarFiltrosDeGanado();

    } catch (error) {
        container.innerHTML = '<p class="text-center text-red-500 mt-8">Error al cargar el ganado.</p>';
    }
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

window.handleEliminarVaca = async function(vacaId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este animal? Esta acción no se puede deshacer.')) return;
    try {
        const res = await fetch(`/api/vacas/${vacaId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('No se pudo eliminar la vaca.');

        // Recarga la lista de vacas para que desaparezca la eliminada
        renderizarVistaMisVacas(); 
    } catch (error) {
        alert(error.message || 'Error inesperado');
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
    if (ranchoLogoPreview && currentUser.ranchos?.[0]?.logo_url) {
        ranchoLogoPreview.src = currentUser.ranchos[0].logo_url;
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

async function handleGuardarAjustesPropietario() {
    const btnGuardar = document.getElementById('btn-guardar-ajustes-propietario');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    const nuevoNombre = document.getElementById('ajustes-nombre-propietario').value;
    const nuevoNombreRancho = document.getElementById('ajustes-rancho-nombre').value;
    const ranchoId = currentUser.ranchos?.[0]?.id;

    try {
        // Promesas para todas las actualizaciones
        const updates = [];

        // 1. Actualizar el nombre del usuario
        updates.push(fetch(`/api/usuarios/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevoNombre })
        }).then(res => {
            if (!res.ok) throw new Error('No se pudo actualizar el perfil.');
            return res.json();
        }));

        // 2. Actualizar el nombre del rancho
        if (ranchoId) {
            updates.push(fetch(`/api/ranchos/${ranchoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nuevoNombreRancho })
            }).then(res => {
                if (!res.ok) throw new Error('No se pudo actualizar el rancho.');
                return res.json();
            }));
        }

        // 3. Subir y actualizar el logo del rancho (si se seleccionó un nuevo archivo)
        if (selectedRanchoLogoFile && ranchoId) {
            const formData = new FormData();
            formData.append('logo', selectedRanchoLogoFile);

            updates.push(fetch(`/api/ranchos/${ranchoId}/upload-logo`, {
                method: 'POST',
                body: formData // No Content-Type cuando usas FormData, el navegador lo añade
            }).then(res => {
                if (!res.ok) throw new Error('No se pudo subir el logo.');
                return res.json();
            }).then(data => {
                currentUser.ranchos[0].logo_url = data.logo_url; // Actualizar URL en currentUser
            }));
        }

        // Esperar a que todas las actualizaciones se completen
        const results = await Promise.all(updates);

        // Actualizar la información local del currentUser si es necesario (ya se hizo para logo_url)
        const usuarioActualizado = results.find(r => r.usuario)?.usuario;
        const ranchoActualizado = results.find(r => r.rancho)?.rancho;

        if (usuarioActualizado) currentUser.nombre = usuarioActualizado.nombre;
        if (ranchoActualizado) currentUser.ranchos[0].nombre = ranchoActualizado.nombre;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Limpiar el archivo seleccionado después de subirlo
        selectedRanchoLogoFile = null;

        mostrarMensaje('ajustes-mensaje', '¡Cambios guardados con éxito!', false);

    } catch (error) {
        console.error("Error al guardar ajustes:", error);
        mostrarMensaje('ajustes-mensaje', error.message, true);
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

async function handleGuardarAjustesMvz() {
    const btnGuardar = document.getElementById('btn-guardar-ajustes-mvz');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
        const updates = [];

        // 1. Actualizar datos de texto
        const nuevoNombre = document.getElementById('ajustes-nombre-mvz').value;
        const nuevaCedula = document.getElementById('ajustes-cedula-mvz').value;
        const nuevaEspecialidad = document.getElementById('ajustes-especialidad-mvz').value;
        const infoProfesional = { cedula: nuevaCedula, especialidad: nuevaEspecialidad };
        
        updates.push(fetch(`/api/usuarios/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevoNombre, info_profesional: infoProfesional })
        }).then(res => res.json()));

        // 2. Subir nueva foto de perfil si existe
        if (selectedMvzAvatarFile) {
            const formData = new FormData();
            formData.append('avatar', selectedMvzAvatarFile);
            updates.push(fetch(`/api/usuarios/${currentUser.id}/upload-avatar`, {
                method: 'POST',
                body: formData
            }).then(res => res.json()));
        }

        const results = await Promise.all(updates);

        // Actualizar currentUser con todos los datos nuevos
        results.forEach(result => {
            if (result.usuario) {
                currentUser.nombre = result.usuario.nombre;
                currentUser.info_profesional = result.usuario.info_profesional;
            }
            if (result.avatar_url) {
                currentUser.avatar_url = result.avatar_url;
            }
        });
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        selectedMvzAvatarFile = null; // Limpiar

        mostrarMensaje('ajustes-mvz-mensaje', '¡Cambios guardados con éxito!', false);

    } catch (error) {
        mostrarMensaje('ajustes-mvz-mensaje', error.message, true);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Cambios';
    }
}

async function handleGuardarAjustesMvz() {
    const btnGuardar = document.getElementById('btn-guardar-ajustes-mvz');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    const nuevoNombre = document.getElementById('ajustes-nombre-mvz').value;
    const nuevaCedula = document.getElementById('ajustes-cedula-mvz').value;
    const nuevaEspecialidad = document.getElementById('ajustes-especialidad-mvz').value;

    const infoProfesional = {
        cedula: nuevaCedula,
        especialidad: nuevaEspecialidad
    };

    try {
        // Reutilizamos la ruta de actualización de usuario que ya existe
        const res = await fetch(`/api/usuarios/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: nuevoNombre,
                info_profesional: infoProfesional
            })
        });

        if (!res.ok) throw new Error('No se pudo actualizar el perfil.');
        const { usuario: usuarioActualizado } = await res.json();

        // Actualizar la información local para que se refleje en toda la app
        currentUser.nombre = usuarioActualizado.nombre;
        currentUser.info_profesional = usuarioActualizado.info_profesional;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        mostrarMensaje('ajustes-mvz-mensaje', '¡Cambios guardados con éxito!', false);

    } catch (error) {
        mostrarMensaje('ajustes-mvz-mensaje', error.message, true);
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

async function handleGuardarAjustesMvz() {
    const btnGuardar = document.getElementById('btn-guardar-ajustes-mvz');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
        const updates = [];
        let avatarUrl = currentUser.avatar_url; // URL actual

        // 1. Subir nueva foto de perfil si existe
        if (selectedMvzAvatarFile) {
            const formData = new FormData();
            formData.append('avatar', selectedMvzAvatarFile);

            const resAvatar = await fetch(`/api/usuarios/${currentUser.id}/upload-avatar`, {
                method: 'POST',
                body: formData
            });
            if (!resAvatar.ok) throw new Error('No se pudo subir la foto.');
            const { usuario } = await resAvatar.json();
            avatarUrl = usuario.avatar_url; // Obtenemos la nueva URL
        }

        // 2. Actualizar datos de texto
        const nuevoNombre = document.getElementById('ajustes-nombre-mvz').value;
        const nuevaCedula = document.getElementById('ajustes-cedula-mvz').value;
        const nuevaEspecialidad = document.getElementById('ajustes-especialidad-mvz').value;
        const infoProfesional = { cedula: nuevaCedula, especialidad: nuevaEspecialidad };

        const resUser = await fetch(`/api/usuarios/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nombre: nuevoNombre, 
                info_profesional: infoProfesional,
                avatar_url: avatarUrl // Guardamos la URL de la foto (nueva o la que ya estaba)
            })
        });
        if (!resUser.ok) throw new Error('No se pudo actualizar el perfil.');

        const { usuario: usuarioActualizado } = await resUser.json();

        // 3. Actualizar currentUser con todos los datos nuevos
        currentUser = { ...currentUser, ...usuarioActualizado };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        selectedMvzAvatarFile = null; // Limpiar

        mostrarMensaje('ajustes-mvz-mensaje', '¡Cambios guardados con éxito!', false);

    } catch (error) {
        mostrarMensaje('ajustes-mvz-mensaje', error.message, true);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Cambios';
    }
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
    initApp();
});