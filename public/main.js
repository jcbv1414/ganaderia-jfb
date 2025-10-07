document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // ===== 1. LÓGICA DEL FONDO ANIMADO ===============================
    // =================================================================
    const canvas = document.getElementById('animated-background');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        const numParticles = 70;
        const particleSize = 2;
        const connectionDistance = 150;
        class Particle {
            constructor(x, y) { this.x = x || Math.random() * canvas.width; this.y = y || Math.random() * canvas.height; this.speedX = (Math.random() - 0.5) * 0.5; this.speedY = (Math.random() - 0.5) * 0.5; }
            update() { this.x += this.speedX; this.y += this.speedY; if (this.x < 0 || this.x > canvas.width) this.speedX *= -1; if (this.y < 0 || this.y > canvas.height) this.speedY *= -1; }
            draw() { ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.beginPath(); ctx.arc(this.x, this.y, particleSize, 0, Math.PI * 2); ctx.fill(); }
        }
        const initParticles = () => { for (let i = 0; i < numParticles; i++) particles.push(new Particle()); };
        const connectParticles = () => { for (let i = 0; i < particles.length; i++) for (let j = i; j < particles.length; j++) { const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y; const distance = Math.sqrt(dx * dx + dy * dy); if (distance < connectionDistance) { ctx.strokeStyle = `rgba(255, 255, 255, ${1 - (distance / connectionDistance) * 0.8})`; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke(); } } };
        const animate = () => { requestAnimationFrame(animate); ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { p.update(); p.draw(); }); connectParticles(); };
        const resizeCanvas = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; particles = []; initParticles(); };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        animate();
    }
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
        el.className = `text-center mt-2 text-sm h-4 ${esError ? 'text-red-400' : 'text-green-400'}`;
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
        appContent.innerHTML = '';
        const template = document.getElementById(`template-${viewId}`);
        if (!template) { console.error(`No se encontró la plantilla para la vista: ${viewId}`); return; }
        appContent.appendChild(template.content.cloneNode(true));

        if (viewId === 'login') {
            document.getElementById('form-login').addEventListener('submit', handleLogin);
            document.getElementById('link-a-registro').addEventListener('click', () => navigateTo('registro'));
            const savedEmail = localStorage.getItem('rememberedEmail');
            if (savedEmail && document.getElementById('login-email')) {
                document.getElementById('login-email').value = savedEmail;
                document.getElementById('remember-me').checked = true;
            }
        } else if (viewId === 'registro') {
            document.getElementById('form-registro').addEventListener('submit', handleRegister);
            document.getElementById('link-a-login').addEventListener('click', () => navigateTo('login'));
            const registroRol = document.getElementById('registro-rol');
            if(registroRol) {
                registroRol.addEventListener('change', (e) => {
                    document.getElementById('campo-rancho').classList.toggle('hidden', e.target.value !== 'propietario');
                });
            }
        } else if (viewId === 'inicio-propietario') {
            document.getElementById('dash-nombre-propietario').textContent = currentUser?.nombre || '';
            document.getElementById('dash-fecha-actual').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            cargarDatosDashboard();
        } else if (viewId === 'mis-vacas') {
            cargarVacasPropietario();
            initMisVacasListeners();
        } else if (viewId === 'estadisticas') {
            mostrarEstadisticas();
        } else if (viewId === 'inicio-mvz') {
            document.getElementById('dash-nombre-mvz').textContent = currentUser?.nombre || '';
            document.getElementById('dash-fecha-actual-mvz').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    }
    const iniciarSesion = () => {
        if (!currentUser) return;
        navContainer.classList.remove('hidden');
        const isPropietario = currentUser.rol === 'propietario';
        document.getElementById('nav-propietario').classList.toggle('hidden', !isPropietario);
        document.getElementById('nav-mvz').classList.toggle('hidden', isPropietario);
        navigateTo(isPropietario ? 'inicio-propietario' : 'inicio-mvz');
    };
    function setupNavigation() {
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', () => {
                const viewId = button.dataset.vista;
                document.querySelector('.nav-button.active')?.classList.remove('active');
                button.classList.add('active');
                navigateTo(viewId);
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
            let totalVacas = 0, totalGestantes = 0;
            for (const lote in stats) {
                totalVacas += stats[lote].totalVacas || 0;
                totalGestantes += (stats[lote].estados && stats[lote].estados.Gestante) || 0;
            }
            document.getElementById('resumen-total-vacas').textContent = totalVacas;
            document.getElementById('resumen-vacas-gestantes').textContent = totalGestantes;
            document.getElementById('resumen-alertas').textContent = 0; // Placeholder
        } catch (error) {
            console.error("Error al cargar datos del dashboard:", error);
        }
    }

    function initMisVacasListeners() {
        const vacaBuscarInput = document.getElementById('vaca-buscar');
        if (vacaBuscarInput) {
            vacaBuscarInput.addEventListener('input', (e) => {
                const searchTerm = normalize(e.target.value);
                const filteredVacas = allVacasPropietario.filter(vaca =>
                    normalize(vaca.nombre).includes(searchTerm) ||
                    normalize(vaca.numero_arete).includes(searchTerm)
                );
                renderVacasPropietario(filteredVacas);
            });
        }

        const listaVacas = document.getElementById('lista-vacas');
        if (listaVacas) {
            listaVacas.addEventListener('click', (e) => {
                const vacaCard = e.target.closest('.vaca-card');
                if (!vacaCard) return;
                const vacaId = vacaCard.dataset.vacaId;
                const vacaNombre = vacaCard.dataset.vacaNombre;

                if (e.target.closest('[data-action="delete-vaca"]')) {
                    document.getElementById('nombre-vaca-eliminar').textContent = vacaNombre;
                    document.getElementById('btn-confirmar-eliminar').dataset.vacaId = vacaId;
                    document.getElementById('modal-confirmacion-eliminar').classList.remove('hidden');
                } else if (e.target.closest('[data-action="view-history"]')) {
                    window.app.verHistorial(vacaId, vacaNombre);
                }
            });
        }
    }

    const cargarVacasPropietario = async () => {
        const lista = document.getElementById('lista-vacas');
        if (!lista) return;
        lista.innerHTML = '<p class="text-gray-400 text-center">Cargando vacas...</p>';
        const ranchoId = currentUser?.ranchos?.[0]?.id;
        if (!ranchoId) {
            lista.innerHTML = '<p class="text-red-400 text-center">No hay rancho asignado.</p>';
            return;
        }
        try {
            const res = await fetch(`${API_URL}/vacas/rancho/${ranchoId}`);
            if (!res.ok) throw new Error('Error al cargar las vacas.');
            allVacasPropietario = await res.json();
            renderVacasPropietario(allVacasPropietario);
        } catch (err) {
            console.error("Error cargando vacas del propietario:", err);
            lista.innerHTML = '<p class="text-red-400 text-center">No se pudieron cargar las vacas.</p>';
        }
    };

    const renderVacasPropietario = (vacasToRender) => {
        const lista = document.getElementById('lista-vacas');
        if (!lista) return;
        if (!vacasToRender || vacasToRender.length === 0) {
            lista.innerHTML = '<p class="text-gray-400 text-center">Aún no tienes vacas o no hay resultados para tu búsqueda.</p>';
            return;
        }
        lista.innerHTML = vacasToRender.map(vaca => `
            <div class="vaca-card p-4 rounded-xl flex items-center bg-black/20 hover:bg-black/30 transition-colors" data-vaca-id="${vaca.id}" data-vaca-nombre="${vaca.nombre}">
                <div class="flex-1 flex items-center cursor-pointer" data-action="view-history">
                    <img src="${vaca.foto_url || 'https://i.imgur.com/s6l2h27.png'}" alt="Vaca ${vaca.nombre}" class="w-20 h-20 rounded-lg object-cover mr-4 border border-white/10">
                    <div class="flex-1">
                        <p class="font-bold text-white text-lg">${vaca.nombre} <span class="text-sm font-normal text-gray-400">#${vaca.numero_arete}</span></p>
                        <p class="text-xs text-gray-300">Raza: ${vaca.raza || 'Desconocida'}</p>
                        <p class="text-xs text-gray-300">Nacimiento: ${formatDate(vaca.fecha_nacimiento)}</p>
                    </div>
                </div>
                <button data-action="delete-vaca" class="text-red-400 hover:text-red-600 text-2xl p-2 rounded-full hover:bg-red-500/10">🗑️</button>
            </div>
        `).join('');
    };

    async function cargarVacasParaMVZ() {
        if (!currentRancho) return;
        try {
            const res = await fetch(`${API_URL}/vacas/rancho/${currentRancho.id}`);
            const vacas = await res.json();
            const datalist = document.getElementById('lista-aretes-autocompletar');
            if (!datalist) return;
            datalist.innerHTML = '';
            vacasIndex.clear();
            vacas.forEach(v => {
                datalist.insertAdjacentHTML('beforeend', `<option value="${v.numero_arete}">(${v.nombre})</option>`);
                vacasIndex.set(String(v.numero_arete).trim(), { id: v.id, nombre: v.nombre, raza: v.raza || '' });
            });
        } catch (err) {
            console.error("Error cargando vacas para MVZ:", err);
        }
    }

    function renderLoteActual() {
        const lista = document.getElementById('lote-actual-lista');
        const btnFinalizar = document.getElementById('btn-finalizar-lote');
        const actividadTipoSelect = document.getElementById('actividad-tipo');
        const actividadLoteEl = document.getElementById('actividad-lote');
        if (!lista || !btnFinalizar) return;

        const hayLote = loteActual.length > 0;
        btnFinalizar.classList.toggle('hidden', !hayLote);
        if (actividadTipoSelect) actividadTipoSelect.disabled = hayLote;
        if (actividadLoteEl) actividadLoteEl.disabled = hayLote;

        if (!hayLote) {
            lista.innerHTML = '<p class="text-gray-400">Aún no has agregado vacas a este lote.</p>';
            return;
        }
        lista.innerHTML = loteActual.map((item, idx) => `
            <div class="bg-white/5 p-2 rounded flex justify-between items-center text-sm">
                <span>Arete: <strong>${item.areteVaca}</strong>${item.raza ? ` (${item.raza})` : ''}</span>
                <button class="text-red-400 hover:text-red-600 font-bold text-lg" onclick="app.removerDelLote(${idx})">&times;</button>
            </div>`).join('');
    }
    async function mostrarEstadisticas() {
        const statsTabsContainer = document.getElementById('estadisticas-tabs-lotes');
        const statsContenido = document.getElementById('estadisticas-contenido');
        if (statsContenido) statsContenido.style.visibility = 'hidden';
        if (statsTabsContainer) statsTabsContainer.innerHTML = '<p class="text-gray-400 p-4">Cargando estadísticas...</p>';

        try {
            const ranchoId = currentUser?.ranchos?.[0]?.id;
            if (!ranchoId) throw new Error('No se encontró rancho.');
            const res = await fetch(`${API_URL}/rancho/${ranchoId}/estadisticas`);
            if (!res.ok) throw new Error((await res.json()).message || 'No se pudieron cargar las estadísticas.');
            datosEstadisticas = await res.json();
            const lotes = Object.keys(datosEstadisticas || {});
            if (!statsTabsContainer) return;
            if (lotes.length === 0) {
                statsTabsContainer.innerHTML = '<p class="text-gray-400 p-4">No hay datos suficientes para mostrar estadísticas.</p>';
                return;
            }

            statsTabsContainer.innerHTML = lotes.map(lote =>
                `<button class="tab-lote p-4 text-gray-400 border-b-2 border-transparent hover:text-white" data-lote="${lote}">${lote === 'Sin Lote' ? 'Sin Asignar' : `Lote ${lote}`}</button>`
            ).join('');

            statsTabsContainer.querySelectorAll('.tab-lote').forEach(tab => {
                tab.addEventListener('click', () => {
                    statsTabsContainer.querySelector('.active-tab')?.classList.remove('active-tab');
                    tab.classList.add('active-tab');
                    renderizarGrafico(tab.dataset.lote);
                });
            });

            const firstTab = statsTabsContainer.querySelector('.tab-lote');
            if (firstTab) firstTab.click();
            if (statsContenido) statsContenido.style.visibility = 'visible';
        } catch (err) {
            console.error(err);
            if (statsTabsContainer) statsTabsContainer.innerHTML = `<p class="text-red-400 p-4">${err.message}</p>`;
        }
    }

    function renderizarGrafico(numeroLote) {
        if (!datosEstadisticas || !datosEstadisticas[numeroLote]) return;
        const loteData = datosEstadisticas[numeroLote];
        const statsTituloLote = document.getElementById('estadisticas-titulo-lote');
        const statsResumenTexto = document.getElementById('estadisticas-resumen-texto');
        const grafEl = document.getElementById('grafico-estado-reproductivo');
        const ctx = grafEl ? grafEl.getContext('2d') : null;

        if (statsTituloLote) statsTituloLote.textContent = `Lote ${numeroLote}`;
        const razasOrdenadas = Object.entries(loteData.razas || {}).sort(([, a], [, b]) => b - a);
        if (statsResumenTexto) {
            statsResumenTexto.innerHTML = `
                <p><strong>Total de Vacas:</strong> ${loteData.totalVacas || 0}</p>
                <p><strong>Gestantes:</strong> ${loteData.estados?.Gestante || 0} vacas</p>
                <p><strong>Estáticas:</strong> ${loteData.estados?.Estatica || 0} vacas</p>
                <p><strong>Ciclando:</strong> ${loteData.estados?.Ciclando || 0} vacas</p>
                ${razasOrdenadas.length > 0 ? `<p><strong>Raza Principal:</strong> ${razasOrdenadas[0][0]}</p>` : ''}
            `;
        }

        if (miGrafico) miGrafico.destroy();
        if (!ctx) return;

        miGrafico = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Gestantes', 'Estáticas', 'Ciclando', 'Sucias'],
                datasets: [{
                    label: 'Estado Reproductivo',
                    data: [loteData.estados?.Gestante || 0, loteData.estados?.Estatica || 0, loteData.estados?.Ciclando || 0, loteData.estados?.Sucia || 0],
                    backgroundColor: ['#FFC107', '#6c757d', '#17A2B8', '#DC3545'],
                    borderColor: '#1a1a2e',
                    borderWidth: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '60%',
                plugins: { legend: { position: 'bottom', labels: { color: '#ffffff', padding: 20 } } }
            }
        });
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
            navigateTo('login');
        }
    }
// Poblar select de procedimientos
        const actividadTipoSelect = document.getElementById('actividad-tipo');
        if (actividadTipoSelect) {
            actividadTipoSelect.innerHTML = '<option value="" selected disabled>Seleccione un procedimiento...</option>';
            Object.keys(PROCEDIMIENTOS).forEach(key => {
                actividadTipoSelect.add(new Option(PROCEDIMIENTOS[key].titulo, key));
            });
        }
    initApp();
});