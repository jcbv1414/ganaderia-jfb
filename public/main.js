document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // ===== 2. ESTADO GLOBAL Y CONFIGURACIÓN ==========================
    // =================================================================
    let currentUser = null;
    let currentRancho = null;
    let loteActual = []; 
    let vacasIndex = new Map();

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
    const RAZAS_BOVINAS = ['Aberdeen Angus', 'Ayrshire', 'Bazadaise', 'Beefmaster', 'Belgian Blue', 'Brahman', 'Brangus', 'Charolais', 'Chianina', 'Criollo', 'Galloway', 'Gelbvieh', 'Gir', 'Guzerá', 'Gyr Lechero', 'Guernsey', 'Hereford', 'Holstein', 'Jersey', 'Limousin', 'Maine-Anjou', 'Marchigiana', 'Montbéliarde', 'Normando', 'Pardo Suizo', 'Piemontese', 'Pinzgauer', 'Romagnola', 'Sahiwal', 'Santa Gertrudis', 'Sardo Negro', 'Shorthorn', 'Simbrah', 'Simmental', 'Sindi', 'Tarentaise', 'Wagyu'].sort((a, b) => a.localeCompare(b));


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
            document.getElementById('dash-nombre-mvz').textContent = currentUser?.nombre.split(' ')[0] || '';
            document.getElementById('dash-fecha-actual-mvz').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
            if (fab) fab.classList.add('hidden');
            initMvzListeners();
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

    // --- LÓGICA DEL MVZ ---
    function initMvzListeners() {
        document.getElementById('btn-validar-rancho').addEventListener('click', handleValidarRancho);
        document.getElementById('form-actividad-vaca').addEventListener('submit', handleAgregarVacaAlLote);
        const actividadTipoSelect = document.getElementById('actividad-tipo');
        if (actividadTipoSelect) {
            actividadTipoSelect.innerHTML = '<option value="" selected disabled>Seleccione...</option>';
            Object.keys(PROCEDIMIENTOS).forEach(key => {
                actividadTipoSelect.add(new Option(PROCEDIMIENTOS[key].titulo, key));
            });
            actividadTipoSelect.addEventListener('change', (e) => renderizarCamposProcedimiento(e.target.value));
        }
        document.getElementById('btn-finalizar-lote').addEventListener('click', handleFinalizarLote);
        const selLote = document.getElementById('actividad-lote');
        selLote.innerHTML = '';
        for (let i = 1; i <= 10; i++) selLote.add(new Option(`Lote ${i}`, i));
    }

    async function handleValidarRancho() {
        const codigo = document.getElementById('codigo-rancho').value.trim().toUpperCase();
        if (!codigo) { mostrarMensaje('mensaje-rancho', 'El código no puede estar vacío.'); return; }
        try {
            const res = await fetch(`${API_URL}/rancho/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message);
            currentRancho = respuesta;
            mostrarMensaje('mensaje-rancho', `Rancho "${currentRancho.nombre}" validado.`, false);
            document.getElementById('nombre-rancho-activo').textContent = currentRancho.nombre;
            document.getElementById('seccion-registrar-actividad').classList.remove('hidden');
            document.getElementById('seccion-lote-actual').classList.remove('hidden');
            await cargarVacasParaMVZ();
        } catch (err) {
            mostrarMensaje('mensaje-rancho', err.message);
            currentRancho = null;
            document.getElementById('seccion-registrar-actividad').classList.add('hidden');
            document.getElementById('seccion-lote-actual').classList.add('hidden');
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

    function handleAgregarVacaAlLote(e) {
        e.preventDefault();
        const tipoActividad = document.getElementById('actividad-tipo').value;
        const arete = document.getElementById('actividad-arete').value.trim();
        const loteNumero = document.getElementById('actividad-lote').value;
        if (!tipoActividad || !arete || !loteNumero) { mostrarMensaje('mensaje-vaca', 'Completa procedimiento, lote y arete.'); return; }
        const vacaInfo = vacasIndex.get(arete);
        if (!vacaInfo) { mostrarMensaje('mensaje-vaca', 'Ese arete no está registrado.'); return; }
        const form = document.getElementById('form-actividad-vaca');
        const formData = new FormData(form);
        const detalles = {};
        formData.forEach((value, key) => { detalles[key] = value; });
        loteActual.push({ areteVaca: arete, raza: vacaInfo.raza, loteNumero: loteNumero, tipo: tipoActividad, tipoLabel: PROCEDIMIENTOS[tipoActividad].titulo, fecha: new Date().toISOString().split('T')[0], detalles: detalles });
        renderLoteActual();
        document.getElementById('actividad-arete').value = '';
        document.getElementById('actividad-arete').focus();
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
        if (loteActual.length === 0) { alert('El lote está vacío.'); return; }
        const btn = document.getElementById('btn-finalizar-lote');
        btn.disabled = true; btn.textContent = 'Procesando...';
        try {
            const res = await fetch(`${API_URL}/lote/pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mvzId: currentUser.id, ranchoId: currentRancho.id, lote: loteActual }) });
            if (!res.ok) throw new Error('El servidor no pudo generar el PDF.');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none'; a.href = url; a.download = `reporte_${currentRancho.nombre}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
            loteActual = []; renderLoteActual();
            document.getElementById('seccion-registrar-actividad').classList.add('hidden');
            document.getElementById('seccion-lote-actual').classList.add('hidden');
            document.getElementById('codigo-rancho').value = ''; currentRancho = null;
        } catch (err) {
            console.error("Error al finalizar lote:", err);
            alert('Hubo un error al generar el reporte.');
        } finally {
            btn.disabled = false; btn.textContent = 'Finalizar y Generar Reporte';
        }
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