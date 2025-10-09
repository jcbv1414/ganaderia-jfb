document.addEventListener('DOMContentLoaded', () => {

    // ESTADO GLOBAL Y CONFIGURACIÓN
    let currentUser = null;
    let currentRancho = null;
    let loteActual = []; 
    let vacasIndex = new Map();
    let datosEstadisticasCompletos = null; // Para guardar los datos de estadísticas
    let miGrafico = null; // Para poder destruir la gráfica anterior

    const API_URL = '/api';
    const appContent = document.getElementById('app-content');
    const navContainer = document.getElementById('nav-container');
    
    const PROCEDIMIENTOS = {
        palpacion: {
            titulo: "Palpación",
            campos: [
                { id: "estatica", label: "Estática", tipo: "select", opciones: ["Sí", "No"] },
                { id: "ciclando", label: "Ciclando", tipo: "select", opciones: ["Sí", "No"], revela: "ciclando_detalle" },
                { id: "ciclando_detalle", label: "Detalle Ciclo", tipo: "select", opciones: ["I1", "I2", "I3", "D1", "D2", "D3"], oculto: true },
                { id: "gestante", label: "Gestante", tipo: "select", opciones: ["Sí", "No"], revela: "gestante_detalle" },
                { id: "gestante_detalle", label: "Edad Gestacional", tipo: "select", opciones: ["1 a 3 meses", "3 a 6 meses", "6 a 9 meses"], oculto: true },
                { id: "sucia", label: "Sucia", tipo: "checkbox" },
                { id: "observaciones", label: "Observaciones", tipo: "textarea" }
            ]
        },
        inseminacion: {
            titulo: "Inseminación",
            campos: [
                { id: "tecnica", label: "Técnica", tipo: "select", opciones: ["IATF", "IA Convencional"], revela: "fecha_celo" },
                { id: "fecha_celo", label: "Fecha/Hora de Celo Detectado", tipo: "datetime-local", oculto: true },
                { id: "pajilla_toro", label: "Pajilla / Toro", tipo: "text", placeholder: "Nombre del toro" },
                { id: "dosis", label: "Dosis", tipo: "select", opciones: ["1 dosis", "2 dosis", "3 dosis", "4 dosis"] },
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
    const RAZAS_BOVINAS = ['Aberdeen Angus', 'Ayrshire', 'Bazadaise', 'Beefmaster', 'Belgian Blue', 'Brahman', 'Brangus', 'Charolais', 'Chianina', 'Criollo', 'Suizo', 'Galloway', 'Gelbvieh', 'Gyr', 'Guzerá', 'Gyr Lechero', 'Guernsey', 'Hereford', 'Holstein', 'Jersey', 'Limousin', 'Maine-Anjou', 'Marchigiana', 'Montbéliarde', 'Normando', 'Pardo Suizo', 'Piemontese', 'Pinzgauer', 'Romagnola', 'Sahiwal', 'Santa Gertrudis', 'Sardo Negro', 'Shorthorn', 'Simbrah', 'Simmental', 'Sindi', 'Tarentaise', 'Wagyu'].sort((a, b) => a.localeCompare(b));


    // =================================================================
    // ===== 3. FUNCIONES DE AYUDA (HELPERS) ===========================
    // =================================================================
    const mostrarMensaje = (elId, texto, esError = true) => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.textContent = texto;
        const colorClass = esError ? 'text-red-500' : 'text-green-600';
        const authColorClass = esError ? 'text-red-400' : 'text-green-400';
        // Adaptar color para la vista de login/registro
        el.className = el.closest('.auth-container') ? `text-center mt-2 text-sm h-4 ${authColorClass}` : `text-sm mt-2 h-4 ${colorClass}`;
        setTimeout(() => { if (el) el.textContent = ''; }, 4000);
    };

    // =================================================================
    // ===== 4. NAVEGACIÓN Y RENDERIZADO DE VISTAS =====================
    // =================================================================
    function navigateTo(viewId) {
        if (!appContent) { console.error('Elemento #app-content no encontrado.'); return; }
        
        if (viewId === 'estadisticas') {
            renderizarVistaEstadisticas()
        }

        const fab = document.getElementById('fab-container');
        if (fab) fab.classList.add('hidden');
        document.body.className = 'bg-brand-bg'; // Estilo por defecto

        appContent.innerHTML = '';
        const template = document.getElementById(`template-${viewId}`);
        if (!template) {
            appContent.innerHTML = `<p class="text-center p-8 text-red-500">Error: No se encontró la plantilla para: ${viewId}</p>`;
            return;
        }
        appContent.appendChild(template.content.cloneNode(true));

        if (viewId === 'login' || viewId === 'registro') {
            document.body.className = ''; // Quitar clases para que el contenedor auth tome control
        }

        if (viewId === 'login') {
            document.getElementById('form-login').addEventListener('submit', handleLogin);
            document.getElementById('link-a-registro').addEventListener('click', () => navigateTo('registro'));
        } else if (viewId === 'registro') {
            document.getElementById('form-registro').addEventListener('submit', handleRegister);
            document.getElementById('link-a-login').addEventListener('click', () => navigateTo('login'));
        } else if (viewId === 'inicio-propietario') {
            document.getElementById('dash-nombre-propietario').textContent = currentUser?.nombre.split(' ')[0] || '';
            document.getElementById('dash-fecha-actual').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
            if (fab) fab.classList.remove('hidden');
            cargarDatosDashboard();
        } else if (viewId === 'inicio-mvz') {
            
            if (fab) fab.classList.add('hidden');
            cargarDashboardMVZ();
        } 
        // Cambiamos 'actividades-mvz' por el nuevo nombre
        else if (viewId === 'manejo-reproductivo-mvz') { 
            // Y llamamos a la función con el nuevo nombre
            initManejoReproductivoListeners(); 
        }
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

    


    // =================================================================
    // ===== 5. MANEJADORES DE EVENTOS (HANDLERS) COMPLETOS ============
    // =================================================================
    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const res = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message);
            currentUser = respuesta.user;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            iniciarSesion();
        } catch (err) {
            mostrarMensaje('login-mensaje', err.message);
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        try {
            const res = await fetch(`${API_URL}/register`, { method: 'POST', body: formData });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message);
            mostrarMensaje('registro-mensaje', '¡Registro exitoso! Serás redirigido al login.', false);
            setTimeout(() => navigateTo('login'), 2000);
        } catch (err) {
            mostrarMensaje('registro-mensaje', err.message);
        }
    }

    // =================================================================
    // ===== 6. LÓGICA DE VISTAS Y DATOS COMPLETAS =====================
    // =================================================================
    
    // --- LÓGICA DEL PROPIETARIO ---
    async function cargarDatosDashboard() {
        if (!currentUser || currentUser.rol !== 'propietario') return;
        try {
            const ranchoId = currentUser.ranchos?.[0]?.id;
            if (!ranchoId) return;

            const res = await fetch(`${API_URL}/rancho/${ranchoId}/estadisticas`);
            if (!res.ok) throw new Error('No se pudieron cargar las estadísticas.');
            const stats = await res.json();

            let totalVacas = 0, totalGestantes = 0;
            for (const lote in stats) {
                totalVacas += stats[lote].totalVacas || 0;
                totalGestantes += (stats[lote].estados && stats[lote].estados.Gestante) || 0;
            }
            document.getElementById('resumen-total-vacas').textContent = totalVacas;
            document.getElementById('resumen-vacas-gestantes').textContent = totalGestantes;
            document.getElementById('resumen-alertas').textContent = 3; 

            const lotesContainer = document.getElementById('lotes-container');
            if (!lotesContainer) return;
            lotesContainer.innerHTML = '';
            
            if (Object.keys(stats).length === 0) {
                 lotesContainer.innerHTML = '<p class="text-gray-500">No hay lotes con datos para mostrar.</p>';
                 return;
            }
            
            Object.entries(stats).forEach(([numeroLote, datosLote]) => {
                const vacasEnLote = datosLote.totalVacas || 0;
                const gestantesEnLote = datosLote.estados?.Gestante || 0;
                const porcentajeGestacion = vacasEnLote > 0 ? Math.round((gestantesEnLote / vacasEnLote) * 100) : 0;
                
                let colorProgreso = '#22c55e';
                if (numeroLote === 'B') { colorProgreso = '#ef4444'; }

                const loteCardHTML = `
                    <div class="bg-white p-4 rounded-xl shadow-md flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="progress-ring mr-4" style="--value: ${porcentajeGestacion}; --color: ${colorProgreso};">
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
            console.error("Error al cargar datos del dashboard:", error);
            document.getElementById('lotes-container').innerHTML = '<p class="text-red-500">No se pudieron cargar los datos.</p>';
        }
    }
    // --- NUEVA LÓGICA PARA LA VISTA DE ESTADÍSTICAS ---
    async function renderizarVistaEstadisticas() {
        try {
            const ranchoId = currentUser?.ranchos?.[0]?.id;
            if (!ranchoId) throw new Error('No se encontró rancho.');
            
            const res = await fetch(`${API_URL}/rancho/${ranchoId}/estadisticas`);
            if (!res.ok) throw new Error('No se pudieron cargar las estadísticas.');
            
            datosEstadisticasCompletos = await res.json();
            
            const tabsContainer = document.getElementById('tabs-lotes-container');
            const lotes = Object.keys(datosEstadisticasCompletos);

            if (!tabsContainer) return;
            tabsContainer.innerHTML = ''; // Limpiar tabs anteriores

            if (lotes.length === 0) {
                document.getElementById('contenido-estadisticas').innerHTML = '<p class="text-center text-gray-500">No hay datos suficientes para mostrar estadísticas.</p>';
                return;
            }

            // Crear las pestañas para cada lote
            lotes.forEach(lote => {
                const tabButton = document.createElement('button');
                tabButton.className = 'py-2 px-4 text-gray-500 font-semibold border-b-2 border-transparent';
                tabButton.textContent = lote === 'Sin Lote' ? 'Sin Asignar' : `Lote ${lote}`;
                tabButton.dataset.loteId = lote;
                tabsContainer.appendChild(tabButton);
            });

            // Añadir evento de clic a las pestañas
            tabsContainer.querySelectorAll('button').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    tabsContainer.querySelector('.active-tab')?.classList.remove('active-tab', 'text-brand-green', 'border-brand-green');
                    e.currentTarget.classList.add('active-tab', 'text-brand-green', 'border-brand-green');
                    renderizarGraficoLote(e.currentTarget.dataset.loteId);
                });
            });

            // Simular clic en la primera pestaña para mostrarla por defecto
            if (tabsContainer.firstChild) {
                tabsContainer.firstChild.click();
            }

        } catch (error) {
            console.error('Error al renderizar estadísticas:', error);
            document.getElementById('contenido-estadisticas').innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
        }
    }

    function renderizarGraficoLote(loteId) {
        const datosLote = datosEstadisticasCompletos[loteId];
        if (!datosLote) return;

        // Actualizar títulos
        document.getElementById('stats-titulo-lote').textContent = `Lote ${loteId}: Vacas en Ordeño`; // Placeholder, se puede ajustar
        document.getElementById('stats-fecha-actualizacion').textContent = `Última Actualización: ${new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}`;

        // Preparar datos para la gráfica
        const ctx = document.getElementById('grafico-reproductivo').getContext('2d');
        const estados = datosLote.estados || {};
        
        const data = {
            labels: ['Gestantes', 'Estáticas', 'Ciclando', 'Secas'], // "Secas" es un ejemplo, puedes ajustarlo
            datasets: [{
                data: [estados.Gestante || 0, estados.Estatica || 0, estados.Ciclando || 0, 2], // '2' es un dato de ejemplo para 'Secas'
                backgroundColor: ['#2dd4bf', '#facc15', '#fb923c', '#9ca3af'], // Verde azulado, Amarillo, Naranja, Gris
                borderColor: '#ffffff',
                borderWidth: 4,
                hoverOffset: 8
            }]
        };

        // Destruir la gráfica anterior si existe
        if (miGrafico) {
            miGrafico.destroy();
        }

        // Crear la nueva gráfica de dona
        miGrafico = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false // Ocultamos la leyenda original
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw} vacas`;
                            }
                        }
                    }
                }
            }
        });

        // Actualizar el resumen en texto
        const resumenContainer = document.getElementById('stats-resumen-texto');
        resumenContainer.innerHTML = `
            <p><strong class="font-bold text-gray-800">Total de Vacas:</strong> ${datosLote.totalVacas}</p>
            <p><strong class="font-bold text-gray-800">Gestantes:</strong> ${estados.Gestante || 0} vacas</p>
            <p><strong class="font-bold text-gray-800">Estáticas:</strong> ${estados.Estatica || 0} vacas</p>
            <p><strong class="font-bold text-gray-800">Ciclando:</strong> ${estados.Ciclando || 0} vacas</p>
            <p><strong class="font-bold text-gray-800">Raza:</strong> ${Object.keys(datosLote.razas)[0] || 'N/A'}</p>
        `;
    }
     function cargarDashboardMVZ() {
        // Por ahora, usamos datos de ejemplo.
        // En el futuro, esto vendrá de un nuevo endpoint en server.js
        const datosDashboard = {
            visitas: 3,
            detalleVisitas: "2 ranchos, 1 remota",
            alertas: 5,
            detalleAlertas: "4 críticos, 1 parto",
            pendientes: [
                { id: 1, texto: "Lote 1: Revisión 3 vacas", rancho: "(El Roble)", completado: false },
                { id: 2, texto: "Lote B: Vacunación general", rancho: "(La Cabaña)", completado: true }
            ],
            eventos: [
                { fecha: "Mañana", texto: "Parto esperado vaca #123 (El Roble)" },
                { fecha: "Jueves", texto: "Chequeo reproductivo (La Hacienda)" }
            ]
        };

        // Rellenar Resumen Diario
        document.getElementById('resumen-visitas').textContent = datosDashboard.visitas;
        document.getElementById('detalle-visitas').textContent = datosDashboard.detalleVisitas;
        document.getElementById('resumen-alertas').textContent = datosDashboard.alertas;
        document.getElementById('detalle-alertas').textContent = datosDashboard.detalleAlertas;
        
        // Rellenar Pendientes
        const pendientesContainer = document.getElementById('lista-pendientes');
        pendientesContainer.innerHTML = ''; // Limpiar
        datosDashboard.pendientes.forEach((pendiente, index) => {
            const estadoHTML = pendiente.completado
                ? `<button class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">Completado</button>`
                : `<button class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">Ver Detalles</button>`;
            
            pendientesContainer.innerHTML += `
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-semibold text-gray-800"><span class="text-blue-600 font-bold">${index + 1}</span> ${pendiente.texto}</p>
                        <p class="text-sm text-gray-500 ml-4">${pendiente.rancho}</p>
                    </div>
                    ${estadoHTML}
                </div>
            `;
        });
        
        // Rellenar Eventos
        const eventosContainer = document.getElementById('lista-eventos');
        eventosContainer.innerHTML = ''; // Limpiar
        datosDashboard.eventos.forEach(evento => {
            eventosContainer.innerHTML += `
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-semibold text-gray-800"><i class="fa-solid fa-calendar-alt text-brand-green mr-2"></i>${evento.fecha}:</p>
                        <p class="text-sm text-gray-600 ml-6">${evento.texto}</p>
                    </div>
                    <i class="fa-solid fa-chevron-right text-gray-400"></i>
                </div>
            `;
        });
    }
    // --- LÓGICA DEL MVZ ---
   function initManejoReproductivoListeners() {
        // Estado inicial de la pantalla
        document.getElementById('modo-seleccion-container').classList.remove('hidden');
        document.getElementById('rancho-access-container').classList.add('hidden');
        document.getElementById('rancho-actions-container').classList.add('hidden');
        loteActual = []; // Limpiamos el lote al entrar
        
        // Listeners para los botones de modo
        document.getElementById('btn-show-rancho-registrado').onclick = () => {
            document.getElementById('rancho-access-container').classList.remove('hidden');
        };
        document.getElementById('btn-iniciar-independiente').onclick = () => {
            iniciarActividad('Rancho Independiente');
        };
        document.getElementById('btn-validar-rancho').onclick = handleValidarRancho; 
    }

   async function handleValidarRancho() {
        const codigo = document.getElementById('codigo-rancho').value.trim().toUpperCase();
        if (!codigo) { mostrarMensaje('mensaje-rancho', 'El código no puede estar vacío.'); return; }
        try {
            const res = await fetch(`${API_URL}/rancho/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message);
            currentRancho = respuesta;
            iniciarActividad(currentRancho.nombre, currentRancho.logo_url);
            await cargarVacasParaMVZ(); // Cargar vacas solo si es un rancho registrado
        } catch (err) {
            mostrarMensaje('mensaje-rancho', err.message);
        }
    }
     function iniciarActividad(nombreRancho, logoUrl = 'https://i.imgur.com/s6l2h27.png') {
    document.getElementById('modo-seleccion-container').classList.add('hidden');
    document.getElementById('rancho-actions-container').classList.remove('hidden');
    document.getElementById('rancho-nombre-activo').textContent = nombreRancho;
    document.getElementById('rancho-logo').src = logoUrl;
    
    // ===== LÓGICA PARA MOSTRAR CAMPO DE NOMBRE EN MODO INDEPENDIENTE =====
    const nombreIndependienteContainer = document.getElementById('rancho-independiente-input-container');
    if (nombreRancho === 'Rancho Independiente') {
        nombreIndependienteContainer.classList.remove('hidden');
        document.getElementById('rancho-independiente-nombre').value = ''; // Limpiamos el campo
    } else {
        nombreIndependienteContainer.classList.add('hidden');
    }
    // =====================================================================

    // Listeners para las acciones
    document.getElementById('btn-abrir-modal-palpacion').onclick = () => abrirModalActividad('palpacion');
    
    // !!! HEMOS QUITADO EL LISTENER DEL BOTÓN DE FINALIZAR DE AQUÍ !!!
}
    
    function abrirModalActividad(tipo) {
    const modal = document.getElementById('modal-palpacion');
    modal.classList.remove('hidden');
    
    // Poblar select de Lotes
    const selLote = document.getElementById('actividad-lote');
    selLote.innerHTML = '';
    // Puedes mejorar esto para que cargue los lotes reales del rancho si existe
    const lotesDisponibles = currentRancho?.lotes || [1, 2, 3, 4, 5];
    lotesDisponibles.forEach(l => selLote.add(new Option(`Lote ${l}`, l)));
    
    // Renderizar campos dinámicos
    renderizarCamposProcedimiento(tipo);

    // Listeners del modal
    document.getElementById('btn-cerrar-modal-palpacion').onclick = () => modal.classList.add('hidden');
    
    // ===== NUEVOS LISTENERS PARA LOS BOTONES DEL FOOTER =====
    document.getElementById('btn-guardar-siguiente').onclick = (e) => {
        e.preventDefault();
        handleAgregarVacaAlLote(tipo); // Solo guarda y limpia para la siguiente
    };

    document.getElementById('btn-finalizar-reporte-modal').onclick = (e) => {
        e.preventDefault();
        // Primero, intenta agregar la vaca actual por si hay datos en el formulario
        const areteActual = document.getElementById('actividad-arete').value.trim();
        if (areteActual) {
            handleAgregarVacaAlLote(tipo, false); // El `false` es para que no limpie el campo arete
        }
        
        // Luego, finaliza y genera el reporte
        handleFinalizarLote();
        
        // Y finalmente cierra el modal
        modal.classList.add('hidden');
    };
    // ========================================================
}

    // Lógica para agregar vaca (ahora llamada desde el modal)
   // Añadimos un segundo parámetro `limpiarForm = true`
function handleAgregarVacaAlLote(tipoActividad, limpiarForm = true) {
    const areteInput = document.getElementById('actividad-arete');
    const loteNumero = document.getElementById('actividad-lote').value;
    const arete = areteInput.value.trim();

    if (!arete || !loteNumero) { 
        mostrarMensaje('mensaje-vaca', 'Completa lote y arete.'); 
        return; 
    }

    const form = document.getElementById('form-actividad-vaca');
    const formData = new FormData(form);
    const detalles = {};
    for (const [key, value] of formData.entries()) {
        if (!['actividad-lote', 'actividad-arete'].includes(key)) {
            detalles[key] = value;
        }
    }
    
    loteActual.push({
        areteVaca: arete,
        raza: vacasIndex.get(arete)?.raza || 'N/A',
        loteNumero: loteNumero,
        tipo: tipoActividad,
        tipoLabel: PROCEDIMIENTOS[tipoActividad].titulo,
        fecha: new Date().toISOString().split('T')[0],
        detalles: detalles
    });

    mostrarMensaje('mensaje-vaca', `Vaca ${arete} agregada. Total en lote: ${loteActual.length}`, false);
    document.getElementById('lote-info').textContent = `${loteActual.length} vacas (Lote ${loteNumero})`;
    
    if (limpiarForm) {
        // Limpiamos solo los campos de la actividad, no el lote.
        document.getElementById('campos-dinamicos-procedimiento').querySelectorAll('input, select, textarea').forEach(el => {
            if (el.type === 'checkbox') el.checked = false;
            else el.value = el.options ? el.options[0].value : '';
        });
        areteInput.value = '';
        areteInput.focus();
    }
}
    
    // Las demás funciones de apoyo
    function renderizarCamposProcedimiento(tipo) { /* ... (código sin cambios) ... */ }
    async function cargarVacasParaMVZ() { /* ... (código sin cambios) ... */ }
    async function handleFinalizarLote() { /* ... (código casi sin cambios, solo la alerta) ... */ 
         if (loteActual.length === 0) {
            alert('Aún no has registrado ninguna vaca en esta actividad.');
            return;
         }
        }
    
    function renderizarCamposProcedimiento(tipo) {
        const contenedor = document.getElementById('campos-dinamicos-procedimiento');
        contenedor.innerHTML = '';
        const procedimiento = PROCEDIMIENTOS[tipo];
        if (!procedimiento) return;
        procedimiento.campos.forEach(campo => {
            let campoHTML = `<div class="w-full"><label for="campo-${campo.id}" class="block text-sm font-medium text-gray-700">${campo.label}</label>`;
            if (campo.tipo === 'select') {
                const opciones = campo.opciones.map(op => `<option value="${op}">${op}</option>`).join('');
                campoHTML += `<select id="campo-${campo.id}" name="${campo.id}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg bg-white">${opciones}</select>`;
            } else if (campo.tipo === 'textarea') {
                campoHTML += `<textarea id="campo-${campo.id}" name="${campo.id}" rows="2" class="mt-1 w-full p-2 border border-gray-300 rounded-lg"></textarea>`;
            } else if (campo.tipo === 'checkbox') {
                 campoHTML += `<input type="checkbox" id="campo-${campo.id}" name="${campo.id}" value="Sí" class="mt-1 h-5 w-5 rounded border-gray-300">`;
            } else {
                campoHTML += `<input type="text" id="campo-${campo.id}" name="${campo.id}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg">`;
            }
            campoHTML += `</div>`;
            contenedor.innerHTML += campoHTML;
        });
    }

    async function cargarVacasParaMVZ() {
        if (!currentRancho) return;
        try {
            const res = await fetch(`${API_URL}/vacas/rancho/${currentRancho.id}`);
            const vacas = await res.json();
            const datalist = document.getElementById('lista-aretes-autocompletar');
            datalist.innerHTML = '';
            vacasIndex.clear();
            vacas.forEach(v => {
                datalist.insertAdjacentHTML('beforeend', `<option value="${v.numero_arete}">`);
                vacasIndex.set(String(v.numero_arete).trim(), { id: v.id, nombre: v.nombre, raza: v.raza || '' });
            });
        } catch (err) { console.error("Error cargando vacas para MVZ:", err); }
    }

   
    
    function renderLoteActual() {
        const lista = document.getElementById('lote-actual-lista');
        const tipoActividad = document.getElementById('actividad-tipo').value;
        document.getElementById('lote-activo-procedimiento').textContent = PROCEDIMIENTOS[tipoActividad]?.titulo || '...';
        if (loteActual.length === 0) { lista.innerHTML = '<p class="text-gray-500">Aún no has agregado vacas a este lote.</p>'; return; }
        lista.innerHTML = loteActual.map((item, idx) => `
            <div class="bg-gray-100 p-2 rounded-lg flex justify-between items-center text-sm">
                <span>Arete: <strong>${item.areteVaca}</strong> (${item.raza})</span>
                <button class="text-red-500 hover:text-red-700 font-bold text-lg" onclick="window.removerDelLote(${idx})">&times;</button>
            </div>`).join('');
    }

    window.removerDelLote = (index) => {
        loteActual.splice(index, 1);
        renderLoteActual();
    };

    async function handleFinalizarLote() {
    if (loteActual.length === 0) {
        mostrarMensaje('mensaje-vaca', 'No hay vacas registradas para generar un reporte.');
        return;
    }

    // Esta lógica para obtener el nombre está perfecta.
    let nombreRanchoParaReporte = currentRancho ? currentRancho.nombre : 'Rancho Independiente';
    const esIndependiente = !currentRancho || currentRancho.nombre === 'Rancho Independiente';

    if (esIndependiente) {
        const nombreIngresado = document.getElementById('rancho-independiente-nombre').value.trim();
        if (!nombreIngresado) {
            alert('Por favor, especifica el nombre del rancho atendido antes de finalizar.');
            return;
        }
        nombreRanchoParaReporte = nombreIngresado;
    }

    // ---- INICIO DE AJUSTES ----

    // AJUSTE 1: Apuntar al botón correcto del modal y mejorar el feedback.
    const btn = document.getElementById('btn-finalizar-reporte-modal');
    btn.disabled = true; 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Procesando...';

    try {
        // AJUSTE 2: Crear un "payload" que siempre envíe los datos correctos.
        const payload = {
            mvzId: currentUser.id,
            ranchoId: currentRancho?.id || null, // Envía el ID si existe, si no, null.
            ranchoNombre: nombreRanchoParaReporte, // Envía siempre el nombre que se usará.
            lote: loteActual
        };

        const res = await fetch(`${API_URL}/lote/pdf`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) // Enviamos el nuevo payload
        });

        if (!res.ok) throw new Error('El servidor no pudo generar el PDF.');
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none'; 
        a.href = url; 
        
        // AJUSTE 3: Usar la variable correcta para el nombre del archivo.
        a.download = `reporte_${nombreRanchoParaReporte.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        
        document.body.appendChild(a); 
        a.click(); 
        window.URL.revokeObjectURL(url);
        
        // AJUSTE 4: Limpiar el estado y navegar a la pantalla de inicio del MVZ.
        loteActual = []; 
        currentRancho = null;
        navigateTo('manejo-reproductivo-mvz');

    } catch (err) {
        console.error("Error al finalizar lote:", err);
        alert('Hubo un error al generar el reporte.');
        // Si hay un error, volvemos a habilitar el botón.
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-file-pdf mr-2"></i>Finalizar y Reportar';
    } 
    // Ya no necesitamos el bloque "finally" porque si todo sale bien, navegamos a otra pantalla.
}

    // =================================================================
    // ===== 8. INICIALIZACIÓN DE LA APLICACIÓN ========================
    // =================================================================
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