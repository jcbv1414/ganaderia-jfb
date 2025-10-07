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
                for (let j = i; j < particles.length; j++) {
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
        Object.values(vistas).forEach((v) => v.classList.remove('activa'));
        vistas[vista].classList.add('activa');
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
            input.parentElement.style.position = 'relative';
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
    // ===== 3. FUNCIONES PRINCIPALES Y LÓGICA DE LA APP ===============
    // =================================================================

    const iniciarSesion = () => {
        if (!currentUser) return;
        if (currentUser.rol === 'propietario') {
            document.getElementById('nombre-propietario').textContent = currentUser.nombre;
            const rancho = currentUser.ranchos[0];

            if (rancho) {
                document.getElementById('info-rancho-propietario').innerHTML = `<p class="text-gray-300">Rancho: <strong class="text-white">${rancho.nombre}</strong> | Código de Acceso: <strong class="text-cyan-400 text-lg">${rancho.codigo}</strong> (Compártelo con tu MVZ)</p>`;
                cargarVacasPropietario();
            }

            const logoImg = document.getElementById('logo-rancho');
            if (rancho && rancho.logo_url) {
                logoImg.src = rancho.logo_url;
                logoImg.classList.remove('hidden');
            } else {
                logoImg.classList.add('hidden');
            }
            cambiarVista('propietario');
        } else { // MVZ
            document.getElementById('nombre-mvz').textContent = currentUser.nombre;
            document.getElementById('mvz-seleccion-modo').style.display = 'flex';
            document.getElementById('mvz-acceso-rancho').classList.add('hidden');
            document.getElementById('mvz-herramientas').classList.add('hidden');
            cambiarVista('mvz');
        }
    };

    // --- Lógica de Propietario ---
    const cargarVacasPropietario = async () => {
        const ranchoId = currentUser.ranchos[0].id;
        const lista = document.getElementById('lista-vacas');
        lista.innerHTML = '<p class="text-gray-400 text-center">Cargando vacas...</p>';

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
        lista.innerHTML = '';

        if (vacasToRender.length === 0) {
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
            document.getElementById('actividad-lote').disabled = false;
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
            document.getElementById('modal-nombre-vaca').textContent = vacaNombre;
            const contenedor = document.getElementById('modal-contenido-historial');
            contenedor.innerHTML = '<p>Cargando historial...</p>';
            document.getElementById('modal-historial').classList.remove('hidden');

            try {
                const res = await fetch(`${API_URL}/actividades/vaca/${vacaId}`);
                if (!res.ok) throw new Error('No se pudo cargar el historial.');
                const historial = await res.json();

                if (historial.length === 0) {
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

    // =================================================================
    // ===== 5. ASIGNACIÓN DE EVENTOS (EVENT LISTENERS) ================
    // =================================================================
    
    // --- Navegación y Autenticación ---
    document.getElementById('link-a-registro').addEventListener('click', () => cambiarVista('registro'));
    document.getElementById('link-a-login').addEventListener('click', () => cambiarVista('login'));
    document.getElementById('btn-logout-propietario').addEventListener('click', logout);
    document.getElementById('btn-logout-mvz').addEventListener('click', logout);

    document.getElementById('registro-rol').addEventListener('change', (e) => {
        document.getElementById('campo-rancho').classList.toggle('hidden', e.target.value !== 'propietario');
    });

    document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked; // <-- Obtenemos el valor del checkbox

    try {
        const res = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        if (!res.ok) throw new Error((await res.json()).message);
        
        const respuesta = await res.json();
        currentUser = respuesta.user;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        // --- INICIO DE LA NUEVA LÓGICA ---
        if (rememberMe) {
            // Si la casilla está marcada, guardamos el correo en localStorage
            localStorage.setItem('rememberedEmail', email);
        } else {
            // Si no está marcada, nos aseguramos de borrar cualquier correo guardado
            localStorage.removeItem('rememberedEmail');
        }
        // --- FIN DE LA NUEVA LÓGICA ---

        iniciarSesion();
    } catch (err) {
        mostrarMensaje('login-mensaje', err.message);
    }
});

    document.getElementById('form-registro').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const form = e.target;
            const formData = new FormData(form);
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                body: formData
            });
            if (!res.ok) throw new Error((await res.json()).message);
            mostrarMensaje('registro-mensaje', '¡Registro exitoso! Ahora puedes iniciar sesión.', false);
            form.reset();
            cambiarVista('login');
        } catch (err) {
            mostrarMensaje('registro-mensaje', err.message);
        }
    });

    // --- Panel de Propietario ---
    document.getElementById('form-agregar-vaca').addEventListener('submit', async (e) => {
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
            formData.append('propietarioId', currentUser.id);
            formData.append('ranchoId', currentUser.ranchos[0].id);

            const res = await fetch(`${API_URL}/vacas`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error((await res.json()).message || 'Error al agregar vaca.');
            mostrarMensaje('vaca-mensaje', 'Vaca agregada con éxito.', false);
            form.reset();
            cargarVacasPropietario();
        } catch (err) {
            mostrarMensaje('vaca-mensaje', err.message);
        }
    });

    document.getElementById('lista-vacas').addEventListener('click', (e) => {
    const target = e.target;
    const vacaCard = target.closest('.vaca-card');
    if (!vacaCard) return;

    const vacaId = vacaCard.dataset.vacaId;
    const vacaNombre = vacaCard.dataset.vacaNombre;

    // Decide qué hacer basado en dónde se hizo clic
    if (target.closest('[data-action="delete-vaca"]')) {
        // 1. Prepara el modal con la información de la vaca
        nombreVacaEliminar.textContent = vacaNombre;
        btnConfirmarEliminar.dataset.vacaId = vacaId; // Guarda el ID en el botón para usarlo después

        // 2. Muestra el modal
        modalConfirmacion.classList.remove('hidden');

    } else if (target.closest('[data-action="view-history"]')) {
        app.verHistorial(vacaId, vacaNombre);
    }
});

    document.getElementById('vaca-buscar').addEventListener('input', (e) => {
        const searchTerm = normalize(e.target.value);
        if (searchTerm.length < 2 && searchTerm.length !== 0) {
            renderVacasPropietario(allVacasPropietario);
            return;
        }
        const filteredVacas = allVacasPropietario.filter(vaca =>
            normalize(vaca.nombre).includes(searchTerm) ||
            normalize(vaca.numero_arete).includes(searchTerm)
        );
        renderVacasPropietario(filteredVacas);
    });

    document.getElementById('btn-ver-estadisticas').addEventListener('click', mostrarEstadisticas);
    
    document.getElementById('form-actualizar-logo').addEventListener('submit', async (e) => {
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
            if (!res.ok) throw new Error((await res.json()).message);
            const updatedRancho = await res.json();
            currentUser.ranchos[0].logo_url = updatedRancho.logo_url;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            const logoImg = document.getElementById('logo-rancho');
            logoImg.src = updatedRancho.logo_url;
            logoImg.classList.remove('hidden');
            mostrarMensaje('update-logo-mensaje', '¡Logo actualizado con éxito!', false);
            form.reset();
        } catch (err) {
            mostrarMensaje('update-logo-mensaje', err.message);
        }
    });

    // --- Panel de MVZ ---
    document.getElementById('btn-modo-rancho').addEventListener('click', () => {
        document.getElementById('mvz-seleccion-modo').style.display = 'none';
        document.getElementById('mvz-acceso-rancho').classList.remove('hidden');
    });

    document.getElementById('btn-modo-independiente').addEventListener('click', () => {
        document.getElementById('mvz-seleccion-modo').style.display = 'none';
        document.getElementById('mvz-herramientas').classList.remove('hidden');
        document.getElementById('panel-rancho-independiente').classList.remove('hidden');
        document.getElementById('modo-trabajo-activo').textContent = 'Independiente';
        document.getElementById('logo-rancho-mvz-panel').classList.add('hidden');
        currentRancho = null;
        loteActual = [];
        renderLoteActual();
        btnAbrirModalVacaMvz.classList.add('hidden');
        cargarVacasParaMVZ();
    });

    const volverSeleccion = () => {
        document.getElementById('mvz-seleccion-modo').style.display = 'flex';
        document.getElementById('mvz-acceso-rancho').classList.add('hidden');
        document.getElementById('mvz-herramientas').classList.add('hidden');
        currentRancho = null; independentRanchoName = null; loteActual = [];
        sessionStorage.removeItem('currentRancho');
    };
    document.getElementById('btn-volver-seleccion1').addEventListener('click', volverSeleccion);
    document.getElementById('btn-volver-seleccion2').addEventListener('click', volverSeleccion);

    document.getElementById('form-acceso-rancho').addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigo = document.getElementById('codigo-rancho').value;
        try {
            const res = await fetch(`${API_URL}/rancho/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) });
            if (!res.ok) throw new Error('Código no válido.');
            currentRancho = await res.json();
            sessionStorage.setItem('currentRancho', JSON.stringify(currentRancho));
            document.getElementById('mvz-acceso-rancho').classList.add('hidden');
            document.getElementById('mvz-herramientas').classList.remove('hidden');
            document.getElementById('panel-rancho-independiente').classList.add('hidden');
            document.getElementById('modo-trabajo-activo').textContent = `En Rancho: ${currentRancho.nombre}`;
            btnAbrirModalVacaMvz.classList.remove('hidden');
            cargarVacasParaMVZ();

            const logoImgMvz = document.getElementById('logo-rancho-mvz-panel');
            if (currentRancho && currentRancho.logo_url) {
                logoImgMvz.src = currentRancho.logo_url;
                logoImgMvz.classList.remove('hidden');
            } else {
                logoImgMvz.classList.add('hidden');
            }
        } catch (err) {
            mostrarMensaje('rancho-mensaje', err.message);
        }
    });

    document.getElementById('btn-fijar-rancho').addEventListener('click', () => {
        const nombre = document.getElementById('nombre-rancho-independiente').value;
        if (!nombre.trim()) return;
        independentRanchoName = nombre.trim();
        document.getElementById('nombre-rancho-fijado').textContent = independentRanchoName;
        document.getElementById('form-fijar-rancho').classList.add('hidden');
        document.getElementById('rancho-fijado-info').classList.remove('hidden');
    });
    
    document.getElementById('btn-cambiar-rancho-fijado').addEventListener('click', () => {
        independentRanchoName = null;
        document.getElementById('nombre-rancho-independiente').value = '';
        document.getElementById('form-fijar-rancho').classList.remove('hidden');
        document.getElementById('rancho-fijado-info').classList.add('hidden');
    });
    
    if (actividadTipoSelect) {
        const camposDinamicosContainer = document.getElementById('campos-dinamicos-actividad');
        actividadTipoSelect.addEventListener('change', (e) => {
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
    
        camposDinamicosContainer.addEventListener('change', (e) => {
            if (e.target.dataset.revelaId) {
                const elARevelar = document.getElementById(`cont-${e.target.dataset.revelaId}`);
                if (!elARevelar) return;
                const debeRevelar = e.target.value === 'Sí' || (e.target.id === 'tecnica' && e.target.value === 'IA Convencional');
                elARevelar.classList.toggle('hidden', !debeRevelar);
            }
        });
    }
    
    document.getElementById('form-agregar-actividad').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentRancho && !independentRanchoName) {
            return mostrarMensaje('actividad-mensaje', "En modo independiente, primero fija un rancho.");
        }
        const areteVaca = document.getElementById('actividad-arete').value.trim();
        const raza = document.getElementById('actividad-raza')?.value?.trim() || '';
        const tipoKey = actividadTipoSelect.value;
        const loteNumero = document.getElementById('actividad-lote').value;
        if (!areteVaca || !tipoKey || !loteNumero) return mostrarMensaje('actividad-mensaje', 'Completa arete, tipo y lote.');
        if (loteActual.length > 0 && (loteActual[0].tipoKey !== tipoKey || loteActual[0].loteNumero !== loteNumero)) {
            return mostrarMensaje('actividad-mensaje', `Este lote es de "${loteActual[0].tipoLabel}" (Lote ${loteActual[0].loteNumero}). Termínalo para cambiar.`);
        }
        const detalles = {};
        PROCEDIMIENTOS[tipoKey].campos.forEach(campo => {
            const el = document.getElementById(campo.id);
            if (!el) return;
            const cont = el.closest('div[id^="cont-"]');
            if (cont && cont.classList.contains('hidden')) return;
            const valor = (el.type === 'checkbox') ? (el.checked ? 'Sí' : 'No') : el.value;
            if (valor && valor !== '') {
                detalles[campo.id] = valor;
            }
        });
        loteActual.push({ loteNumero, areteVaca, tipoKey, tipoLabel: PROCEDIMIENTOS[tipoKey].titulo, raza, fecha: new Date().toISOString().split('T')[0], detalles });
        actividadTipoSelect.disabled = true;
        document.getElementById('actividad-lote').disabled = true;
        renderLoteActual();
        mostrarMensaje('actividad-mensaje', `Vaca ${areteVaca} agregada al lote ${loteNumero}.`, false);
        document.getElementById('actividad-arete').value = '';
        document.getElementById('actividad-raza').value = '';
        document.getElementById('actividad-arete').focus();
    });
    
    document.getElementById('btn-finalizar-lote').addEventListener('click', async () => {
        if (loteActual.length === 0) return;
        try {
            const payload = {
                mvzId: currentUser.id,
                ranchoId: currentRancho ? currentRancho.id : null,
                nombreRanchoIndependiente: currentRancho ? null : independentRanchoName,
                lote: loteActual,
            };
            const res = await fetch(`${API_URL}/lote/pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error((await res.json()).message || 'Error al generar PDF.');
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

    btnAbrirModalVacaMvz.addEventListener('click', () => modalVacaMvz.classList.remove('hidden'));
    btnCerrarModalVacaMvz.addEventListener('click', () => modalVacaMvz.classList.add('hidden'));
    modalBgVacaMvz.addEventListener('click', () => modalVacaMvz.classList.add('hidden'));

    document.getElementById('form-agregar-vaca-mvz').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentRancho) {
            return mostrarMensaje('vaca-mensaje-mvz', 'Error: No se ha seleccionado un rancho.');
        }
        try {
            const form = e.target;
            const formData = new FormData(form);
            const dia = formData.get('dia');
            const mes = formData.get('mes');
            const ano = formData.get('ano');
            if (!dia || !mes || !ano) {
                mostrarMensaje('vaca-mensaje-mvz', 'Selecciona una fecha de nacimiento completa.');
                return;
            }
            const fechaCompleta = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            formData.append('fechaNacimiento', fechaCompleta);
            formData.append('ranchoId', currentRancho.id);
            formData.append('propietarioId', currentRancho.propietario_id);
            const res = await fetch(`${API_URL}/vacas`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Error al agregar vaca.');
            mostrarMensaje('vaca-mensaje-mvz', 'Vaca agregada con éxito.', false);
            form.reset();
            setTimeout(() => modalVacaMvz.classList.add('hidden'), 1500);
            cargarVacasParaMVZ();
        } catch (err) {
            mostrarMensaje('vaca-mensaje-mvz', err.message);
        }
    });

    const areteInput = document.getElementById('actividad-arete');
    if (areteInput) {
        const razaMvzInput = document.getElementById('actividad-raza');
        const tryAutofillRaza = () => {
            if (!currentRancho) return;
            const key = String(areteInput.value || '').trim();
            const info = vacasIndex.get(key);
            if (info && info.raza) {
                razaMvzInput.value = info.raza;
            }
        };
        areteInput.addEventListener('input', tryAutofillRaza);
        areteInput.addEventListener('change', tryAutofillRaza);
    }
    
    // --- Modales (General) ---
    document.getElementById('modal-bg').addEventListener('click', () => document.getElementById('modal-historial').classList.add('hidden'));
    document.getElementById('btn-cerrar-modal').addEventListener('click', () => document.getElementById('modal-historial').classList.add('hidden'));
// --- Lógica para el modal de confirmación de eliminación ---

// Evento para el botón de cancelar en el modal
btnCancelarEliminar.addEventListener('click', () => {
    modalConfirmacion.classList.add('hidden');
});

// Evento para el botón que confirma la eliminación
btnConfirmarEliminar.addEventListener('click', async () => {
    const vacaId = btnConfirmarEliminar.dataset.vacaId;
    if (!vacaId) return;

    try {
        const res = await fetch(`${API_URL}/vacas/${vacaId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('No se pudo eliminar la vaca.');
        
        // Oculta el modal y recarga la lista de vacas
        modalConfirmacion.classList.add('hidden');
        cargarVacasPropietario();

    } catch (err) {
        console.error("Error al eliminar vaca:", err);
        alert(err.message); // Muestra un error si algo falla
        modalConfirmacion.classList.add('hidden');
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
    document.getElementById('login-email').value = savedEmail;
    document.getElementById('remember-me').checked = true;
}

    // --- Restauración de Sesión ---
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        const savedRancho = sessionStorage.getItem('currentRancho');
        if (savedRancho) {
            currentRancho = JSON.parse(savedRancho);
        }
        iniciarSesion();
        
        if (currentUser?.rol === 'mvz' && currentRancho) {
            document.getElementById('mvz-seleccion-modo').style.display = 'none';
            document.getElementById('mvz-herramientas').classList.remove('hidden');
            document.getElementById('modo-trabajo-activo').textContent = `En Rancho: ${currentRancho.nombre}`;
            btnAbrirModalVacaMvz.classList.remove('hidden');
            cargarVacasParaMVZ();
            
            const logoImgMvz = document.getElementById('logo-rancho-mvz-panel');
            if (currentRancho.logo_url) {
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

// Referencias a los elementos de la vista de estadísticas
const btnEstadisticasVolver = document.getElementById('btn-estadisticas-volver');
const statsTabsContainer = document.getElementById('estadisticas-tabs-lotes');
const statsContenido = document.getElementById('estadisticas-contenido');
const statsTituloLote = document.getElementById('estadisticas-titulo-lote');
const statsResumenTexto = document.getElementById('estadisticas-resumen-texto');
const ctx = document.getElementById('grafico-estado-reproductivo').getContext('2d');

let miGrafico = null; // Variable para guardar la instancia del gráfico
let datosEstadisticas = null; // Variable para guardar los datos que vienen del API

// Función para renderizar el gráfico y los datos de un lote específico
function renderizarGrafico(numeroLote) {
    if (!datosEstadisticas || !datosEstadisticas[numeroLote]) return;

    const loteData = datosEstadisticas[numeroLote];
    
    // Actualizar el título y el resumen en texto
    statsTituloLote.textContent = `Lote ${numeroLote}`;
    let resumenHtml = `
        <p><strong>Total de Vacas:</strong> ${loteData.totalVacas}</p>
        <p><strong>Gestantes:</strong> ${loteData.estados.Gestante} vacas</p>
        <p><strong>Estáticas:</strong> ${loteData.estados.Estatica} vacas</p>
        <p><strong>Ciclando:</strong> ${loteData.estados.Ciclando} vacas</p>
    `;
    const razasOrdenadas = Object.entries(loteData.razas).sort(([,a],[,b]) => b-a);
    if(razasOrdenadas.length > 0) {
        resumenHtml += `<p><strong>Raza Principal:</strong> ${razasOrdenadas[0][0]}</p>`;
    }
    statsResumenTexto.innerHTML = resumenHtml;

    // Destruir el gráfico anterior si existe (para poder dibujar uno nuevo)
    if (miGrafico) {
        miGrafico.destroy();
    }

    // Preparar datos para Chart.js
    const labels = ['Gestantes', 'Estáticas', 'Ciclando', 'Sucias'];
    const data = [
        loteData.estados.Gestante,
        loteData.estados.Estatica,
        loteData.estados.Ciclando,
        loteData.estados.Sucia
    ];

    miGrafico = new Chart(ctx, {
        type: 'doughnut', // Gráfico de dona (pastel con hoyo)
        data: {
            labels: labels,
            datasets: [{
                label: 'Estado Reproductivo',
                data: data,
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

// Función principal para mostrar la vista de estadísticas
async function mostrarEstadisticas() {
    cambiarVista('estadisticas');
    statsContenido.style.visibility = 'hidden';
    statsTabsContainer.innerHTML = '<p class="text-gray-400 p-4">Cargando estadísticas...</p>';

    try {
        const ranchoId = currentUser.ranchos[0].id;
        const res = await fetch(`/api/rancho/${ranchoId}/estadisticas`);
        if (!res.ok) throw new Error('No se pudieron cargar las estadísticas.');
        
        datosEstadisticas = await res.json();
        const lotes = Object.keys(datosEstadisticas);

        if (lotes.length === 0) {
            statsTabsContainer.innerHTML = '<p class="text-gray-400 p-4">No hay datos suficientes para mostrar estadísticas.</p>';
            return;
        }

        // Crear las pestañas de los lotes
        statsTabsContainer.innerHTML = lotes.map(lote => 
            `<button class="tab-lote p-4 text-gray-400 border-b-2 border-transparent hover:text-white" data-lote="${lote}">${lote === 'Sin Lote' ? 'Sin Asignar' : `Lote ${lote}`}</button>`
        ).join('');

        // Agregar el listener a las pestañas para que sean interactivas
        statsTabsContainer.querySelectorAll('.tab-lote').forEach(tab => {
            tab.addEventListener('click', () => {
                statsTabsContainer.querySelectorAll('.tab-lote').forEach(t => t.classList.remove('active-tab'));
                tab.classList.add('active-tab');
                renderizarGrafico(tab.dataset.lote);
            });
        });

        // Por defecto, hacer clic en la primera pestaña para mostrar sus datos
        statsTabsContainer.querySelector('.tab-lote').click();
        statsContenido.style.visibility = 'visible';

    } catch (err) {
        console.error(err);
        statsTabsContainer.innerHTML = `<p class="text-red-400 p-4">${err.message}</p>`;
    }
}

// Listener para el botón de volver en la vista de estadísticas
btnEstadisticasVolver.addEventListener('click', () => {
    cambiarVista('propietario');
});
});