document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // ESTADO GLOBAL Y CONFIGURACIÓN
    // =================================================================
    let currentUser = null;
    let currentRancho = null;
    let loteActividadActual = [];
    let vacasIndex = new Map();
    let datosEstadisticasCompletos = null;
    let miGrafico = null;
    const API_URL = ''; // opcional si quieres prefijar la API
    const appContent = document.getElementById('app-content');
    const navContainer = document.getElementById('nav-container');

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
        
        // Lógica post-renderizado
        if (viewId.startsWith('login') || viewId.startsWith('registro')) {
            document.body.className = '';
            if (viewId === 'login') {
                document.getElementById('form-login').addEventListener('submit', handleLogin);
                document.getElementById('link-a-registro').addEventListener('click', (ev) => { ev.preventDefault(); navigateTo('registro'); });
            } else {
                document.getElementById('form-registro').addEventListener('submit', handleRegister);
                document.getElementById('link-a-login').addEventListener('click', (ev) => { ev.preventDefault(); navigateTo('login'); });
            }
        } else if (viewId === 'inicio-propietario') {
            document.getElementById('dash-nombre-propietario').textContent = currentUser?.nombre?.split(' ')[0] || '';
            document.getElementById('dash-fecha-actual').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
            cargarDatosDashboardPropietario();
        } else if (viewId === 'mis-vacas') {
            renderizarVistaMisVacas();
        } else if (viewId === 'mi-mvz') {
            renderizarVistaMiMvz();
        } else if (viewId === 'estadisticas') {
            renderizarVistaEstadisticas();
        } else if (viewId === 'inicio-mvz') {
            cargarDashboardMVZ();
        } else if (viewId === 'actividades-mvz') {
            initActividadesMvzListeners();
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
    // MANEJADORES DE AUTENTICACIÓN
    // =================================================================
    async function handleLogin(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) { btn.classList.add('loading'); btn.disabled = true; }
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const res = await fetch(`/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message || 'Error en login');
            currentUser = respuesta.user;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            iniciarSesion();
        } catch (err) {
            mostrarMensaje('login-mensaje', err.message || 'Error inesperado');
        } finally {
            if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        try {
            // Enviamos FormData (multipart) para soportar distintos navegadores/inputs
            const res = await fetch(`/api/register`, { method: 'POST', body: formData });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message || 'Error en registro');
            mostrarMensaje('registro-mensaje', '¡Registro exitoso! Serás redirigido al login.', false);
            setTimeout(() => navigateTo('login'), 1200);
        } catch (err) {
            mostrarMensaje('registro-mensaje', err.message || 'Error inesperado');
        }
    }
    
    // =================================================================
    // LÓGICA DEL PROPIETARIO
    // =================================================================
    async function cargarDatosDashboardPropietario() {
        if (!currentUser || currentUser.rol !== 'propietario') return;
        const ranchoId = currentUser.ranchos?.[0]?.id;
        if (!ranchoId) return;

        try {
            const ranchoPrincipal = currentUser?.ranchos?.[0]; 
    if (ranchoPrincipal) {
        const infoRanchoEl = document.getElementById('info-rancho-propietario'); // Asegúrate de tener un div con este id en tu HTML
        if (infoRanchoEl) {
            infoRanchoEl.innerHTML = `
                <p class="text-sm text-gray-600">Nombre del Rancho:</p>
                <h2 class="text-xl font-bold text-brand-green">${ranchoPrincipal.nombre}</h2>
                <p class="mt-2 text-sm text-gray-600">Código de Acceso para tu MVZ:</p>
                <p class="text-2xl font-bold text-gray-800 tracking-widest bg-gray-100 p-2 rounded-lg inline-block">${ranchoPrincipal.codigo}</p>
                <p class="text-xs text-gray-500 mt-1">Comparte este código con tu veterinario para que pueda acceder a tu rancho.</p>
            `;
        }
    }
            const res = await fetch(`/api/rancho/${ranchoId}/estadisticas`);
            if (!res.ok) throw new Error('No se pudieron cargar las estadísticas.');
            const stats = await res.json();

            let totalVacas = 0, totalGestantes = 0;
            Object.values(stats).forEach(lote => {
                totalVacas += lote.totalVacas || 0;
                totalGestantes += lote.estados?.Gestante || 0;
            });

            document.getElementById('resumen-total-vacas').textContent = totalVacas;
            document.getElementById('resumen-vacas-gestantes').textContent = totalGestantes;
            document.getElementById('resumen-alertas').textContent = 3; // Dato de ejemplo

            const lotesContainer = document.getElementById('lotes-container');
            if (!lotesContainer) return;
            lotesContainer.innerHTML = '';
            
            if (Object.keys(stats).length === 0) {
                lotesContainer.innerHTML = '<p class="text-gray-500">No hay lotes con datos para mostrar.</p>';
                return;
            }
            
            Object.entries(stats).slice(0, 3).forEach(([numeroLote, datosLote]) => { // Muestra hasta 3 lotes
                const vacasEnLote = datosLote.totalVacas || 0;
                const gestantesEnLote = datosLote.estados?.Gestante || 0;
                const porcentajeGestacion = vacasEnLote > 0 ? Math.round((gestantesEnLote / vacasEnLote) * 100) : 0;
                const loteCardHTML = `
                    <div class="bg-white p-4 rounded-xl shadow-md flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="progress-ring mr-4" style="--value: ${porcentajeGestacion}; --color: #22c55e;">
                                <span class="progress-ring-percent">${porcentajeGestacion}%</span>
                            </div>
                            <div>
                                <p class="font-semibold">Lote ${numeroLote}</p>
                                <p class="text-sm text-gray-500">Gestación</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-right text-gray-400"></i>
                    </div>`;
                lotesContainer.innerHTML += loteCardHTML;
            });
        } catch (error) {
            const el = document.getElementById('lotes-container');
            if (el) el.innerHTML = '<p class="text-red-500">No se pudieron cargar los datos.</p>';
        }
    }

async function renderizarVistaMiMvz() {
    const ranchoId = currentUser.ranchos?.[0]?.id;
    if (!ranchoId) return;

    const container = document.getElementById('lista-mvz-container');
    const form = document.getElementById('form-invitar-mvz');

    // Función para cargar y mostrar la lista de veterinarios
    async function cargarMvz() {
        try {
            const res = await fetch(`/api/rancho/${ranchoId}/mvz`);
            if (!res.ok) throw new Error('Error al cargar veterinarios');
            const mvzList = await res.json();

            if (!mvzList || mvzList.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center">Aún no has invitado a ningún veterinario.</p>';
                return;
            }

            container.innerHTML = mvzList.map(item => `
                <div class="bg-white p-4 rounded-xl shadow-md flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <i class="fa-solid fa-user-doctor text-xl text-gray-500"></i>
                        </div>
                        <div>
                            <p class="font-semibold text-gray-800">${item.usuarios.nombre}</p>
                            <p class="text-sm text-gray-500">${item.usuarios.email}</p>
                        </div>
                    </div>
                    <button class="text-red-500 hover:text-red-700" title="Revocar acceso">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `).join('');
        } catch (error) {
            container.innerHTML = '<p class="text-red-500 text-center">No se pudo cargar la lista de veterinarios.</p>';
        }
    }

    // Lógica para el formulario de invitación
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('email-mvz');
        const email = emailInput.value.trim();
        if (!email) return;

        try {
            const res = await fetch('/api/rancho/invitar-mvz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ranchoId: ranchoId,
                    mvzEmail: email,
                    permisos: 'editor' // Permiso por defecto
                })
            });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message || 'Error al invitar');
            mostrarMensaje('mvz-mensaje', '¡Invitación enviada con éxito!', false);
            emailInput.value = '';
            cargarMvz(); // Recargar la lista para mostrar al nuevo veterinario
        } catch (error) {
            mostrarMensaje('mvz-mensaje', error.message || 'Error inesperado', true);
        }
    });

    // Carga inicial de la lista
    cargarMvz();
}

    async function renderizarVistaMisVacas() {
        // En main.js, dentro de renderizarVistaMisVacas
container.querySelectorAll('.btn-ver-historial').forEach(btn => {
    btn.onclick = () => verHistorialVaca(btn.dataset.vacaId, btn.dataset.vacaNombre);
});

// Y agrega estas funciones de forma global o dentro del DOMContentLoaded
const modalHistorial = document.getElementById('modal-historial-vaca');
const btnCerrarModalHistorial = document.getElementById('btn-cerrar-modal-historial');
if(btnCerrarModalHistorial) btnCerrarModalHistorial.onclick = () => modalHistorial.classList.add('hidden');

async function verHistorialVaca(vacaId, vacaNombre) {
    if (!modalHistorial) return;

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
            const detallesHtml = Object.entries(item.descripcion || {})
                .map(([key, value]) => `<p><strong class="font-medium text-gray-600">${prettyLabel(key)}:</strong> ${value}</p>`)
                .join('');

            return `
                <div class="bg-gray-50 p-3 rounded-lg border">
                    <p class="font-bold text-brand-green">${item.tipo_actividad}</p>
                    <p class="text-xs text-gray-500 mb-2">
                        ${new Date(item.fecha_actividad).toLocaleDateString('es-MX')} por ${item.nombreMvz}
                    </p>
                    <div class="text-sm space-y-1">${detallesHtml}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        contenidoEl.innerHTML = '<p class="text-red-500">Error al cargar el historial.</p>';
    }
}
        const ranchoId = currentUser.ranchos?.[0]?.id;
        if (!ranchoId) return;

        const container = document.getElementById('lista-vacas-container');
        const fab = document.getElementById('btn-abrir-modal-vaca');
        
        if (fab) fab.onclick = () => abrirModalVaca();

        try {
            const res = await fetch(`/api/vacas/rancho/${ranchoId}`);
            if (!res.ok) throw new Error('Error al obtener vacas');
            const vacas = await res.json();
            document.getElementById('total-vacas-header').textContent = (vacas && vacas.length) || 0;
            
            if (!vacas || vacas.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500 mt-8">Aún no has registrado ningún animal.</p>';
                return;
            }

            container.innerHTML = vacas.map(vaca => `
                <div class="bg-white p-4 rounded-xl shadow-md">
                    <div class="flex items-center space-x-4">
                        <img src="${vaca.foto_url || 'https://via.placeholder.com/80'}" alt="Foto de ${vaca.nombre}" class="w-20 h-20 rounded-lg object-cover bg-gray-200">
                        <div class="flex-grow">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h3 class="text-lg font-bold text-gray-800">${vaca.nombre}</h3>
                                    <p class="text-sm text-gray-500">ID: #${vaca.numero_siniiga}</p>
                                </div>
                                <button data-vaca-id="${vaca.id}" data-vaca-nombre="${vaca.nombre}" class="btn-ver-historial mt-2 text-sm font-semibold text-brand-green">
    Ver Historial
</button>
                                <button data-vaca-id="${vaca.id}" class="btn-eliminar-vaca text-red-500 hover:text-red-700"><i class="fa-solid fa-trash-can"></i></button>
                            </div>
                            <div class="text-xs text-gray-600 mt-2">
                                <span>Raza: <strong>${vaca.raza || 'N/A'}</strong></span> | 
                                <span>Nacimiento: <strong>${vaca.fecha_nacimiento ? new Date(vaca.fecha_nacimiento).toLocaleDateString('es-MX') : 'N/A'}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            container.querySelectorAll('.btn-eliminar-vaca').forEach(btn => {
                btn.onclick = () => handleEliminarVaca(btn.dataset.vacaId);
            });

        } catch (error) {
            container.innerHTML = '<p class="text-center text-red-500 mt-8">Error al cargar el ganado.</p>';
        }
    }
    
// REEMPLAZA TU FUNCIÓN 'abrirModalVaca' CON ESTA VERSIÓN FINAL
function abrirModalVaca() {
    const modal = document.getElementById('modal-agregar-vaca');
    const form = document.getElementById('form-agregar-vaca');
    
    if (!modal || !form) return;
    
    modal.classList.remove('hidden');
    form.reset();
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileNameDisplay) fileNameDisplay.textContent = '';

    // Configura la lista de razas
    const datalistRazas = document.getElementById('lista-razas');
    if (datalistRazas) datalistRazas.innerHTML = RAZAS_BOVINAS.map(r => `<option value="${r}"></option>`).join('');

    // Configura el cálculo de edad
    const nacimientoInput = document.getElementById('vaca-nacimiento');
    const edadInput = document.getElementById('vaca-edad');
    if (nacimientoInput && edadInput) {
        nacimientoInput.onchange = () => {
            if (!nacimientoInput.value) { edadInput.value = ''; return; }
            const birthDate = new Date(nacimientoInput.value);
            const today = new Date();
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
                years--; 
                months = (months + 12) % 12;
            }
            edadInput.value = `${years} años, ${months} meses`;
        };
    }

    // Configura el selector de sexo
    const sexoSelector = document.getElementById('sexo-selector');
    const sexoInput = document.getElementById('vaca-sexo');
    if (sexoSelector && sexoInput) {
        sexoSelector.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                const prev = sexoSelector.querySelector('.bg-brand-green');
                if (prev) prev.classList.remove('bg-brand-green', 'text-white');
                btn.classList.add('bg-brand-green', 'text-white');
                sexoInput.value = btn.dataset.value;
            };
        });
    }
    
    // Configura el input de la foto
    const fotoInput = document.getElementById('vaca-foto');
    if (fotoInput) {
        fotoInput.onchange = () => {
            if (fotoInput.files.length > 0) {
                const display = document.getElementById('file-name-display');
                if (display) display.textContent = fotoInput.files[0].name;
            }
        };
    }
    
    // Asigna los eventos de cerrar y enviar DESPUÉS de que el modal es visible.
    const btnCerrar = document.getElementById('btn-cerrar-modal-vaca');
    if (btnCerrar) btnCerrar.onclick = () => modal.classList.add('hidden');
    form.onsubmit = handleGuardarVaca;
}

    // Lógica del Propietario (handleGuardarVaca corregido)
    async function handleGuardarVaca(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('propietarioId', currentUser?.id || '');
        formData.append('ranchoId', currentUser?.ranchos?.[0]?.id || '');

        if (!formData.get('nombre') || !formData.get('siniiga')) {
            mostrarMensaje('vaca-mensaje', 'Nombre y SINIIGA son obligatorios.');
            return;
        }
        try {
            const res = await fetch('/api/vacas', { method: 'POST', body: formData });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message || 'Error al guardar vaca');
            
            mostrarMensaje('vaca-mensaje', 'Animal guardado con éxito', false);
            setTimeout(() => {
                const modal = document.getElementById('modal-agregar-vaca');
                if (modal) modal.classList.add('hidden');
                renderizarVistaMisVacas();
            }, 900);
        } catch (error) {
            mostrarMensaje('vaca-mensaje', error.message || 'Error inesperado');
        }
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

    async function renderizarVistaEstadisticas() {
        const ranchoId = currentUser?.ranchos?.[0]?.id;
        if (!ranchoId) return;

        const contenidoContainer = document.getElementById('contenido-estadisticas');
        if (!contenidoContainer) return;
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
            if (!tabsContainer) return;
            tabsContainer.innerHTML = ''; // Limpiar tabs
            
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

    // LÓGICA DEL MVZ (mantengo la estructura; eliminé duplicados de handleValidarRancho)
    function cargarDashboardMVZ() { 
        const datosDashboard = {
            visitas: 3, detalleVisitas: "2 ranchos, 1 remota", alertas: 5, detalleAlertas: "4 críticos, 1 parto",
            pendientes: [
                { id: 1, texto: "Lote 1: Revisión 3 vacas", rancho: "(El Roble)", completado: false },
                { id: 2, texto: "Lote B: Vacunación general", rancho: "(La Cabaña)", completado: true }
            ],
            eventos: [
                { fecha: "Mañana", texto: "Parto esperado vaca #123 (El Roble)" },
                { fecha: "Jueves", texto: "Chequeo reproductivo (La Hacienda)" }
            ]
        };
        document.getElementById('dash-nombre-mvz').textContent = currentUser?.nombre?.split(' ')[0] || '';
        document.getElementById('resumen-visitas').textContent = datosDashboard.visitas;
        document.getElementById('detalle-visitas').textContent = datosDashboard.detalleVisitas;
        document.getElementById('resumen-alertas-mvz').textContent = datosDashboard.alertas;
        document.getElementById('detalle-alertas').textContent = datosDashboard.detalleAlertas;
        const pendientesContainer = document.getElementById('lista-pendientes');
        if (pendientesContainer) pendientesContainer.innerHTML = datosDashboard.pendientes.map((p, i) => `<div class="flex justify-between items-center"><p><strong>${i+1}.</strong> ${p.texto} <em class="text-gray-500">${p.rancho}</em></p><button class="${p.completado ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white'} px-3 py-1 rounded-full text-sm font-semibold">${p.completado ? 'Completado' : 'Ver Detalles'}</button></div>`).join('');
        const eventosContainer = document.getElementById('lista-eventos');
        if (eventosContainer) eventosContainer.innerHTML = datosDashboard.eventos.map(e => `<div class="flex justify-between items-center"><p><i class="fa-solid fa-calendar-alt text-brand-green mr-2"></i><strong>${e.fecha}:</strong> ${e.texto}</p><i class="fa-solid fa-chevron-right text-gray-400"></i></div>`).join(''); 
    }
     
    const accionesContainerTop = document.getElementById('acciones-rapidas-container');
    if (accionesContainerTop) accionesContainerTop.innerHTML = ''; // safe init

    function initActividadesMvzListeners() {
        const modoCont = document.getElementById('modo-seleccion-container');
        const ranchoActions = document.getElementById('rancho-actions-container');
        if (modoCont) modoCont.classList.remove('hidden');
        if (ranchoActions) ranchoActions.classList.add('hidden');
        loteActividadActual = [];
        
        const btnShow = document.getElementById('btn-show-rancho-registrado');
        if (btnShow) btnShow.onclick = () => {
            const container = document.getElementById('rancho-access-container');
            if (container) container.classList.toggle('hidden');
        };
        const btnInd = document.getElementById('btn-iniciar-independiente');
        if (btnInd) btnInd.onclick = () => {
            currentRancho = { id: null, nombre: 'Rancho Independiente' };
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
        document.getElementById('rancho-independiente-input-container')?.classList.toggle('hidden', !esIndependiente);
        document.getElementById('rancho-nombre-activo').textContent = esIndependiente ? 'Trabajo Independiente' : (currentRancho?.nombre || '');
        document.getElementById('rancho-logo').src = currentRancho?.logo_url || 'assets/logo.png';
        
        const accionesContainer = document.getElementById('acciones-rapidas-container');
        if (accionesContainer) {
            accionesContainer.innerHTML = '';
            const colores = ['bg-teal-600', 'bg-sky-600', 'bg-lime-600', 'bg-amber-600'];
            const iconos = ['fa-syringe', 'fa-vial', 'fa-egg', 'fa-pills'];
        
            Object.keys(PROCEDIMIENTOS).forEach((key, index) => {
                const proc = PROCEDIMIENTOS[key];
                const button = document.createElement('button');
                button.className = `text-left ${colores[index % colores.length]} text-white p-4 rounded-lg font-bold flex items-center shadow-lg`;
                button.dataset.actividad = key;
                button.innerHTML = `<i class="fa-solid ${iconos[index % iconos.length]} w-6 text-center mr-3"></i>${proc.titulo}`;
                button.onclick = () => abrirModalActividad(key);
                accionesContainer.appendChild(button);
            });
        }
        
        renderizarHistorialMVZ();
        
    }

   function abrirModalActividad(tipo) {
    const modal = document.getElementById('modal-actividad');
    const form = document.getElementById('form-actividad-vaca');
    if (!modal || !form) return;
    
    form.reset();

    form.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
    });

    modal.classList.remove('hidden');

    const tituloEl = document.getElementById('modal-actividad-titulo');
    if (tituloEl && PROCEDIMIENTOS[tipo]) {
        tituloEl.textContent = PROCEDIMIENTOS[tipo].titulo;
    }

    const actividadLoteEl = document.getElementById('actividad-lote');
    if (actividadLoteEl) {
        actividadLoteEl.innerHTML = [1, 2, 3, 4, 5].map(l => `<option value="${l}">Lote ${l}</option>`).join('');
    }

    renderizarCamposProcedimiento(tipo);

    // CORRECCIÓN: no usar optional-chaining en el lado izquierdo de asignación
    const btnCerrar = document.getElementById('btn-cerrar-modal-actividad');
    if (btnCerrar) btnCerrar.onclick = () => modal.classList.add('hidden');

    const btnGuardar = document.getElementById('btn-guardar-siguiente');
    if (btnGuardar) btnGuardar.onclick = () => handleAgregarVacaAlLote(tipo, true);

    const btnFinalizar = document.getElementById('btn-finalizar-actividad-modal');
    if (btnFinalizar) btnFinalizar.onclick = async () => {
        handleAgregarVacaAlLote(tipo, false);
        await handleFinalizarYReportar();
        modal.classList.add('hidden');
    };
}

// En el nuevo main.js, busca la función que finaliza la actividad y reemplázala:
async function handleFinalizarYReportar() {
    if (loteActividadActual.length === 0) return;
    
    // Prepara el spinner y deshabilita el botón
    const btn = document.getElementById('btn-finalizar-actividad-modal'); // Asegúrate que el ID del botón sea correcto
    if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }

    try {
        const payload = {
            mvzId: currentUser?.id,
            ranchoId: currentRancho?.id || null,
            loteActividad: loteActividadActual,
            // Datos extra para el encabezado del PDF
            mvzNombre: currentUser?.nombre || '',
            ranchoNombre: currentRancho?.nombre || document.getElementById('rancho-independiente-nombre')?.value?.trim() || 'Independiente'
        };

        const res = await fetch('/api/actividades', { // Apuntamos al endpoint modificado
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            // Si el servidor devuelve un error, será en formato JSON
            const errData = await res.json();
            throw new Error(errData.message || 'Error en el servidor.');
        }

        // --- LÓGICA PARA DESCARGAR EL PDF (DE TU VERSIÓN ANTIGUA) ---
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_${loteActividadActual[0].tipoLabel}_${new Date().toISOString().slice(0,10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        // Limpiamos el lote y la UI
        loteActividadActual = [];
        const loteInfoEl = document.getElementById('lote-info');
            if (loteInfoEl) loteInfoEl.textContent = `0 vacas`;
            renderizarHistorialMVZ();

    } catch (err) {
        console.error("Error al finalizar y generar PDF:", err);
        alert(err.message || 'Hubo un error inesperado.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Finalizar Actividad'; }
    }
}

    async function renderizarHistorialMVZ() {
        const historialContainer = document.getElementById('historial-actividades-mvz');
        if (!historialContainer) return;
        historialContainer.innerHTML = '<p class="text-gray-500 text-center">Cargando historial...</p>';

        // aseguramos que el botón de PDF tenga el listener correcto después de renderizar el historial
        try {
            const res = await fetch(`/api/actividades/mvz/${currentUser?.id || ''}`);
            if (!res.ok) throw new Error('No se pudo cargar el historial.');
            const sesiones = await res.json();

            if (!sesiones || sesiones.length === 0) {
                historialContainer.innerHTML = '<p class="text-gray-500 text-center">No hay actividades recientes.</p>';
            } else {
                historialContainer.innerHTML = sesiones.map(sesion => {
    const ranchoNombre = sesion.rancho_nombre || 'No especificado';
    const conteoAnimales = sesion.conteo || 0;
    const fecha = sesion.fecha ? new Date(sesion.fecha).toLocaleDateString('es-MX', {day: 'numeric', month: 'long'}) : 'Inválida';

    return `
      <div class="bg-gray-100 p-3 rounded-lg flex items-center justify-between">
          <div class="flex items-center">
              <input type="checkbox" data-sesion-id="${sesion.sesion_id}" class="h-5 w-5 rounded border-gray-300 mr-3">
              <div>
                  <p class="font-semibold text-gray-800">${sesion.tipo_actividad} en <em>${ranchoNombre}</em></p>
                  <p class="text-xs text-gray-500">${conteoAnimales} animales - ${fecha}</p>
              </div>
          </div>
          <button data-sesion-id="${sesion.sesion_id}" class="btn-eliminar-sesion text-red-400 hover:text-red-600 px-2">
              <i class="fa-solid fa-trash-can"></i>
          </button>
      </div>
    `;
}).join('');
            }

            // botón PDF: (quitamos listeners previos y añadimos uno nuevo)
            const btnPdf = document.getElementById('btn-generar-pdf-historial');
            if (btnPdf) {
                btnPdf.replaceWith(btnPdf.cloneNode(true)); // remove all listeners simply
                const nuevoBtnPdf = document.getElementById('btn-generar-pdf-historial');
                if (nuevoBtnPdf) nuevoBtnPdf.addEventListener('click', handleGenerarPdfDeHistorial);
            }

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

        container.innerHTML = proc.campos.map(campo => {
            if (campo.tipo === 'select') {
                return `<div><label class="block text-sm font-medium text-gray-700">${campo.label}</label><select name="${campo.id}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg bg-white">${campo.opciones.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></div>`;
            } else if (campo.tipo === 'textarea') {
                return `<div><label class="block text-sm font-medium text-gray-700">${campo.label}</label><textarea name="${campo.id}" rows="2" class="mt-1 w-full p-2 border border-gray-300 rounded-lg"></textarea></div>`;
            } else if (campo.tipo === 'checkbox') {
                return `<label class="flex items-center space-x-2"><input type="checkbox" name="${campo.id}" value="Sí" class="h-5 w-5 rounded border-gray-300"><span class="text-sm font-medium text-gray-700">${campo.label}</span></label>`;
            } else { // text
                return `<div><label class="block text-sm font-medium text-gray-700">${campo.label}</label><input type="text" name="${campo.id}" placeholder="${campo.placeholder || ''}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg"></div>`;
            }
        }).join('');
        // --- LÓGICA AGREGADA ---
    // Añade los listeners para los campos condicionales
    proc.campos.forEach(campo => {
        if (campo.revela) {
            const triggerEl = container.querySelector(`[name="${campo.id}"]`);
            const targetEl = container.querySelector(`[name="${campo.revela}"]`).closest('div');

            if (triggerEl && targetEl) {
                triggerEl.addEventListener('change', () => {
                    const show = triggerEl.value === 'Sí';
                    targetEl.classList.toggle('hidden', !show);
                });
            }
        }
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

        const formData = new FormData(form);
        const detalles = {};
        for (const [key, value] of formData.entries()) {
            if (!['actividad-lote', 'actividad-arete'].includes(key) && value) {
                detalles[key] = value;
            }
        }
        
        loteActividadActual.push({
            areteVaca: arete,
            raza: (vacasIndex.get(arete) && vacasIndex.get(arete).raza) || 'N/A',
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
            // Limpia todo menos el lote
            form.querySelectorAll('input:not(#actividad-lote), select:not(#actividad-lote), textarea').forEach(el => {
                 if(el.type === 'checkbox') el.checked = false;
                 else el.value = '';
            });
            if (areteInput) areteInput.focus();
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
    
    initApp();
});