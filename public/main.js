document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DEL FONDO ANIMADO ---
    const canvas = document.getElementById('animated-background');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        const numParticles = 70;
        const particleSize = 2;
        const connectionDistance = 150;

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            particles = []; // Reiniciar partículas al cambiar tamaño
            initParticles();
        }

        class Particle {
            constructor(x, y) {
                this.x = x || Math.random() * canvas.width;
                this.y = y || Math.random() * canvas.height;
                this.speedX = (Math.random() - 0.5) * 0.5; // Más lento
                this.speedY = (Math.random() - 0.5) * 0.5; // Más lento
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                // Rebotar en los bordes
                if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
                if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
            }

            draw() {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, particleSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function initParticles() {
            for (let i = 0; i < numParticles; i++) {
                particles.push(new Particle());
            }
        }

        function connectParticles() {
            for (let i = 0; i < particles.length; i++) {
                // empezar en i+1 para no conectar la partícula consigo misma ni repetir pares
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < connectionDistance) {
                        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - (distance / connectionDistance) * 0.8})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            requestAnimationFrame(animate);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
            }
            connectParticles();
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // Inicializar el tamaño del canvas y las partículas
        animate(); // Iniciar la animación
    }
    // --- FIN LÓGICA DEL FONDO ANIMADO ---
    // ... el resto de tu código de DOMContentLoaded sigue aquí ...
    // =================================================================
    // ===== 1. ESTADO GLOBAL Y CONFIGURACIÓN ==========================
    // =================================================================
    let currentUser = null;
    let currentRancho = null;
    let allVacasPropietario = [];
    let vacasIndex = new Map();
    let independentRanchoName = null;
    let loteActual = [];
    const API_URL = '/api';

    const vistas = {
        login: document.getElementById('vista-login'),
        registro: document.getElementById('vista-registro'),
        propietario: document.getElementById('vista-propietario'),
        mvz: document.getElementById('vista-mvz'),
        estadisticas: document.getElementById('vista-estadisticas'), // <-- AGREGA ESTA LÍNEA
    };

    const modalVacaMvz = document.getElementById('modal-agregar-vaca-mvz');
    const btnAbrirModalVacaMvz = document.getElementById('btn-abrir-modal-vaca-mvz');
    const btnCerrarModalVacaMvz = document.getElementById('btn-cerrar-modal-vaca-mvz');
    const modalBgVacaMvz = document.getElementById('modal-bg-vaca-mvz');
    // Referencias para el nuevo modal de confirmación
    const modalConfirmacion = document.getElementById('modal-confirmacion-eliminar');
    const btnCancelarEliminar = document.getElementById('btn-cancelar-eliminar');
    const btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');
    const nombreVacaEliminar = document.getElementById('nombre-vaca-eliminar');
    const actividadTipoSelect = document.getElementById('actividad-tipo');

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
    const RAZAS_BOVINAS = [
        'Aberdeen Angus', 'Ayrshire', 'Bazadaise', 'Beefmaster', 'Belgian Blue', 'Brahman',
        'Brangus', 'Charolais', 'Chianina', 'Criollo', 'Galloway', 'Gelbvieh', 'Gir',
        'Guzerá', 'Gyr Lechero', 'Guernsey', 'Hereford', 'Holstein', 'Jersey', 'Limousin',
        'Maine-Anjou', 'Marchigiana', 'Montbéliarde', 'Normando', 'Pardo Suizo',
        'Piemontese', 'Pinzgauer', 'Romagnola', 'Sahiwal', 'Santa Gertrudis', 'Sardo Negro',
        'Shorthorn', 'Simbrah', 'Simmental', 'Sindi', 'Tarentaise', 'Wagyu'
    ].sort((a, b) => a.localeCompare(b));

    // =================================================================
    // ===== 2. FUNCIONES DE AYUDA (HELPERS) ===========================
    // =================================================================

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

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const [year, month, day] = dateStr.split('T')[0].split('-');
        return `${day}/${month}/${year}`;
    };

    const prettyLabel = (str) => {
        if (!str) return '';
        return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const normalize = (s) => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

    const cambiarVista = (vista) => {
        Object.values(vistas).forEach((v) => v && v.classList.remove('activa'));
        vistas[vista] && vistas[vista].classList.add('activa');
    };

    const mostrarMensaje = (elId, texto, esError = true) => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.textContent = texto;
        el.className = `text-center mt-2 text-sm h-4 ${esError ? 'text-red-400' : 'text-green-400'}`;
        setTimeout(() => (el.textContent = ''), 4000);
    };

    const logout = () => {
        currentUser = null;
        currentRancho = null;
        independentRanchoName = null;
        loteActual = [];
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentRancho');
        cambiarVista('login');
    };

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
            if (!items || items.length === 0) {
                box.classList.add('hidden');
                return;
            }
            box.innerHTML = items.map(r => `<button type="button" data-value="${r}" class="w-full text-left px-3 py-2 hover:bg-white/10 focus:bg-white/10 focus:outline-none">${r}</button>`).join('');
            box.classList.remove('hidden');
            activeIndex = -1;
        };
        const openWithQuery = (q) => {
            const qn = normalize(q);
            if (qn.length < 2) {
                render([]);
                return;
            }
            const matches = RAZAS_BOVINAS.filter((r) => normalize(r).startsWith(qn)).slice(0, 30);
            render(matches);
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
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % buttons.length;
                buttons[activeIndex].focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + buttons.length) % buttons.length;
                buttons[activeIndex].focus();
            } else if (e.key === 'Enter' && activeIndex > -1) {
                e.preventDefault();
                input.value = buttons[activeIndex].dataset.value;
                box.classList.add('hidden');
            } else if (e.key === 'Escape') {
                box.classList.add('hidden');
            }
        });
        input.addEventListener('focus', () => {
            if (input.value.trim().length >= 2) openWithQuery(input.value);
        });
    }

    function poblarSelectLote(max = 50) {
        const sel = document.getElementById('actividad-lote');
        if (!sel) return;
        sel.innerHTML = '';
        for (let i = 1; i <= max; i++) {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = `Lote ${i}`;
            sel.appendChild(opt);
        }
    }

    // =================================================================
    // ===== NUEVO SISTEMA DE NAVEGACIÓN Y SESIÓN (VERSIÓN MEJORADA) ====
    // =================================================================

    const appContent = document.getElementById('app-content');
    const authContainer = document.querySelector('.auth-container');
    const appContainer = document.getElementById('app-container');

    // Función para cargar los datos del resumen en el dashboard del propietario
    async function cargarDatosDashboard() {
        if (!currentUser || currentUser.rol !== 'propietario') return;
        try {
            const ranchoId = currentUser.ranchos?.[0]?.id;
            if (!ranchoId) return;
            const res = await fetch(`/api/rancho/${ranchoId}/estadisticas`);
            if (!res.ok) throw new Error('No se pudieron cargar las estadísticas del dashboard.');
            const stats = await res.json();

            let totalVacas = 0;
            let totalGestantes = 0;

            for (const lote in stats) {
                totalVacas += stats[lote].totalVacas || 0;
                totalGestantes += (stats[lote].estados && stats[lote].estados.Gestante) || 0;
            }

            const elTotal = document.getElementById('resumen-total-vacas');
            const elGestantes = document.getElementById('resumen-vacas-gestantes');
            const elAlertas = document.getElementById('resumen-alertas');
            if (elTotal) elTotal.textContent = totalVacas;
            if (elGestantes) elGestantes.textContent = totalGestantes;
            if (elAlertas) elAlertas.textContent = 0; // Placeholder
        } catch (error) {
            console.error("Error al cargar datos del dashboard:", error);
        }
    }

    // La función principal que se encarga de cambiar el contenido
    function navigateTo(viewId) {
        if (!appContent) { console.error('Falta #app-content en el HTML'); return; }
        appContent.innerHTML = '';
        const template = document.getElementById(`template-${viewId}`);
        if (!template) {
            console.error(`No se encontró la plantilla para la vista: ${viewId}`);
            return;
        }

        const clone = template.content.cloneNode(true);
        appContent.appendChild(clone);

        // --- Lógica a ejecutar DESPUÉS de cargar la vista ---
        if (viewId === 'inicio-propietario') {
            const dashNombre = document.getElementById('dash-nombre-propietario');
            if (dashNombre) dashNombre.textContent = currentUser?.nombre || '';
            const hoy = new Date();
            const dashFecha = document.getElementById('dash-fecha-actual');
            if (dashFecha) dashFecha.textContent = hoy.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            cargarDatosDashboard();
        } else if (viewId === 'mis-vacas') {
            cargarVacasPropietario();
            // Aseguramos que el botón de agregar vaca funcione
            const btnAbrirModal = document.getElementById('btn-abrir-modal-vaca');
            if (btnAbrirModal) {
                btnAbrirModal.addEventListener('click', () => {
                    const modal = document.getElementById('modal-agregar-vaca');
                    if (modal) modal.classList.remove('hidden');
                });
            }
            initMisVacasListeners();
        } else if (viewId === 'estadisticas') {
            mostrarEstadisticas && mostrarEstadisticas();
        } else if (viewId === 'inicio-mvz') {
            const dashNombre = document.getElementById('dash-nombre-mvz');
            if (dashNombre) dashNombre.textContent = currentUser?.nombre || '';
            const hoy = new Date();
            const dashFecha = document.getElementById('dash-fecha-actual-mvz');
            if (dashFecha) dashFecha.textContent = hoy.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            // Aquí cargaremos los datos del MVZ en el futuro
        }
    }

    // Función que configura los listeners de los botones de navegación
    function setupNavigation() {
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', () => {
                const viewId = button.dataset.vista;
                const parent = button.parentElement;
                const prevActive = parent ? parent.querySelector('.active') : null;
                if (prevActive) prevActive.classList.remove('active');
                button.classList.add('active');
                navigateTo(viewId);
            });
        });
    }

    // NUEVA FUNCIÓN iniciarSesion (más simple)
    const iniciarSesion = () => {
        if (!currentUser) return;

        if (authContainer) authContainer.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');

        if (currentUser.rol === 'propietario') {
            const navProp = document.getElementById('nav-propietario');
            const navMvz = document.getElementById('nav-mvz');
            if (navProp) navProp.classList.remove('hidden');
            if (navMvz) navMvz.classList.add('hidden');
            navigateTo('inicio-propietario');
        } else { // MVZ
            const navProp = document.getElementById('nav-propietario');
            const navMvz = document.getElementById('nav-mvz');
            if (navProp) navProp.classList.add('hidden');
            if (navMvz) navMvz.classList.remove('hidden');
            navigateTo('inicio-mvz');
        }

        setupNavigation();
    };

    // --- Lógica de Propietario ---
    // Función que inicializa los listeners para la vista "Mis Vacas"
    function initMisVacasListeners() {
        const vacaBuscarInput = document.getElementById('vaca-buscar');
        if (vacaBuscarInput) {
            vacaBuscarInput.addEventListener('input', (e) => {
                const searchTerm = (e.target.value || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
                if (searchTerm.length < 2 && searchTerm.length !== 0) {
                    renderVacasPropietario(allVacasPropietario);
                    return;
                }
                const filteredVacas = allVacasPropietario.filter(vaca =>
                    (vaca.nombre || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(searchTerm) ||
                    (vaca.numero_arete || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(searchTerm)
                );
                renderVacasPropietario(filteredVacas);
            });
        }

        const listaVacas = document.getElementById('lista-vacas');
        if (listaVacas) {
            listaVacas.addEventListener('click', (e) => {
                // Lógica para ver historial o mostrar modal de eliminación
                const target = e.target;
                const vacaCard = target.closest('.vaca-card');
                if (!vacaCard) return;

                const vacaId = vacaCard.dataset.vacaId;
                const vacaNombre = vacaCard.dataset.vacaNombre;

                if (target.closest('[data-action="delete-vaca"]')) {
                    const nombreVacaEliminar = document.getElementById('nombre-vaca-eliminar');
                    const btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');
                    const modalConfirmacion = document.getElementById('modal-confirmacion-eliminar');

                    if (nombreVacaEliminar) nombreVacaEliminar.textContent = vacaNombre;
                    if (btnConfirmarEliminar) btnConfirmarEliminar.dataset.vacaId = vacaId;
                    if (modalConfirmacion) modalConfirmacion.classList.remove('hidden');

                } else if (target.closest('[data-action="view-history"]')) {
                    if (window.app && window.app.verHistorial) window.app.verHistorial(vacaId, vacaNombre);
                }
            });
        }
    }

    const cargarVacasPropietario = async () => {
        const ranchoId = currentUser?.ranchos?.[0]?.id;
        const lista = document.getElementById('lista-vacas');
        if (!lista) return;
        lista.innerHTML = '<p class="text-gray-400 text-center">Cargando vacas...</p>';

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
        lista.innerHTML = '';

        if (!vacasToRender || vacasToRender.length === 0) {
            lista.innerHTML = '<p class="text-gray-400 text-center">Aún no tienes vacas o no hay resultados para tu búsqueda.</p>';
            return;
        }

        vacasToRender.forEach((vaca) => {
            const vacaCard = document.createElement('div');
            vacaCard.className = 'vaca-card p-4 rounded-xl flex items-center bg-black/20 hover:bg-black/30 transition-colors';
            vacaCard.dataset.vacaId = vaca.id;
            vacaCard.dataset.vacaNombre = vaca.nombre;

            const imageUrl = vaca.foto_url || 'https://i.imgur.com/s6l2h27.png';

            vacaCard.innerHTML = `
                <div class="flex-1 flex items-center cursor-pointer" data-action="view-history">
                    <img src="${imageUrl}" alt="Vaca ${vaca.nombre}" class="w-20 h-20 rounded-lg object-cover mr-4 border border-white/10">
                    <div class="flex-1">
                        <p class="font-bold text-white text-lg">${vaca.nombre} <span class="text-sm font-normal text-gray-400">#${vaca.numero_arete}</span></p>
                        <p class="text-xs text-gray-300">Raza: ${vaca.raza || 'Desconocida'}</p>
                        <p class="text-xs text-gray-300">Nacimiento: ${formatDate(vaca.fecha_nacimiento) || '-'}</p>
                    </div>
                </div>
                <button data-action="delete-vaca" class="delete-vaca-btn text-red-400 hover:text-red-600 text-2xl p-2 rounded-full hover:bg-red-500/10">
                    🗑️
                </button>
            `;
            lista.appendChild(vacaCard);
        });
    };

    // --- Lógica de MVZ ---
    async function cargarVacasParaMVZ() {
        if (!currentRancho) return;
        const url = `${API_URL}/vacas/rancho/${currentRancho.id}`;
        try {
            const res = await fetch(url);
            const vacas = await res.json();
            const datalist = document.getElementById('lista-aretes-autocompletar');
            if (!datalist) return;
            datalist.innerHTML = '';
            vacasIndex.clear();
            vacas.forEach((v) => {
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

        if (!lista || !btnFinalizar) return;

        if (loteActual.length === 0) {
            lista.innerHTML = '<p class="text-gray-400">Aún no has agregado vacas a este lote.</p>';
            btnFinalizar.classList.add('hidden');
            if (actividadTipoSelect) actividadTipoSelect.disabled = false;
            const actividadLoteEl = document.getElementById('actividad-lote');
            if (actividadLoteEl) actividadLoteEl.disabled = false;
            return;
        }

        lista.innerHTML = loteActual.map((item, idx) => `
            <div class="bg-white/5 p-2 rounded flex justify-between items-center text-sm">
                <span>Arete: <strong>${item.areteVaca}</strong>${item.raza ? ` (${item.raza})` : ''}</span>
                <button class="text-red-400 hover:text-red-600 font-bold text-lg" onclick="app.removerDelLote(${idx})">&times;</button>
            </div>`).join('');

        btnFinalizar.classList.remove('hidden');
    }

    // =================================================================
    // ===== 4. OBJETO GLOBAL `app` (Para funciones en HTML) ===========
    // =================================================================

    window.app = {
        verHistorial: async (vacaId, vacaNombre) => {
            const nombreEl = document.getElementById('modal-nombre-vaca');
            if (nombreEl) nombreEl.textContent = vacaNombre;
            const contenedor = document.getElementById('modal-contenido-historial');
            if (!contenedor) return;
            contenedor.innerHTML = '<p>Cargando historial...</p>';
            const modalHist = document.getElementById('modal-historial');
            if (modalHist) modalHist.classList.remove('hidden');

            try {
                const res = await fetch(`${API_URL}/actividades/vaca/${vacaId}`);
                if (!res.ok) throw new Error('No se pudo cargar el historial.');
                const historial = await res.json();

                if (!historial || historial.length === 0) {
                    contenedor.innerHTML = '<p>No hay actividades registradas para esta vaca.</p>';
                    return;
                }

                contenedor.innerHTML = ''; // Limpiar antes de agregar
                historial.forEach((item) => {
                    const tipo = item.tipo_actividad || 'Actividad Desconocida';
                    const fecha = item.fecha_actividad ? formatDate(item.fecha_actividad) : 'Fecha Desconocida';
                    const nombreMvz = (item.usuarios && item.usuarios.nombre) ? item.usuarios.nombre : 'Usuario Desconocido';
                    let detallesHtml = '';
                    try {
                        const detalles = JSON.parse(item.descripcion || '{}');
                        detallesHtml = Object.entries(detalles).map(([key, value]) => `<dt class="text-gray-400">${prettyLabel(key)}:</dt><dd class="text-white">${value}</dd>`).join('');
                    } catch (e) {
                        detallesHtml = '<dt class="text-gray-400">Detalles:</dt><dd class="text-white">No disponibles</dd>';
                    }
                    contenedor.innerHTML += `
                        <div class="bg-black/20 p-4 rounded-lg mt-2">
                            <p class="font-semibold text-cyan-400">${tipo} - <span class="font-normal text-gray-300">${fecha}</span></p>
                            <p class="text-sm"><span class="font-semibold text-gray-300">Realizado por:</span> ${nombreMvz}</p>
                            <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">${detallesHtml}</dl>
                        </div>`;
                });
            } catch (error) {
                console.error("Error al mostrar historial:", error);
                contenedor.innerHTML = '<p class="text-red-400">Hubo un error al cargar el historial. Inténtalo de nuevo.</p>';
            }
        },
        removerDelLote: (i) => {
            loteActual.splice(i, 1);
            renderLoteActual();
        },
    };
}); // fin DOMContentLoaded


// =================================================================
// ===== 5. ASIGNACIÓN DE EVENTOS (EVENT LISTENERS) ================
// =================================================================

// --- Navegación y Autenticación ---
document.getElementById('link-a-registro')?.addEventListener('click', () => cambiarVista('registro'));
document.getElementById('link-a-login')?.addEventListener('click', () => cambiarVista('login'));
document.getElementById('btn-logout-propietario')?.addEventListener('click', logout);
document.getElementById('btn-logout-mvz')?.addEventListener('click', logout);

document.getElementById('registro-rol')?.addEventListener('change', (e) => {
    const campoRancho = document.getElementById('campo-rancho');
    if (campoRancho) campoRancho.classList.toggle('hidden', e.target.value !== 'propietario');
});

document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    const rememberEl = document.getElementById('remember-me');
    const email = emailEl ? emailEl.value : '';
    const password = passEl ? passEl.value : '';
    const rememberMe = rememberEl ? rememberEl.checked : false;

    try {
        const res = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        const json = await (async () => { try { return await res.json(); } catch { return {}; } })();
        if (!res.ok) throw new Error(json.message || 'Error en login');

        const respuesta = json;
        currentUser = respuesta.user;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        // --- INICIO DE LA NUEVA LÓGICA ---
        if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }
        // --- FIN DE LA NUEVA LÓGICA ---

        iniciarSesion();
    } catch (err) {
        mostrarMensaje('login-mensaje', err.message);
    }
});

document.getElementById('form-registro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const form = e.target;
        const formData = new FormData(form);
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            body: formData
        });
        const json = await (async () => { try { return await res.json(); } catch { return {}; } })();
        if (!res.ok) throw new Error(json.message || 'Error en registro');
        mostrarMensaje('registro-mensaje', '¡Registro exitoso! Ahora puedes iniciar sesión.', false);
        form.reset();
        cambiarVista('login');
    } catch (err) {
        mostrarMensaje('registro-mensaje', err.message);
    }
});

// --- Panel de Propietario ---
document.getElementById('form-agregar-vaca')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const form = e.target;
        const formData = new FormData(form);
        const dia = formData.get('dia');
        const mes = formData.get('mes');
        const ano = formData.get('ano');
        if (!dia || !mes || !ano) {
            mostrarMensaje('vaca-mensaje', 'Por favor, selecciona una fecha de nacimiento completa.');
            return;
        }
        const fechaCompleta = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        formData.append('fechaNacimiento', fechaCompleta);

        if (!currentUser?.id || !currentUser?.ranchos?.[0]?.id) {
            mostrarMensaje('vaca-mensaje', 'No se encontró usuario o rancho activo.');
            return;
        }

        formData.append('propietarioId', currentUser.id);
        formData.append('ranchoId', currentUser.ranchos[0].id);

        const res = await fetch(`${API_URL}/vacas`, {
            method: 'POST',
            body: formData
        });

        const json = await (async () => { try { return await res.json(); } catch { return {}; } })();
        if (!res.ok) throw new Error(json.message || 'Error al agregar vaca.');
        mostrarMensaje('vaca-mensaje', 'Vaca agregada con éxito.', false);
        form.reset();
        cargarVacasPropietario();
    } catch (err) {
        mostrarMensaje('vaca-mensaje', err.message);
    }
});

document.getElementById('btn-ver-estadisticas')?.addEventListener('click', mostrarEstadisticas);

document.getElementById('form-actualizar-logo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || !currentUser.ranchos || !currentUser.ranchos[0]) {
        mostrarMensaje('update-logo-mensaje', 'Error: No se encontró información del rancho.');
        return;
    }
    const form = e.target;
    const formData = new FormData(form);
    const ranchoId = currentUser.ranchos[0].id;
    try {
        const res = await fetch(`/api/rancho/${ranchoId}/logo`, {
            method: 'POST',
            body: formData
        });
        const json = await (async () => { try { return await res.json(); } catch { return {}; } })();
        if (!res.ok) throw new Error(json.message || 'Error al actualizar logo');
        const updatedRancho = json;
        currentUser.ranchos[0].logo_url = updatedRancho.logo_url;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        const logoImg = document.getElementById('logo-rancho');
        if (logoImg) {
            logoImg.src = updatedRancho.logo_url;
            logoImg.classList.remove('hidden');
        }
        mostrarMensaje('update-logo-mensaje', '¡Logo actualizado con éxito!', false);
        form.reset();
    } catch (err) {
        mostrarMensaje('update-logo-mensaje', err.message);
    }
});

// --- Panel de MVZ ---
document.getElementById('btn-modo-rancho')?.addEventListener('click', () => {
    const sel = document.getElementById('mvz-seleccion-modo');
    const acceso = document.getElementById('mvz-acceso-rancho');
    if (sel) sel.style.display = 'none';
    if (acceso) acceso.classList.remove('hidden');
});

document.getElementById('btn-modo-independiente')?.addEventListener('click', () => {
    const sel = document.getElementById('mvz-seleccion-modo');
    const herramientas = document.getElementById('mvz-herramientas');
    const panelInd = document.getElementById('panel-rancho-independiente');
    const modoEl = document.getElementById('modo-trabajo-activo');
    const logoPanel = document.getElementById('logo-rancho-mvz-panel');

    if (sel) sel.style.display = 'none';
    if (herramientas) herramientas.classList.remove('hidden');
    if (panelInd) panelInd.classList.remove('hidden');
    if (modoEl) modoEl.textContent = 'Independiente';
    if (logoPanel) logoPanel.classList.add('hidden');

    currentRancho = null;
    loteActual = [];
    renderLoteActual();
    if (btnAbrirModalVacaMvz) btnAbrirModalVacaMvz.classList.add('hidden');
    cargarVacasParaMVZ();
});

const volverSeleccion = () => {
    const sel = document.getElementById('mvz-seleccion-modo');
    const acceso = document.getElementById('mvz-acceso-rancho');
    const herramientas = document.getElementById('mvz-herramientas');
    if (sel) sel.style.display = 'flex';
    if (acceso) acceso.classList.add('hidden');
    if (herramientas) herramientas.classList.add('hidden');
    currentRancho = null; independentRanchoName = null; loteActual = [];
    sessionStorage.removeItem('currentRancho');
};
document.getElementById('btn-volver-seleccion1')?.addEventListener('click', volverSeleccion);
document.getElementById('btn-volver-seleccion2')?.addEventListener('click', volverSeleccion);

document.getElementById('form-acceso-rancho')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigoEl = document.getElementById('codigo-rancho');
    const codigo = codigoEl ? codigoEl.value : '';
    try {
        const res = await fetch(`${API_URL}/rancho/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) });
        const json = await (async () => { try { return await res.json(); } catch { return {}; } })();
        if (!res.ok) throw new Error(json.message || 'Código no válido.');
        currentRancho = json;
        sessionStorage.setItem('currentRancho', JSON.stringify(currentRancho));
        const mvzAcc = document.getElementById('mvz-acceso-rancho');
        const herramientas = document.getElementById('mvz-herramientas');
        const panelInd = document.getElementById('panel-rancho-independiente');
        const modoEl = document.getElementById('modo-trabajo-activo');
        if (mvzAcc) mvzAcc.classList.add('hidden');
        if (herramientas) herramientas.classList.remove('hidden');
        if (panelInd) panelInd.classList.add('hidden');
        if (modoEl && currentRancho) modoEl.textContent = `En Rancho: ${currentRancho.nombre}`;
        if (btnAbrirModalVacaMvz) btnAbrirModalVacaMvz.classList.remove('hidden');
        cargarVacasParaMVZ();

        const logoImgMvz = document.getElementById('logo-rancho-mvz-panel');
        if (logoImgMvz) {
            if (currentRancho && currentRancho.logo_url) {
                logoImgMvz.src = currentRancho.logo_url;
                logoImgMvz.classList.remove('hidden');
            } else {
                logoImgMvz.classList.add('hidden');
            }
        }
    } catch (err) {
        mostrarMensaje('rancho-mensaje', err.message);
    }
});

document.getElementById('btn-fijar-rancho')?.addEventListener('click', () => {
    const nombreEl = document.getElementById('nombre-rancho-independiente');
    const nombre = nombreEl ? nombreEl.value : '';
    if (!nombre.trim()) return;
    independentRanchoName = nombre.trim();
    const fijadoEl = document.getElementById('nombre-rancho-fijado');
    if (fijadoEl) fijadoEl.textContent = independentRanchoName;
    const formFijar = document.getElementById('form-fijar-rancho');
    const infoFijado = document.getElementById('rancho-fijado-info');
    if (formFijar) formFijar.classList.add('hidden');
    if (infoFijado) infoFijado.classList.remove('hidden');
});

document.getElementById('btn-cambiar-rancho-fijado')?.addEventListener('click', () => {
    independentRanchoName = null;
    const nombreInput = document.getElementById('nombre-rancho-independiente');
    if (nombreInput) nombreInput.value = '';
    const formFijar = document.getElementById('form-fijar-rancho');
    const infoFijado = document.getElementById('rancho-fijado-info');
    if (formFijar) formFijar.classList.remove('hidden');
    if (infoFijado) infoFijado.classList.add('hidden');
});

if (actividadTipoSelect) {
    const camposDinamicosContainer = document.getElementById('campos-dinamicos-actividad');
    actividadTipoSelect.addEventListener('change', (e) => {
        if (!camposDinamicosContainer) return;
        camposDinamicosContainer.innerHTML = '';
        const procedimiento = PROCEDIMIENTOS[e.target.value];
        if (!procedimiento) return;
        procedimiento.campos.forEach((campo) => {
            let htmlCampo;
            if (campo.tipo === 'checkbox') {
                htmlCampo = `<div class="flex items-center mt-2" id="cont-${campo.id}"><input id="${campo.id}" type="checkbox" class="h-5 w-5 rounded !w-auto"><label for="${campo.id}" class="ml-2 text-sm font-medium text-gray-300">${campo.label}</label></div>`;
            } else {
                htmlCampo = `<div id="cont-${campo.id}" class="${campo.oculto ? 'hidden' : ''}"><label for="${campo.id}" class="block text-sm font-medium text-gray-300 mb-1">${campo.label}</label>`;
                if (campo.tipo === 'select') {
                    const opcionesHtml = `<option value="" selected disabled>Seleccione...</option>` + campo.opciones.map((op) => `<option value="${op}">${op}</option>`).join('');
                    htmlCampo += `<select id="${campo.id}" ${campo.revela ? `data-revela-id="${campo.revela}"` : ''}>${opcionesHtml}</select>`;
                } else if (campo.tipo === 'textarea') {
                    htmlCampo += `<textarea id="${campo.id}" rows="3" class="text-base"></textarea>`;
                } else {
                    htmlCampo += `<input type="${campo.tipo}" id="${campo.id}" placeholder="${campo.placeholder || ''}">`;
                }
                htmlCampo += `</div>`;
            }
            camposDinamicosContainer.innerHTML += htmlCampo;
        });
    });

    camposDinamicosContainer?.addEventListener('change', (e) => {
        if (e.target.dataset.revelaId) {
            const elARevelar = document.getElementById(`cont-${e.target.dataset.revelaId}`);
            if (!elARevelar) return;
            const debeRevelar = e.target.value === 'Sí' || (e.target.id === 'tecnica' && e.target.value === 'IA Convencional');
            elARevelar.classList.toggle('hidden', !debeRevelar);
        }
    });
}

document.getElementById('form-agregar-actividad')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentRancho && !independentRanchoName) {
        return mostrarMensaje('actividad-mensaje', "En modo independiente, primero fija un rancho.");
    }
    const areteEl = document.getElementById('actividad-arete');
    const razaEl = document.getElementById('actividad-raza');
    const loteEl = document.getElementById('actividad-lote');

    const areteVaca = areteEl ? areteEl.value.trim() : '';
    const raza = razaEl ? (razaEl.value || '').trim() : '';
    const tipoKey = actividadTipoSelect ? actividadTipoSelect.value : '';
    const loteNumero = loteEl ? loteEl.value : '';

    if (!areteVaca || !tipoKey || !loteNumero) return mostrarMensaje('actividad-mensaje', 'Completa arete, tipo y lote.');

    if (loteActual.length > 0 && (loteActual[0].tipoKey !== tipoKey || loteActual[0].loteNumero !== loteNumero)) {
        return mostrarMensaje('actividad-mensaje', `Este lote es de "${loteActual[0].tipoLabel}" (Lote ${loteActual[0].loteNumero}). Termínalo para cambiar.`);
    }
    const detalles = {};
    const campos = PROCEDIMIENTOS[tipoKey]?.campos || [];
    campos.forEach(campo => {
        const el = document.getElementById(campo.id);
        if (!el) return;
        const cont = el.closest('div[id^="cont-"]');
        if (cont && cont.classList.contains('hidden')) return;
        const valor = (el.type === 'checkbox') ? (el.checked ? 'Sí' : 'No') : el.value;
        if (valor && valor !== '') {
            detalles[campo.id] = valor;
        }
    });
    loteActual.push({ loteNumero, areteVaca, tipoKey, tipoLabel: PROCEDIMIENTOS[tipoKey]?.titulo || tipoKey, raza, fecha: new Date().toISOString().split('T')[0], detalles });
    if (actividadTipoSelect) actividadTipoSelect.disabled = true;
    if (loteEl) loteEl.disabled = true;
    renderLoteActual();
    mostrarMensaje('actividad-mensaje', `Vaca ${areteVaca} agregada al lote ${loteNumero}.`, false);
    if (areteEl) areteEl.value = '';
    if (razaEl) razaEl.value = '';
    if (areteEl) areteEl.focus();
});

document.getElementById('btn-finalizar-lote')?.addEventListener('click', async () => {
    if (loteActual.length === 0) return;
    try {
        if (!currentUser?.id) return mostrarMensaje('actividad-mensaje', 'Usuario no identificado.');
        const payload = {
            mvzId: currentUser.id,
            ranchoId: currentRancho ? currentRancho.id : null,
            nombreRanchoIndependiente: currentRancho ? null : independentRanchoName,
            lote: loteActual,
        };
        const res = await fetch(`${API_URL}/lote/pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await (async () => { try { return await res.json(); } catch { return {}; } })();
        if (!res.ok) throw new Error(json.message || 'Error al generar PDF.');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_lote_${loteActual[0].loteNumero}_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        loteActual = [];
        renderLoteActual();
    } catch (err) {
        alert(err.message);
    }
});

btnAbrirModalVacaMvz?.addEventListener('click', () => modalVacaMvz && modalVacaMvz.classList.remove('hidden'));
btnCerrarModalVacaMvz?.addEventListener('click', () => modalVacaMvz && modalVacaMvz.classList.add('hidden'));
modalBgVacaMvz?.addEventListener('click', () => modalVacaMvz && modalVacaMvz.classList.add('hidden'));

// La función principal que se encarga de cambiar el contenido y activar listeners
function navigateTo(viewId) {
    if (!appContent) { console.error('Falta #app-content en el HTML'); return; }
    appContent.innerHTML = '';
    const template = document.getElementById(`template-${viewId}`);
    if (!template) {
        console.error(`No se encontró la plantilla para la vista: ${viewId}`);
        return;
    }
    
    const clone = template.content.cloneNode(true);
    appContent.appendChild(clone);

    // --- Lógica a ejecutar DESPUÉS de cargar la vista ---
    if (viewId === 'inicio-propietario') {
        const elNombre = document.getElementById('dash-nombre-propietario');
        if (elNombre) elNombre.textContent = currentUser?.nombre || '';
        // ... (resto de la lógica del dashboard)
    } 
    else if (viewId === 'mis-vacas') {
        cargarVacasPropietario();
        initMisVacasListeners();
    }
}

const areteInput = document.getElementById('actividad-arete');
if (areteInput) {
    const razaMvzInput = document.getElementById('actividad-raza');
    const tryAutofillRaza = () => {
        if (!currentRancho) return;
        const key = String(areteInput.value || '').trim();
        const info = vacasIndex.get(key);
        if (info && info.raza && razaMvzInput) {
            razaMvzInput.value = info.raza;
        }
    };
    areteInput.addEventListener('input', tryAutofillRaza);
    areteInput.addEventListener('change', tryAutofillRaza);
}

// --- Modales (General) ---
document.getElementById('modal-bg')?.addEventListener('click', () => {
    const modalHist = document.getElementById('modal-historial');
    if (modalHist) modalHist.classList.add('hidden');
});
document.getElementById('btn-cerrar-modal')?.addEventListener('click', () => {
    const modalHist = document.getElementById('modal-historial');
    if (modalHist) modalHist.classList.add('hidden');
});

// --- Lógica para el modal de confirmación de eliminación ---
btnCancelarEliminar?.addEventListener('click', () => {
    if (modalConfirmacion) modalConfirmacion.classList.add('hidden');
});

btnConfirmarEliminar?.addEventListener('click', async () => {
    const vacaId = btnConfirmarEliminar.dataset.vacaId;
    if (!vacaId) return;

    try {
        const res = await fetch(`${API_URL}/vacas/${vacaId}`, { method: 'DELETE' });
        const json = await (async () => { try { return await res.json(); } catch { return {}; } })();
        if (!res.ok) throw new Error(json.message || 'No se pudo eliminar la vaca.');

        if (modalConfirmacion) modalConfirmacion.classList.add('hidden');
        cargarVacasPropietario();
    } catch (err) {
        console.error("Error al eliminar vaca:", err);
        alert(err.message);
        if (modalConfirmacion) modalConfirmacion.classList.add('hidden');
    }
});

// =================================================================
// ===== 6. INICIO DE LA APP Y RESTAURACIÓN DE SESIÓN ==============
// =================================================================

// --- Inicialización de componentes ---
popularSelectsDeFecha();
attachRazaAutocomplete('actividad-raza');
attachRazaAutocomplete('vaca-raza');
attachRazaAutocomplete('vaca-raza-mvz');
poblarSelectLote(50);
if (actividadTipoSelect) {
    actividadTipoSelect.innerHTML = '<option value="" selected>Seleccione un procedimiento...</option>'; // Limpiar por si acaso
    Object.keys(PROCEDIMIENTOS).forEach((key) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = PROCEDIMIENTOS[key].titulo;
        actividadTipoSelect.appendChild(option);
    });
}

// ===== INICIO DE LA APP Y RESTAURACIÓN DE SESIÓN ==============

// --- Lógica para "Recuérdame" (Cargar email) ---
const savedEmail = localStorage.getItem('rememberedEmail');
if (savedEmail) {
    const loginEmailEl = document.getElementById('login-email');
    const rememberEl = document.getElementById('remember-me');
    if (loginEmailEl) loginEmailEl.value = savedEmail;
    if (rememberEl) rememberEl.checked = true;
}

// --- Restauración de Sesión ---
const savedUser = sessionStorage.getItem('currentUser');
if (savedUser) {
    try {
        currentUser = JSON.parse(savedUser);
    } catch { currentUser = null; }
    const savedRancho = sessionStorage.getItem('currentRancho');
    if (savedRancho) {
        try { currentRancho = JSON.parse(savedRancho); } catch { currentRancho = null; }
    }
    iniciarSesion();

    if (currentUser?.rol === 'mvz' && currentRancho) {
        const mvzSel = document.getElementById('mvz-seleccion-modo');
        const mvzHerr = document.getElementById('mvz-herramientas');
        const modoEl = document.getElementById('modo-trabajo-activo');
        if (mvzSel) mvzSel.style.display = 'none';
        if (mvzHerr) mvzHerr.classList.remove('hidden');
        if (modoEl) modoEl.textContent = `En Rancho: ${currentRancho.nombre}`;
        if (btnAbrirModalVacaMvz) btnAbrirModalVacaMvz.classList.remove('hidden');
        cargarVacasParaMVZ();

        const logoImgMvz = document.getElementById('logo-rancho-mvz-panel');
        if (logoImgMvz && currentRancho?.logo_url) {
            logoImgMvz.src = currentRancho.logo_url;
            logoImgMvz.classList.remove('hidden');
        }
    }
} else {
    cambiarVista('login');
}

// =================================================================
// ===== LÓGICA DE ESTADÍSTICAS ====================================
// =================================================================

const btnEstadisticasVolver = document.getElementById('btn-estadisticas-volver');
const statsTabsContainer = document.getElementById('estadisticas-tabs-lotes');
const statsContenido = document.getElementById('estadisticas-contenido');
const statsTituloLote = document.getElementById('estadisticas-titulo-lote');
const statsResumenTexto = document.getElementById('estadisticas-resumen-texto');
const grafEl = document.getElementById('grafico-estado-reproductivo');
const ctx = grafEl ? grafEl.getContext && grafEl.getContext('2d') : null;

let miGrafico = null;
let datosEstadisticas = null;

function renderizarGrafico(numeroLote) {
    if (!datosEstadisticas || !datosEstadisticas[numeroLote]) return;
    const loteData = datosEstadisticas[numeroLote];

    if (statsTituloLote) statsTituloLote.textContent = `Lote ${numeroLote}`;
    let resumenHtml = `
        <p><strong>Total de Vacas:</strong> ${loteData.totalVacas || 0}</p>
        <p><strong>Gestantes:</strong> ${loteData.estados?.Gestante || 0} vacas</p>
        <p><strong>Estáticas:</strong> ${loteData.estados?.Estatica || 0} vacas</p>
        <p><strong>Ciclando:</strong> ${loteData.estados?.Ciclando || 0} vacas</p>
    `;
    const razasOrdenadas = Object.entries(loteData.razas || {}).sort(([,a],[,b]) => b - a);
    if (razasOrdenadas.length > 0) resumenHtml += `<p><strong>Raza Principal:</strong> ${razasOrdenadas[0][0]}</p>`;
    if (statsResumenTexto) statsResumenTexto.innerHTML = resumenHtml;

    if (miGrafico) {
        try { miGrafico.destroy(); } catch (e) { console.warn('No se pudo destruir gráfico previo', e); }
        miGrafico = null;
    }

    if (!ctx) return; // no tenemos contexto para dibujar
    const labels = ['Gestantes', 'Estáticas', 'Ciclando', 'Sucias'];
    const data = [
        loteData.estados?.Gestante || 0,
        loteData.estados?.Estatica || 0,
        loteData.estados?.Ciclando || 0,
        loteData.estados?.Sucia || 0
    ];

    miGrafico = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                label: 'Estado Reproductivo',
                data,
                backgroundColor: ['#FFC107', '#6c757d', '#17A2B8', '#DC3545'],
                borderColor: '#1a1a2e',
                borderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#ffffff', padding: 20 }
                }
            }
        }
    });
}

async function mostrarEstadisticas() {
    cambiarVista('estadisticas');
    if (statsContenido) statsContenido.style.visibility = 'hidden';
    if (statsTabsContainer) statsTabsContainer.innerHTML = '<p class="text-gray-400 p-4">Cargando estadísticas...</p>';

    try {
        const ranchoId = currentUser?.ranchos?.[0]?.id;
        if (!ranchoId) throw new Error('No se encontró rancho para mostrar estadísticas.');
        const res = await fetch(`/api/rancho/${ranchoId}/estadisticas`);
        const json = await (async () => { try { return await res.json(); } catch { return {}; } })();
        if (!res.ok) throw new Error(json.message || 'No se pudieron cargar las estadísticas.');
        datosEstadisticas = json;
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
                statsTabsContainer.querySelectorAll('.tab-lote').forEach(t => t.classList.remove('active-tab'));
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

btnEstadisticasVolver?.addEventListener('click', () => {
    cambiarVista('propietario');
});
