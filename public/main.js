document.addEventListener('DOMContentLoaded', () => {
    // ESTADO GLOBAL Y CONFIGURACIÓN
    let currentUser = null;
    let currentRancho = null;
    let loteActividadActual = [];
    let vacasIndex = new Map();
    let datosEstadisticasCompletos = null;
    let miGrafico = null;
    const API_URL = ''; // Cambiar si tu API está en otro dominio
    const appContent = document.getElementById('app-content');
    const navContainer = document.getElementById('nav-container');
    
    // DEFINICIONES
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

    // FUNCIONES DE AYUDA (HELPERS)
    const mostrarMensaje = (elId, texto, esError = true) => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.textContent = texto;
        const colorClass = esError ? 'text-red-500' : 'text-green-600';
        el.className = `text-sm h-4 text-center ${colorClass}`;
        setTimeout(() => { if (el) el.textContent = ''; }, 4000);
    };

    // NAVEGACIÓN Y RENDERIZADO DE VISTAS
    function navigateTo(viewId) {
        if (!appContent) return;
        
        const fabContainer = document.getElementById('fab-container');
        if (fabContainer) fabContainer.innerHTML = ''; // Limpiar FAB por defecto
        
        document.body.className = 'bg-brand-bg';
        appContent.innerHTML = '';
        const template = document.getElementById(`template-${viewId}`);
        if (!template) {
            appContent.innerHTML = `<p class="text-center p-8 text-red-500">Error: No se encontró la plantilla para: ${viewId}</p>`;
            return;
        }
        appContent.appendChild(template.content.cloneNode(true));
        
        // Lógica post-renderizado
        if (viewId.startsWith('login') || viewId.startsWith('registro')) {
            document.body.className = '';
            if (viewId === 'login') {
                document.getElementById('form-login').addEventListener('submit', handleLogin);
                document.getElementById('link-a-registro').addEventListener('click', () => navigateTo('registro'));
            } else {
                document.getElementById('form-registro').addEventListener('submit', handleRegister);
                document.getElementById('link-a-login').addEventListener('click', () => navigateTo('login'));
            }
        } else if (viewId === 'inicio-propietario') {
            document.getElementById('dash-nombre-propietario').textContent = currentUser?.nombre.split(' ')[0] || '';
            document.getElementById('dash-fecha-actual').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
            cargarDatosDashboardPropietario();
        } else if (viewId === 'mis-vacas') {
            renderizarVistaMisVacas();
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

    // MANEJADORES DE AUTENTICACIÓN
    async function handleLogin(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.classList.add('loading');
        btn.disabled = true;
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const res = await fetch(`/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message);
            currentUser = respuesta.user;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            iniciarSesion();
        } catch (err) {
            mostrarMensaje('login-mensaje', err.message);
        } finally {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    async function handleRegister(e) { /* Sin cambios, se mantiene funcional */ 
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        try {
            const res = await fetch(`/api/register`, { method: 'POST', body: formData });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message);
            mostrarMensaje('registro-mensaje', '¡Registro exitoso! Serás redirigido al login.', false);
            setTimeout(() => navigateTo('login'), 2000);
        } catch (err) {
            mostrarMensaje('registro-mensaje', err.message);
        }
    }
    
    // LÓGICA DEL PROPIETARIO
    async function cargarDatosDashboardPropietario() {
        if (!currentUser || currentUser.rol !== 'propietario') return;
        const ranchoId = currentUser.ranchos?.[0]?.id;
        if (!ranchoId) return;

        try {
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
            document.getElementById('lotes-container').innerHTML = '<p class="text-red-500">No se pudieron cargar los datos.</p>';
        }
    }

    async function renderizarVistaMisVacas() {
        const ranchoId = currentUser.ranchos?.[0]?.id;
        if (!ranchoId) return;

        const container = document.getElementById('lista-vacas-container');
        const fab = document.getElementById('btn-abrir-modal-vaca');
        
        fab.onclick = () => abrirModalVaca();

        try {
            const res = await fetch(`/api/vacas/rancho/${ranchoId}`);
            const vacas = await res.json();
            document.getElementById('total-vacas-header').textContent = vacas.length;
            
            if (vacas.length === 0) {
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
                                <button data-vaca-id="${vaca.id}" class="btn-eliminar-vaca text-red-500 hover:text-red-700"><i class="fa-solid fa-trash-can"></i></button>
                            </div>
                            <div class="text-xs text-gray-600 mt-2">
                                <span>Raza: <strong>${vaca.raza || 'N/A'}</strong></span> | 
                                <span>Nacimiento: <strong>${new Date(vaca.fecha_nacimiento).toLocaleDateString('es-MX')}</strong></span>
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
    
    function abrirModalVaca(vaca = null) {
        const modal = document.getElementById('modal-agregar-vaca');
        modal.classList.remove('hidden');

        const form = document.getElementById('form-agregar-vaca');
        form.reset();
        
        // Autocompletado de razas
        const datalistRazas = document.getElementById('lista-razas');
        datalistRazas.innerHTML = RAZAS_BOVINAS.map(r => `<option value="${r}"></option>`).join('');

        // Lógica de cálculo de edad
        const nacimientoInput = document.getElementById('vaca-nacimiento');
        const edadInput = document.getElementById('vaca-edad');
        nacimientoInput.onchange = () => {
            if (!nacimientoInput.value) {
                edadInput.value = '';
                return;
            }
            const birthDate = new Date(nacimientoInput.value);
            const today = new Date();
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
                years--;
                months += 12;
            }
            edadInput.value = `${years} años, ${months} meses`;
        };

        // Selector de sexo
        const sexoSelector = document.getElementById('sexo-selector');
        const sexoInput = document.getElementById('vaca-sexo');
        sexoSelector.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                sexoSelector.querySelector('.bg-brand-green')?.classList.remove('bg-brand-green', 'text-white');
                btn.classList.add('bg-brand-green', 'text-white');
                sexoInput.value = btn.dataset.value;
            }
        });

        document.getElementById('btn-cerrar-modal-vaca').onclick = () => modal.classList.add('hidden');
        form.onsubmit = handleGuardarVaca;
    }

    // Lógica del Propietario (handleGuardarVaca corregido)
    async function handleGuardarVaca(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        // Añadimos los datos que no están en el formulario directamente
        formData.append('propietarioId', currentUser.id);
        formData.append('ranchoId', currentUser.ranchos?.[0]?.id);

        if (!formData.get('nombre') || !formData.get('siniiga')) {
            mostrarMensaje('vaca-mensaje', 'Nombre y SINIIGA son obligatorios.');
            return;
        }

        try {
            // ¡IMPORTANTE! No se pone 'Content-Type', el navegador lo hace solo con FormData
            const res = await fetch('/api/vacas', { method: 'POST', body: formData });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message);
            
            mostrarMensaje('vaca-mensaje', 'Animal guardado con éxito', false);
            setTimeout(() => {
                document.getElementById('modal-agregar-vaca').classList.add('hidden');
                renderizarVistaMisVacas();
            }, 1500);

        } catch (error) {
            mostrarMensaje('vaca-mensaje', error.message);
        }
    }

    async function handleEliminarVaca(vacaId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este animal? Esta acción no se puede deshacer.')) return;
        
        try {
            const res = await fetch(`/api/vacas/${vacaId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('No se pudo eliminar la vaca.');
            
            renderizarVistaMisVacas(); // Recargar la lista
        } catch (error) {
            alert(error.message);
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
            contenidoContainer.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
        }
    }
    
    function renderizarGraficoLote(loteId) {
        const datosLote = datosEstadisticasCompletos[loteId];
        const contenidoContainer = document.getElementById('contenido-estadisticas');
        if (!datosLote) {
             contenidoContainer.innerHTML = `<p class="text-center text-red-500">No se encontraron datos para el lote ${loteId}.</p>`;
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
                        <span class="text-3xl font-bold text-gray-800">${datosLote.totalVacas}</span>
                        <span class="text-sm text-gray-500">Total de Vacas</span>
                    </div>
                </div>
                <div id="stats-resumen-texto" class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm"></div>
            </div>`;

        const ctx = document.getElementById('grafico-reproductivo').getContext('2d');
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

        miGrafico = new Chart(ctx, {
            type: 'doughnut', data, options: {
            responsive: true, maintainAspectRatio: false, cutout: '70%',
            plugins: { legend: { display: false } }
        }});
        
        document.getElementById('stats-resumen-texto').innerHTML = `
            <p><strong>Gestantes:</strong> ${estados.Gestante || 0} vacas (${Math.round((estados.Gestante/totalVacas)*100)}%)</p>
            <p><strong>Estáticas:</strong> ${estados.Estatica || 0} vacas (${Math.round((estados.Estatica/totalVacas)*100)}%)</p>
            <p><strong>Ciclando:</strong> ${estados.Ciclando || 0} vacas (${Math.round((estados.Ciclando/totalVacas)*100)}%)</p>
            <p><strong>Raza Pred.:</strong> ${Object.keys(datosLote.razas)[0] || 'N/A'}</p>
        `;
    }

    // LÓGICA DEL MVZ
    function cargarDashboardMVZ() { /* Sin cambios, se mantiene funcional */ 
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
        document.getElementById('dash-nombre-mvz').textContent = currentUser.nombre.split(' ')[0];
        document.getElementById('resumen-visitas').textContent = datosDashboard.visitas;
        document.getElementById('detalle-visitas').textContent = datosDashboard.detalleVisitas;
        document.getElementById('resumen-alertas-mvz').textContent = datosDashboard.alertas;
        document.getElementById('detalle-alertas').textContent = datosDashboard.detalleAlertas;
        const pendientesContainer = document.getElementById('lista-pendientes');
        pendientesContainer.innerHTML = datosDashboard.pendientes.map((p, i) => `<div class="flex justify-between items-center"><p><strong>${i+1}.</strong> ${p.texto} <em class="text-gray-500">${p.rancho}</em></p><button class="${p.completado ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white'} px-3 py-1 rounded-full text-sm font-semibold">${p.completado ? 'Completado' : 'Ver Detalles'}</button></div>`).join('');
        const eventosContainer = document.getElementById('lista-eventos');
        eventosContainer.innerHTML = datosDashboard.eventos.map(e => `<div class="flex justify-between items-center"><p><i class="fa-solid fa-calendar-alt text-brand-green mr-2"></i><strong>${e.fecha}:</strong> ${e.texto}</p><i class="fa-solid fa-chevron-right text-gray-400"></i></div>`).join('');
    }
     
    const accionesContainer = document.getElementById('acciones-rapidas-container');
        accionesContainer.innerHTML = ''; // Limpiar
        const colores = ['bg-teal-600', 'bg-sky-600', 'bg-lime-600', 'bg-amber-600'];
        const iconos = ['fa-syringe', 'fa-vial', 'fa-egg', 'fa-pills'];


    // REEMPLAZA LAS FUNCIONES ANTIGUAS CON ESTAS DOS

function initActividadesMvzListeners() {
    // Esta función SÓLO prepara la pantalla inicial de selección.
    document.getElementById('modo-seleccion-container').classList.remove('hidden');
    document.getElementById('rancho-actions-container').classList.add('hidden');
    loteActividadActual = [];
    
    document.getElementById('btn-show-rancho-registrado').onclick = () => document.getElementById('rancho-access-container').classList.toggle('hidden');
    
    document.getElementById('btn-iniciar-independiente').onclick = () => {
        currentRancho = { id: null, nombre: 'Rancho Independiente' };
        iniciarActividadUI(); // Llama a la siguiente función para construir la vista de actividades
    };

    document.getElementById('btn-validar-rancho').onclick = handleValidarRancho;
}

// REEMPLAZA ESTA FUNCIÓN
function iniciarActividadUI() {
    document.getElementById('modo-seleccion-container').classList.add('hidden');
    document.getElementById('rancho-actions-container').classList.remove('hidden');

    const esIndependiente = !currentRancho.id;
    document.getElementById('rancho-independiente-input-container').classList.toggle('hidden', !esIndependiente);
    document.getElementById('rancho-nombre-activo').textContent = esIndependiente ? 'Trabajo Independiente' : currentRancho.nombre;
    document.getElementById('rancho-logo').src = currentRancho.logo_url || 'logo.png';
    // Aquí es el lugar CORRECTO para crear los botones
    const accionesContainer = document.getElementById('acciones-rapidas-container');
    accionesContainer.innerHTML = ''; // Limpiar
    const colores = ['bg-teal-600', 'bg-sky-600', 'bg-lime-600', 'bg-amber-600'];
    const iconos = ['fa-syringe', 'fa-vial', 'fa-egg', 'fa-pills'];

        Object.keys(PROCEDIMIENTOS).forEach((key, index) => {
        const proc = PROCEDIMIENTOS[key];
        const color = colores[index % colores.length];
        const icono = iconos[index % iconos.length];
        const button = document.createElement('button');
        button.className = `flex-shrink-0 w-4/5 mr-4 text-left ${color} text-white p-4 rounded-lg font-bold flex items-center shadow-lg`;
        button.dataset.actividad = key;
        button.innerHTML = `<i class="fa-solid ${icono} w-6 text-center mr-3"></i>${proc.titulo}`;
        button.onclick = () => abrirModalActividad(key);
        accionesContainer.appendChild(button);
        // ¡NUEVO! Carga el historial al iniciar y activa el botón de PDF
    renderizarHistorialMVZ();
    document.getElementById('btn-generar-pdf-historial').onclick = handleGenerarPdfDeHistorial;
    });
    
    // ¡NUEVO! Carga el historial al iniciar y activa el botón de PDF
    renderizarHistorialMVZ();
    document.getElementById('btn-generar-pdf-historial').onclick = handleGenerarPdfDeHistorial;
}
    async function handleValidarRancho() {
        const codigo = document.getElementById('codigo-rancho').value.trim().toUpperCase();
        if (!codigo) { mostrarMensaje('mensaje-rancho', 'El código no puede estar vacío.'); return; }
        try {
            const res = await fetch(`/api/rancho/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message);
            currentRancho = respuesta;
            iniciarActividadUI();
            await cargarVacasParaMVZ();
        } catch (err) {
            mostrarMensaje('mensaje-rancho', err.message);
        }
    }

    function iniciarActividadUI() {
    document.getElementById('modo-seleccion-container').classList.add('hidden');
    document.getElementById('rancho-actions-container').classList.remove('hidden');

    const esIndependiente = !currentRancho.id;
    document.getElementById('rancho-independiente-input-container').classList.toggle('hidden', !esIndependiente);
    document.getElementById('rancho-nombre-activo').textContent = esIndependiente ? 'Trabajo Independiente' : currentRancho.nombre;
    document.getElementById('rancho-logo').src = currentRancho.logo_url || 'logo.png';
    
    // --- INICIO DE LA CORRECCIÓN ---
    // Se eliminó el forEach que causaba el error y se dejó solo el código que sí se necesita.
    const accionesContainer = document.getElementById('acciones-rapidas-container');
    accionesContainer.innerHTML = ''; // Limpiar por si acaso
    const colores = ['bg-teal-600', 'bg-sky-600', 'bg-lime-600', 'bg-amber-600'];
    const iconos = ['fa-syringe', 'fa-vial', 'fa-egg', 'fa-pills'];

    Object.keys(PROCEDIMIENTOS).forEach((key, index) => {
        const proc = PROCEDIMIENTOS[key];
        const color = colores[index % colores.length];
        const icono = iconos[index % iconos.length];
        const button = document.createElement('button');
        // Se corrigió la clase para que los botones tengan margen y no se peguen
        button.className = `flex-shrink-0 w-4/5 mr-4 text-left ${color} text-white p-4 rounded-lg font-bold flex items-center`;
        button.dataset.actividad = key;
        button.innerHTML = `<i class="fa-solid ${icono} w-6 text-center mr-3"></i>${proc.titulo}`;
        button.onclick = () => abrirModalActividad(key);
        accionesContainer.appendChild(button);
    });
        document.getElementById('btn-generar-pdf-historial').onclick = () => alert("Función para generar PDF de historial en desarrollo.");
    }

    function abrirModalActividad(tipo) {
    const modal = document.getElementById('modal-actividad');
    const form = document.getElementById('form-actividad-vaca');
    form.reset(); // LIMPIAR EL FORMULARIO
    
    modal.classList.remove('hidden');
    document.getElementById('modal-actividad-titulo').textContent = PROCEDIMientos[tipo].titulo;
    
    const selLote = document.getElementById('actividad-lote');
    selLote.innerHTML = [1, 2, 3, 4, 5].map(l => `<option value="${l}">Lote ${l}</option>`).join('');
    
    renderizarCamposProcedimiento(tipo);
    document.getElementById('btn-cerrar-modal-actividad').onclick = () => modal.classList.add('hidden');
    document.getElementById('btn-guardar-siguiente').onclick = () => handleAgregarVacaAlLote(tipo, true);
    
    // ----- LÍNEA CORREGIDA -----
    // Ahora llama a la función asíncrona correcta 'handleFinalizarYReportar'
    document.getElementById('btn-finalizar-actividad-modal').onclick = async () => {
        handleAgregarVacaAlLote(tipo, false);
        await handleFinalizarYReportar(); // <-- LLAMADA CORRECTA
        modal.classList.add('hidden');
    };
}
   // REEMPLAZA ESTA FUNCIÓN
async function handleFinalizarYReportar() {
    if (loteActividadActual.length === 0) return;

    const btn = document.getElementById('btn-finalizar-actividad-modal');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Guardando...';

    try {
        // Solo guarda la actividad en la base de datos
        const payload = {
            mvzId: currentUser.id,
            ranchoId: currentRancho?.id || null,
            ranchoNombre: currentRancho?.id ? currentRancho.nombre : document.getElementById('rancho-independiente-nombre').value.trim(),
            loteActividad: loteActividadActual
        };
        const resSave = await fetch('/api/actividades', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!resSave.ok) throw new Error('No se pudo guardar la actividad.');

        // Limpia el estado y actualiza el historial en pantalla
        loteActividadActual = [];
        document.getElementById('lote-info').textContent = `0 vacas`;
        renderizarHistorialMVZ(); // ¡Actualiza la lista!
        
    } catch (err) {
        console.error("Error al finalizar:", err);
        alert('Hubo un error al guardar la actividad.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check-circle mr-2"></i>Finalizar Actividad';
    }
}
// AGREGA ESTAS DOS NUEVAS FUNCIONES

async function renderizarHistorialMVZ() {
    const historialContainer = document.getElementById('historial-actividades-mvz');
    historialContainer.innerHTML = '<p class="text-gray-500 text-center">Cargando historial...</p>';

    try {
        const res = await fetch(`/api/actividades/mvz/${currentUser.id}`);
        if (!res.ok) throw new Error('No se pudo cargar el historial.');
        const sesiones = await res.json();

        if (sesiones.length === 0) {
            historialContainer.innerHTML = '<p class="text-gray-500 text-center">No hay actividades recientes.</p>';
            return;
        }

        historialContainer.innerHTML = sesiones.map(sesion => `
            <div class="bg-gray-100 p-3 rounded-lg flex items-center justify-between">
                <div class="flex items-center">
                    <input type="checkbox" data-sesion-id="${sesion.sesion_id}" class="h-5 w-5 rounded border-gray-300 mr-3">
                    <div>
                        <p class="font-semibold text-gray-800">${sesion.tipo_actividad} en <em>${sesion.rancho_nombre}</em></p>
                        <p class="text-xs text-gray-500">${sesion.conteo} animales - ${new Date(sesion.fecha).toLocaleDateString('es-MX', {day: 'numeric', month: 'long'})}</p>
                    </div>
                </div>
            </div>
        `).join('');

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
            body: JSON.stringify({ sesion_ids: sesionesSeleccionadas, mvzNombre: currentUser.nombre })
        });

        if (!res.ok) throw new Error('El servidor no pudo generar el PDF.');
        
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
    }

    async function cargarVacasParaMVZ() {
        if (!currentRancho || !currentRancho.id) return;
        try {
            const res = await fetch(`/api/vacas/rancho/${currentRancho.id}`);
            const vacas = await res.json();
            const datalist = document.getElementById('lista-aretes-autocompletar');
            datalist.innerHTML = '';
            vacasIndex.clear();
            vacas.forEach(v => {
                datalist.insertAdjacentHTML('beforeend', `<option value="${v.numero_siniiga}">`);
                vacasIndex.set(String(v.numero_siniiga).trim(), { id: v.id, nombre: v.nombre, raza: v.raza || '' });
            });
        } catch (err) { console.error("Error cargando vacas para MVZ:", err); }
    }

    function handleAgregarVacaAlLote(tipoActividad, limpiarForm) {
        const form = document.getElementById('form-actividad-vaca');
        const areteInput = document.getElementById('actividad-arete');
        const loteNumero = document.getElementById('actividad-lote').value;
        const arete = areteInput.value.trim();

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
            raza: vacasIndex.get(arete)?.raza || 'N/A',
            loteNumero: loteNumero,
            tipo: tipoActividad,
            tipoLabel: PROCEDIMIENTOS[tipoActividad].titulo,
            fecha: new Date().toISOString().split('T')[0],
            detalles: detalles
        });
        
        mostrarMensaje('mensaje-vaca', `Vaca ${arete} agregada.`, false);
        document.getElementById('lote-info').textContent = `${loteActividadActual.length} vacas (Lote ${loteNumero})`;
        
        if (limpiarForm) {
            // Limpia todo menos el lote
            form.querySelectorAll('input:not(#actividad-lote), select:not(#actividad-lote), textarea').forEach(el => {
                 if(el.type === 'checkbox') el.checked = false;
                 else el.value = '';
            });
            areteInput.focus();
        }
    }

        // INICIALIZACIÓN DE LA APLICACIÓN
    function initApp() {
        setupNavigation();
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            iniciarSesion();
        } else {
            navContainer.classList.add('hidden');
            navigateTo('login');
        }
    }
    
    initApp();
});