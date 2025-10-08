document.addEventListener('DOMContentLoaded', () => {
        // =================================================================
    // ===== 2. ESTADO GLOBAL Y CONFIGURACIÓN ==========================
    // =================================================================
    let currentUser = null;
    let currentRancho = null;
    let allVacasPropietario = [];
    let vacasIndex = new Map();
    let independentRanchoName = null;
    let loteActual = [];
    let miGrafico = null;
    let datosEstadisticas = null;

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
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };
    const prettyLabel = (str) => (str || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const normalize = (s) => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const mostrarMensaje = (elId, texto, esError = true) => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.textContent = texto;
        el.className = `text-sm mt-2 h-4 ${esError ? 'text-red-500' : 'text-green-600'}`;
        setTimeout(() => { if(el) el.textContent = ''; }, 4000);
    };
    const logout = () => {
        currentUser = null;
        currentRancho = null;
        sessionStorage.clear();
        navContainer.classList.add('hidden');
        document.getElementById('nav-propietario')?.classList.add('hidden');
        document.getElementById('nav-mvz')?.classList.add('hidden');
        navigateTo('login');
    };
    function popularSelectsDeFecha() {
        const selects = [
            { dia: 'vaca-fecha-dia', mes: 'vaca-fecha-mes', ano: 'vaca-fecha-ano' },
            { dia: 'vaca-fecha-dia-mvz', mes: 'vaca-fecha-mes-mvz', ano: 'vaca-fecha-ano-mvz' }
        ];
        selects.forEach(group => {
            const selDia = document.getElementById(group.dia);
            const selMes = document.getElementById(group.mes);
            const selAno = document.getElementById(group.ano);
            if (!selDia || !selMes || !selAno) return;
            selDia.innerHTML = '<option value="">Día</option>';
            selMes.innerHTML = '<option value="">Mes</option>';
            selAno.innerHTML = '<option value="">Año</option>';
            for (let i = 1; i <= 31; i++) selDia.innerHTML += `<option value="${i}">${i}</option>`;
            const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            meses.forEach((mes, i) => selMes.innerHTML += `<option value="${i + 1}">${mes}</option>`);
            const anoActual = new Date().getFullYear();
            for (let i = 0; i <= 30; i++) selAno.innerHTML += `<option value="${anoActual - i}">${anoActual - i}</option>`;
        });
    }
    function poblarSelectLote(max = 10) {
        const sel = document.getElementById('actividad-lote');
        if (!sel) return;
        sel.innerHTML = '';
        for (let i = 1; i <= max; i++) sel.appendChild(new Option(`Lote ${i}`, String(i)));
    }
    function attachRazaAutocomplete(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        let box = document.getElementById(`${inputId}-sugerencias`);
        if (!box) {
            box = document.createElement('div');
            box.id = `${inputId}-sugerencias`;
            box.className = 'absolute mt-1 z-50 w-full rounded-xl border border-white/10 bg-black/70 text-white max-h-56 overflow-auto shadow-2xl hidden';
            if (input.parentElement) input.parentElement.style.position = 'relative';
            input.insertAdjacentElement('afterend', box);
        }
        let activeIndex = -1;
        const render = (items) => {
            if (!items || items.length === 0) { box.classList.add('hidden'); return; }
            box.innerHTML = items.map(r => `<button type="button" data-value="${r}" class="w-full text-left px-3 py-2 hover:bg-white/10 focus:bg-white/10 focus:outline-none">${r}</button>`).join('');
            box.classList.remove('hidden');
            activeIndex = -1;
        };
        const openWithQuery = (q) => {
            const qn = normalize(q);
            if (qn.length < 2) { render([]); return; }
            render(RAZAS_BOVINAS.filter((r) => normalize(r).startsWith(qn)).slice(0, 30));
        };
        input.addEventListener('input', () => openWithQuery(input.value));
        box.addEventListener('mousedown', (e) => {
            const btn = e.target.closest('button[data-value]');
            if (!btn) return;
            input.value = btn.dataset.value;
            box.classList.add('hidden');
        });
        input.addEventListener('blur', () => setTimeout(() => box.classList.add('hidden'), 150));
        input.addEventListener('keydown', (e) => {
            const buttons = [...box.querySelectorAll('button[data-value]')];
            if (buttons.length === 0 || box.classList.contains('hidden')) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = (activeIndex + 1) % buttons.length; buttons[activeIndex].focus(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = (activeIndex - 1 + buttons.length) % buttons.length; buttons[activeIndex].focus(); }
            else if (e.key === 'Enter' && activeIndex > -1) { e.preventDefault(); input.value = buttons[activeIndex].dataset.value; box.classList.add('hidden'); }
            else if (e.key === 'Escape') { box.classList.add('hidden'); }
        });
        input.addEventListener('focus', () => { if (input.value.trim().length >= 2) openWithQuery(input.value); });
    }
    // =================================================================
    // ===== 4. NAVEGACIÓN Y RENDERIZADO DE VISTAS =====================
    // =================================================================
    function navigateTo(viewId) {
        if (!appContent) { console.error('Elemento #app-content no encontrado.'); return; }
        
        const fab = document.getElementById('fab-container');
        if (fab) fab.classList.add('hidden');

        appContent.innerHTML = '';
        const template = document.getElementById(`template-${viewId}`);
        if (!template) {
            appContent.innerHTML = `<p class="text-center p-8 text-red-500">Error: No se encontró la plantilla para: ${viewId}</p>`;
            return;
        }
        appContent.appendChild(template.content.cloneNode(true));

        // Lógica específica para cada vista
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
            if (fab) fab.classList.add('hidden'); // MVZ no usa el FAB por ahora
            initMvzListeners(); // Función para activar los botones del MVZ
        }
    }

    const iniciarSesion = () => {
        if (!currentUser) return;
        navContainer.classList.remove('hidden');
        const isPropietario = currentUser.rol === 'propietario';
        document.getElementById('nav-propietario').classList.toggle('hidden', !isPropietario);
        document.getElementById('nav-mvz').classList.toggle('hidden', isPropietario);
        
        document.querySelector('.nav-button.active')?.classList.remove('active');
        const firstButtonSelector = isPropietario ? '.nav-button[data-vista="inicio-propietario"]' : '.nav-button[data-vista="inicio-mvz"]';
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
    // ===== 5. MANEJADORES DE EVENTOS (HANDLERS) ======================
    // =================================================================
    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;
        try {
            const res = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message);
            currentUser = respuesta.user;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            if (rememberMe) localStorage.setItem('rememberedEmail', email);
            else localStorage.removeItem('rememberedEmail');
            iniciarSesion();
        } catch (err) {
            mostrarMensaje('login-mensaje', err.message);
        }
    }
    async function handleRegister(e) {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/register`, { method: 'POST', body: new FormData(e.target) });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message);
            mostrarMensaje('registro-mensaje', '¡Registro exitoso! Ahora puedes iniciar sesión.', false);
            e.target.reset();
            navigateTo('login');
        } catch (err) {
            mostrarMensaje('registro-mensaje', err.message);
        }
    }


    // =================================================================
    // ===== 6. LÓGICA DE VISTAS Y DATOS ===========================
    // =================================================================
   async function cargarDatosDashboard() {
        if (!currentUser || currentUser.rol !== 'propietario') return;
        try {
            const ranchoId = currentUser.ranchos?.[0]?.id;
            if (!ranchoId) return;

            const res = await fetch(`${API_URL}/rancho/${ranchoId}/estadisticas`);
            if (!res.ok) throw new Error('No se pudieron cargar las estadísticas.');
            const stats = await res.json();

            let totalVacas = 0;
            let totalGestantes = 0;

            // --- 1. Calcular totales para las tarjetas de resumen ---
            for (const lote in stats) {
                totalVacas += stats[lote].totalVacas || 0;
                totalGestantes += (stats[lote].estados && stats[lote].estados.Gestante) || 0;
            }
            document.getElementById('resumen-total-vacas').textContent = totalVacas;
            document.getElementById('resumen-vacas-gestantes').textContent = totalGestantes;
            document.getElementById('resumen-alertas').textContent = 3; // Placeholder, necesita su propia lógica

            // --- 2. Renderizar las tarjetas de "Estado de Lotes" ---
            const lotesContainer = document.getElementById('lotes-container');
            if (!lotesContainer) return;
            
            lotesContainer.innerHTML = ''; // Limpiar el mensaje de "cargando"
            
            if (Object.keys(stats).length === 0) {
                 lotesContainer.innerHTML = '<p class="text-gray-500">No hay lotes con datos para mostrar.</p>';
                 return;
            }
            
            Object.entries(stats).forEach(([numeroLote, datosLote]) => {
                const vacasEnLote = datosLote.totalVacas || 0;
                const gestantesEnLote = datosLote.estados?.Gestante || 0;
                const porcentajeGestacion = vacasEnLote > 0 ? Math.round((gestantesEnLote / vacasEnLote) * 100) : 0;
                
                // Determinar el color y estado del lote (lógica de ejemplo)
                let colorProgreso = '#22c55e'; // Verde por defecto
                let estadoAnillo = ''; // Círculo verde por defecto
                if (porcentajeGestacion < 50) {
                    colorProgreso = '#f59e0b'; // Amarillo si es bajo
                    estadoAnillo = `<div class="absolute top-0 right-0 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white"></div>`;
                }
                // Placeholder para una alerta
                if (numeroLote === 'B') { // Simulación de alerta como en tu diseño
                     colorProgreso = '#ef4444'; // Rojo si hay alerta
                     estadoAnillo = `<div class="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">!</div>`;
                }

                const loteCardHTML = `
                    <div class="bg-white p-4 rounded-xl shadow-md flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="progress-ring mr-4" style="--value: ${porcentajeGestacion}; --color: ${colorProgreso};">
                                <span class="progress-ring-percent">${porcentajeGestacion}%</span>
                                ${estadoAnillo}
                            </div>
                            <div>
                                <p class="font-semibold">Lote ${numeroLote}</p>
                                <p class="text-sm text-gray-500">Gestación</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-right text-gray-400"></i>
                    </div>
                `;
                lotesContainer.innerHTML += loteCardHTML;
            });

        } catch (error) {
            console.error("Error al cargar datos del dashboard:", error);
            document.getElementById('lotes-container').innerHTML = '<p class="text-red-500">No se pudieron cargar los datos de los lotes.</p>';
        }
    }

       function initMvzListeners() {
        // Botón de validar rancho
        document.getElementById('btn-validar-rancho').addEventListener('click', handleValidarRancho);
        
        // Formulario para agregar vaca
        document.getElementById('form-actividad-vaca').addEventListener('submit', handleAgregarVacaAlLote);

        // Select de tipo de actividad
        const actividadTipoSelect = document.getElementById('actividad-tipo');
        if (actividadTipoSelect) {
            actividadTipoSelect.innerHTML = '<option value="" selected disabled>Seleccione...</option>';
            Object.keys(PROCEDIMIENTOS).forEach(key => {
                actividadTipoSelect.add(new Option(PROCEDIMIENTOS[key].titulo, key));
            });
            actividadTipoSelect.addEventListener('change', (e) => renderizarCamposProcedimiento(e.target.value));
        }
        
        // Botón de finalizar lote
        document.getElementById('btn-finalizar-lote').addEventListener('click', handleFinalizarLote);

        // Poblar select de lotes (ejemplo hasta 10)
        const selLote = document.getElementById('actividad-lote');
        selLote.innerHTML = '';
        for (let i = 1; i <= 10; i++) selLote.add(new Option(`Lote ${i}`, i));
    }

    async function handleValidarRancho() {
        const codigo = document.getElementById('codigo-rancho').value.trim().toUpperCase();
        if (!codigo) {
            mostrarMensaje('mensaje-rancho', 'El código no puede estar vacío.');
            return;
        }
        try {
            const res = await fetch(`${API_URL}/rancho/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo })
            });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.message);
            
            currentRancho = respuesta; // Guardamos los datos del rancho validado
            mostrarMensaje('mensaje-rancho', `Rancho "${currentRancho.nombre}" validado.`, false);
            document.getElementById('nombre-rancho-activo').textContent = currentRancho.nombre;
            document.getElementById('seccion-registrar-actividad').classList.remove('hidden');
            document.getElementById('seccion-lote-actual').classList.remove('hidden');
            await cargarVacasParaMVZ(); // Cargar vacas para el autocompletar
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
            let campoHTML = `<div class="w-full">
                <label for="campo-${campo.id}" class="block text-sm font-medium text-gray-700">${campo.label}</label>`;
            
            if (campo.tipo === 'select') {
                const opciones = campo.opciones.map(op => `<option value="${op}">${op}</option>`).join('');
                campoHTML += `<select id="campo-${campo.id}" name="${campo.id}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg bg-white">${opciones}</select>`;
            } else if (campo.tipo === 'textarea') {
                campoHTML += `<textarea id="campo-${campo.id}" name="${campo.id}" rows="2" class="mt-1 w-full p-2 border border-gray-300 rounded-lg"></textarea>`;
            } else if (campo.tipo === 'checkbox') {
                 campoHTML += `<input type="checkbox" id="campo-${campo.id}" name="${campo.id}" class="mt-1 h-5 w-5 rounded border-gray-300">`;
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
        } catch (err) {
            console.error("Error cargando vacas para MVZ:", err);
        }
    }

    function handleAgregarVacaAlLote(e) {
        e.preventDefault();
        const tipoActividad = document.getElementById('actividad-tipo').value;
        const arete = document.getElementById('actividad-arete').value.trim();
        const loteNumero = document.getElementById('actividad-lote').value;

        if (!tipoActividad || !arete || !loteNumero) {
            mostrarMensaje('mensaje-vaca', 'Completa procedimiento, lote y arete.');
            return;
        }

        const vacaInfo = vacasIndex.get(arete);
        if (!vacaInfo) {
            mostrarMensaje('mensaje-vaca', 'Ese arete no está registrado en este rancho.');
            return;
        }

        const form = document.getElementById('form-actividad-vaca');
        const formData = new FormData(form);
        const detalles = {};
        formData.forEach((value, key) => {
            detalles[key] = value;
        });

        loteActual.push({
            areteVaca: arete,
            raza: vacaInfo.raza,
            loteNumero: loteNumero,
            tipo: tipoActividad,
            tipoLabel: PROCEDIMIENTOS[tipoActividad].titulo,
            fecha: new Date().toISOString().split('T')[0],
            detalles: detalles
        });
        
        renderLoteActual();
        form.reset();
        document.getElementById('actividad-arete').focus();
    }
    
    function renderLoteActual() {
        const lista = document.getElementById('lote-actual-lista');
        const tipoActividad = document.getElementById('actividad-tipo').value;
        document.getElementById('lote-activo-procedimiento').textContent = PROCEDIMIENTOS[tipoActividad]?.titulo || '...';
        
        if (loteActual.length === 0) {
            lista.innerHTML = '<p class="text-gray-500">Aún no has agregado vacas a este lote.</p>';
            return;
        }

        lista.innerHTML = loteActual.map((item, idx) => `
            <div class="bg-gray-100 p-2 rounded-lg flex justify-between items-center text-sm">
                <span>Arete: <strong>${item.areteVaca}</strong> (${item.raza})</span>
                <button class="text-red-500 hover:text-red-700 font-bold text-lg" onclick="window.removerDelLote(${idx})">&times;</button>
            </div>`).join('');
    }

    // Hacemos la función global para que el onclick la encuentre
    window.removerDelLote = (index) => {
        loteActual.splice(index, 1);
        renderLoteActual();
    };

    async function handleFinalizarLote() {
        if (loteActual.length === 0) {
            alert('El lote está vacío. Agrega al menos una vaca.');
            return;
        }

        const btn = document.getElementById('btn-finalizar-lote');
        btn.disabled = true;
        btn.textContent = 'Procesando...';

        try {
            const res = await fetch(`${API_URL}/lote/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mvzId: currentUser.id,
                    ranchoId: currentRancho.id,
                    lote: loteActual
                })
            });

            if (!res.ok) throw new Error('El servidor no pudo generar el PDF.');
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `reporte_${currentRancho.nombre}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            // Limpiar todo para el siguiente lote
            loteActual = [];
            renderLoteActual();
            document.getElementById('seccion-registrar-actividad').classList.add('hidden');
            document.getElementById('seccion-lote-actual').classList.add('hidden');
            document.getElementById('codigo-rancho').value = '';
            currentRancho = null;

        } catch (err) {
            console.error("Error al finalizar lote:", err);
            alert('Hubo un error al generar el reporte. Inténtalo de nuevo.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Finalizar y Generar Reporte';
        }
    }


            // =================================================================
    // ===== 7. FUNCIONES GLOBALES (ACCESIBLES DESDE HTML) =============
    // =================================================================
    window.app = {
        verHistorial: async (vacaId, vacaNombre) => {
            document.getElementById('modal-nombre-vaca').textContent = vacaNombre;
            const contenedor = document.getElementById('modal-contenido-historial');
            contenedor.innerHTML = '<p>Cargando historial...</p>';
            document.getElementById('modal-historial').classList.remove('hidden');
            try {
                const res = await fetch(`${API_URL}/actividades/vaca/${vacaId}`);
                if (!res.ok) throw new Error('No se pudo cargar el historial.');
                const historial = await res.json();
                if (!historial || historial.length === 0) {
                    contenedor.innerHTML = '<p>No hay actividades registradas para esta vaca.</p>';
                    return;
                }
                contenedor.innerHTML = historial.map(item => {
                    const detalles = JSON.parse(item.descripcion || '{}');
                    const detallesHtml = Object.entries(detalles).map(([key, value]) => `<dt class="text-gray-400">${prettyLabel(key)}:</dt><dd class="text-white">${value}</dd>`).join('');
                    return `
                        <div class="bg-black/20 p-4 rounded-lg mt-2">
                            <p class="font-semibold text-cyan-400">${item.tipo_actividad || 'Actividad'} - <span class="font-normal text-gray-300">${formatDate(item.fecha_actividad)}</span></p>
                            <p class="text-sm"><span class="font-semibold text-gray-300">Realizado por:</span> ${item.usuarios?.nombre || 'Desconocido'}</p>
                            <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">${detallesHtml}</dl>
                        </div>`;
                }).join('');
            } catch (error) {
                console.error("Error al mostrar historial:", error);
                contenedor.innerHTML = '<p class="text-red-400">Hubo un error al cargar el historial.</p>';
            }
        },
        removerDelLote: (index) => {
            loteActual.splice(index, 1);
            renderLoteActual();
        },
    };

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
            // Por defecto, llevamos al login que ahora tendrá el fondo claro
            // Si quieres que login/registro mantengan el fondo oscuro, se necesitaría una lógica adicional
            navigateTo('login'); 
        }
    }
    
    initApp();
});