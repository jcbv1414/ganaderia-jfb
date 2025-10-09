document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // ===== ESTADO GLOBAL Y CONFIGURACIÓN ===========================
    // =================================================================
    let currentUser = null;
    let currentRancho = null; // Rancho activo para el MVZ
    let actividadActual = []; // Almacena registros de la actividad en curso del MVZ
    
    const API_URL = '/api';
    const appContent = document.getElementById('app-content');
    const navContainer = document.getElementById('nav-container');
    
    // Definiciones de campos para los modales de actividad del MVZ
    const PROCEDIMIENTOS = {
        palpacion: {
            titulo: "Palpación / Chequeo Reproductivo",
            campos: [
                { id: "gestante", label: "Gestante", tipo: "select", opciones: ["No", "Sí"] },
                { id: "dias_gestacion", label: "Días de Gestación", tipo: "number" },
                { id: "ovario_izq", label: "Ovario Izquierdo", tipo: "text", placeholder: "Ej: CL, Foliculos" },
                { id: "ovario_der", label: "Ovario Derecho", tipo: "text", placeholder: "Ej: CL, Foliculos" },
                { id: "utero", label: "Útero", tipo: "text", placeholder: "Ej: Tono, Contenido" },
                { id: "observaciones", label: "Observaciones", tipo: "textarea" }
            ]
        },
        inseminacion: {
            titulo: "Inseminación Artificial",
            campos: [
                { id: "semental", label: "Semental Utilizado", tipo: "text", required: true },
                { id: "tipo_semen", label: "Tipo de Semen", tipo: "select", opciones: ["Convencional", "Sexado"] },
                { id: "protocolo", label: "Protocolo", tipo: "text", placeholder: "Ej: Ovsynch" },
                { id: "inseminador", label: "Inseminador", tipo: "text" },
                { id: "observaciones", label: "Observaciones", tipo: "textarea" }
            ]
        },
        transferencia: {
            titulo: "Transferencia de Embrión",
            campos: [
                { id: "donadora", label: "Donadora", tipo: "text" },
                { id: "semental_embrion", label: "Semental del Embrión", tipo: "text" },
                { id: "dias_embrion", label: "Días del Embrión", tipo: "number" },
                { id: "calidad", label: "Calidad", tipo: "select", opciones: ["1 (Excelente)", "2 (Buena)", "3 (Regular)"] },
                { id: "observaciones", label: "Observaciones", tipo: "textarea" }
            ]
        },
        sincronizacion: {
            titulo: "Sincronización",
            campos: [
                { id: "protocolo", label: "Protocolo de Sincronización", tipo: "text", placeholder: "Ej: J-Synch, Ovsynch", required: true },
                { id: "dia_protocolo", label: "Día del Protocolo", tipo: "number", placeholder: "Ej: 0, 7, 9" },
                { id: "medicamento", label: "Medicamento Aplicado", tipo: "text", placeholder: "Ej: GnRH, Prostaglandina" },
                { id: "observaciones", label: "Observaciones", tipo: "textarea" }
            ]
        },
        medicamento: {
            titulo: "Aplicación de Medicamento",
            campos: [
                { id: "medicamento", label: "Medicamento", tipo: "text", required: true },
                { id: "dosis", label: "Dosis", tipo: "text", placeholder: "Ej: 10ml" },
                { id: "via_aplicacion", label: "Vía de Aplicación", tipo: "select", opciones: ["Intramuscular", "Subcutánea", "Intravenosa", "Oral"] },
                { id: "motivo", label: "Motivo", tipo: "textarea" },
            ]
        }
    };
    const RAZAS_BOVINAS = ['Angus', 'Brahman', 'Hereford', 'Simmental', 'Brangus', 'Charolais', 'Limousin', 'Gyr', 'Pardo Suizo', 'Holstein'].sort();

    // =================================================================
    // ===== NAVEGACIÓN Y RENDERIZADO DE VISTAS ========================
    // =================================================================
    function navigateTo(viewId) {
        appContent.innerHTML = '';
        const template = document.getElementById(`template-${viewId}`);
        if (!template) {
            appContent.innerHTML = `<p class="p-8 text-center text-red-500">Error: No se encontró la plantilla para: ${viewId}</p>`;
            return;
        }
        appContent.appendChild(template.content.cloneNode(true));
        document.body.className = ''; // Reset body class

        // Lógica específica después de cargar la vista
        if (viewId === 'login') {
            document.getElementById('form-login').addEventListener('submit', handleLogin);
            document.getElementById('link-a-registro').addEventListener('click', () => navigateTo('registro'));
        } else if (viewId === 'inicio-propietario') {
            document.getElementById('dash-nombre-propietario').textContent = currentUser?.nombre.split(' ')[0] || '';
            document.getElementById('dash-fecha-actual').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
            cargarResumenDashboard();
        } else if (viewId === 'mis-vacas') {
            document.getElementById('btn-abrir-modal-vaca').addEventListener('click', () => abrirModalVaca());
            cargarMisVacas();
        } else if (viewId === 'manejo-reproductivo-mvz') {
            initManejoReproductivoListeners();
        } else if (viewId === 'historial-mvz') {
            cargarHistorialMVZ();
        }
    }

    const iniciarSesion = () => {
        if (!currentUser) return;
        navContainer.classList.remove('hidden');
        const isPropietario = currentUser.rol === 'propietario';
        document.getElementById('nav-propietario').classList.toggle('hidden', !isPropietario);
        document.getElementById('nav-mvz').classList.toggle('hidden', isPropietario);
        
        document.querySelectorAll('.nav-button.active').forEach(b => b.classList.remove('active'));
        const firstView = isPropietario ? 'inicio-propietario' : 'inicio-mvz';
        document.querySelector(`.nav-button[data-vista="${firstView}"]`)?.classList.add('active');
        navigateTo(firstView);
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
    // ===== LÓGICA DE AUTENTICACIÓN ===================================
    // =================================================================
    async function handleLogin(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = '';
        btn.classList.add('loading');
        btn.disabled = true;

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
        } finally {
            btn.textContent = originalText;
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    // =================================================================
    // ===== LÓGICA DE PROPIETARIO =====================================
    // =================================================================
    async function cargarResumenDashboard() {
        const ranchoId = currentUser?.ranchos?.[0]?.id;
        if (!ranchoId) return;
        try {
            const res = await fetch(`${API_URL}/rancho/${ranchoId}/estadisticas`);
            const stats = await res.json();
            if (!res.ok) throw new Error(stats.message || 'Error del servidor.');
            
            let totalVacas = 0, totalGestantes = 0;
            Object.values(stats).forEach(lote => {
                totalVacas += lote.totalVacas || 0;
                totalGestantes += lote.estados?.Gestante || 0;
            });
            document.getElementById('resumen-total-vacas').textContent = totalVacas;
            document.getElementById('resumen-vacas-gestantes').textContent = totalGestantes;
            document.getElementById('resumen-alertas').textContent = '0'; // Placeholder
        } catch (error) {
            console.error("Error cargando resumen:", error);
            document.getElementById('resumen-total-vacas').textContent = 'Error';
        }
    }

    async function cargarMisVacas() {
        const container = document.getElementById('lista-vacas-container');
        container.innerHTML = `<p class="text-center text-gray-500">Cargando ganado...</p>`;
        const ranchoId = currentUser?.ranchos?.[0]?.id;
        if (!ranchoId) {
            container.innerHTML = `<p class="text-center text-red-500">No se encontró un rancho asociado.</p>`;
            return;
        }
        try {
            const res = await fetch(`${API_URL}/vacas/rancho/${ranchoId}`);
            if (!res.ok) throw new Error('No se pudo cargar el ganado.');
            const vacas = await res.json();
            
            if (vacas.length === 0) {
                container.innerHTML = `<p class="text-center text-gray-500">Aún no tienes ganado registrado. ¡Agrega el primero!</p>`;
                return;
            }

            container.innerHTML = '';
            vacas.forEach(vaca => {
                const card = document.createElement('div');
                card.className = "bg-white p-4 rounded-lg shadow-md flex items-center gap-4";
                card.innerHTML = `
                    <img src="${vaca.foto_url || `https://ui-avatars.com/api/?name=${vaca.nombre}&background=a7f3d0&color=047857`}" alt="${vaca.nombre}" class="w-24 h-24 object-cover rounded-md bg-gray-200">
                    <div class="flex-grow">
                        <h3 class="text-xl font-bold">${vaca.nombre}</h3>
                        <p class="text-sm text-gray-600"><strong>Raza:</strong> ${vaca.raza || 'N/D'}</p>
                        <p class="text-sm text-gray-600"><strong>Nacimiento:</strong> ${vaca.fecha_nacimiento ? formatDate(vaca.fecha_nacimiento) : 'N/D'}</p>
                        <p class="text-sm text-gray-600"><strong>Arete:</strong> #${vaca.numero_arete || 'N/D'}</p>
                    </div>
                    <div class="flex flex-col gap-2">
                        <button data-vaca-id="${vaca.id}" class="btn-borrar-vaca bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 text-xs"><i class="fa-solid fa-trash"></i> Borrar</button>
                    </div>
                `;
                container.appendChild(card);
            });

            document.querySelectorAll('.btn-borrar-vaca').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const vacaId = e.currentTarget.dataset.vacaId;
                    if (confirm('¿Estás seguro de que quieres eliminar este animal? Esta acción no se puede deshacer.')) {
                        try {
                            const res = await fetch(`${API_URL}/vacas/${vacaId}`, { method: 'DELETE' });
                            if (!res.ok) throw new Error('Error al eliminar');
                            cargarMisVacas(); // Recargar la lista
                        } catch (error) {
                            alert('No se pudo eliminar el animal.');
                        }
                    }
                });
            });

        } catch (error) {
            container.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
        }
    }

    function abrirModalVaca(vaca = null) {
        const modal = document.getElementById('modal-vaca');
        const form = document.getElementById('form-vaca');
        form.reset();
        document.getElementById('modal-vaca-titulo').textContent = vaca ? 'Editar Animal' : 'Agregar Nuevo Animal';
        document.getElementById('edad-calculada').textContent = '--';
        if (vaca) {
            // Lógica para rellenar el form si se edita (no implementado en este paso)
        }
        modal.classList.remove('hidden');
    }

    function setupModalVaca() {
        document.getElementById('btn-cerrar-modal-vaca').addEventListener('click', () => {
            document.getElementById('modal-vaca').classList.add('hidden');
        });

        // Calculadora de edad
        const fechaNacimientoInput = document.getElementById('fecha_nacimiento');
        fechaNacimientoInput.addEventListener('change', () => {
            if (!fechaNacimientoInput.value) {
                document.getElementById('edad-calculada').textContent = '--';
                return;
            }
            const birthDate = new Date(fechaNacimientoInput.value);
            const today = new Date();
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
                years--;
                months = (months + 12) % 12;
            }
            document.getElementById('edad-calculada').textContent = `${years} años, ${months} meses`;
        });
        
        // Botones de Sexo
        document.querySelectorAll('.sexo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.sexo-btn.bg-pink-500')?.classList.replace('bg-pink-500', 'bg-gray-200');
                document.querySelector('.sexo-btn.bg-blue-500')?.classList.replace('bg-blue-500', 'bg-gray-200');
                btn.classList.replace('bg-gray-200', btn.dataset.sexo === 'Hembra' ? 'bg-pink-500' : 'bg-blue-500');
                document.getElementById('sexo-vaca').value = btn.dataset.sexo;
            });
        });

        // Autocomplete de Raza
        const razaInput = document.getElementById('raza-input');
        const razaAutocomplete = document.getElementById('raza-autocomplete');
        razaInput.addEventListener('input', () => {
            const value = razaInput.value.toLowerCase();
            razaAutocomplete.innerHTML = '';
            if (!value) {
                razaAutocomplete.classList.add('hidden');
                return;
            }
            const filtered = RAZAS_BOVINAS.filter(r => r.toLowerCase().includes(value));
            if(filtered.length > 0) {
                razaAutocomplete.classList.remove('hidden');
                filtered.forEach(r => {
                    const div = document.createElement('div');
                    div.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer';
                    div.textContent = r;
                    div.onclick = () => {
                        razaInput.value = r;
                        razaAutocomplete.classList.add('hidden');
                    };
                    razaAutocomplete.appendChild(div);
                });
            } else {
                 razaAutocomplete.classList.add('hidden');
            }
        });

        // Form Submission
        document.getElementById('form-vaca').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            formData.append('id_usuario', currentUser.id);
            formData.append('rancho_id', currentUser.ranchos[0].id);

            try {
                const res = await fetch(`${API_URL}/vacas`, { method: 'POST', body: formData });
                const respuesta = await res.json();
                if (!res.ok) throw new Error(respuesta.message);
                
                document.getElementById('modal-vaca').classList.add('hidden');
                cargarMisVacas(); // Recargar
            } catch (err) {
                alert(`Error al guardar: ${err.message}`);
            }
        });
    }

    // =================================================================
    // ===== LÓGICA DE MVZ =============================================
    // =================================================================
    function initManejoReproductivoListeners() {
        const modoSeleccion = document.getElementById('modo-seleccion-container');
        const headerFijado = document.getElementById('header-rancho-fijado');
        const accionesRapidas = document.getElementById('acciones-rapidas-mvz');

        const resetVista = () => {
            currentRancho = null;
            actividadActual = [];
            modoSeleccion.classList.remove('hidden');
            headerFijado.classList.add('hidden');
            accionesRapidas.classList.add('hidden');
            document.getElementById('codigo-rancho').value = '';
        };

        resetVista(); // Estado inicial

        document.getElementById('btn-validar-rancho').addEventListener('click', async () => {
            const codigo = document.getElementById('codigo-rancho').value.trim().toUpperCase();
            if (!codigo) { mostrarMensaje('mensaje-rancho', 'El código no puede estar vacío.'); return; }
            try {
                const res = await fetch(`${API_URL}/rancho/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) });
                const respuesta = await res.json();
                if (!res.ok) throw new Error(respuesta.message);
                currentRancho = respuesta;
                fijarRancho(currentRancho.nombre, false);
            } catch (err) {
                mostrarMensaje('mensaje-rancho', err.message);
            }
        });
        
        document.getElementById('btn-iniciar-independiente').addEventListener('click', () => {
            currentRancho = null; // No hay rancho registrado
            fijarRancho('Trabajo Independiente', true);
        });

        document.getElementById('btn-cambiar-rancho').addEventListener('click', resetVista);

        document.querySelectorAll('.btn-actividad').forEach(btn => {
            btn.addEventListener('click', () => abrirModalActividad(btn.dataset.actividad));
        });
    }

    function fijarRancho(nombre, esIndependiente) {
        document.getElementById('modo-seleccion-container').classList.add('hidden');
        document.getElementById('header-rancho-fijado').classList.remove('hidden');
        document.getElementById('acciones-rapidas-mvz').classList.remove('hidden');
        document.getElementById('nombre-rancho-fijado').textContent = nombre;
        
        const inputIndependiente = document.getElementById('rancho-independiente-input-container');
        inputIndependiente.classList.toggle('hidden', !esIndependiente);

        if (currentRancho) cargarVacasParaMVZ();
    }
    
    async function cargarVacasParaMVZ() {
        const datalist = document.getElementById('lista-aretes-autocompletar');
        datalist.innerHTML = '';
        if (!currentRancho) return;
        try {
            const res = await fetch(`${API_URL}/vacas/rancho/${currentRancho.id}`);
            const vacas = await res.json();
            vacas.forEach(v => {
                const option = document.createElement('option');
                option.value = v.numero_arete;
                datalist.appendChild(option);
            });
        } catch (err) { console.error("Error cargando vacas para MVZ:", err); }
    }

    function abrirModalActividad(tipo) {
        const modal = document.getElementById('modal-actividad');
        document.getElementById('modal-actividad-titulo').textContent = PROCEDIMIENTOS[tipo].titulo;
        document.getElementById('form-actividad-vaca').reset();
        renderizarCamposProcedimiento(tipo);
        modal.dataset.tipoActividad = tipo;
        modal.classList.remove('hidden');
    }

    function setupModalActividad() {
        document.getElementById('btn-cerrar-modal-actividad').onclick = () => {
            document.getElementById('modal-actividad').classList.add('hidden');
        };

        document.getElementById('btn-guardar-siguiente').onclick = () => {
            const form = document.getElementById('form-actividad-vaca');
            if (form.checkValidity()) {
                agregarRegistroActividad();
                form.reset();
                 renderizarCamposProcedimiento(document.getElementById('modal-actividad').dataset.tipoActividad);
                document.getElementById('actividad-arete').focus();
            } else {
                form.reportValidity();
            }
        };

        document.getElementById('btn-finalizar-actividad').onclick = async () => {
            const areteActual = document.getElementById('actividad-arete').value.trim();
            if (areteActual) { // Si hay algo en el campo, lo agrega
                agregarRegistroActividad();
            }
            if (actividadActual.length === 0) {
                alert("No has registrado ningún animal en esta sesión.");
                return;
            }
            
            let nombreRancho = currentRancho?.nombre || 'Independiente';
            if (!currentRancho) {
                const nombreInput = document.getElementById('rancho-independiente-nombre').value.trim();
                if (!nombreInput) {
                    alert("Por favor, especifica el nombre del rancho atendido.");
                    return;
                }
                nombreRancho = nombreInput;
            }

            try {
                const payload = {
                    mvzId: currentUser.id,
                    ranchoId: currentRancho?.id || null,
                    ranchoNombre: nombreRancho,
                    actividades: actividadActual,
                    tipoActividad: PROCEDIMIENTOS[document.getElementById('modal-actividad').dataset.tipoActividad].titulo
                };
                const res = await fetch(`${API_URL}/actividades`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Error al guardar en el historial.');

                alert(`Actividad finalizada. ${actividadActual.length} registros guardados en tu historial.`);
                actividadActual = [];
                document.getElementById('modal-actividad').classList.add('hidden');

            } catch(err) {
                alert(`Error: ${err.message}`);
            }
        };
    }
    
    function agregarRegistroActividad() {
        const arete = document.getElementById('actividad-arete').value.trim();
        if (!arete) return;

        const detalles = {};
        const campos = document.getElementById('campos-dinamicos-procedimiento').querySelectorAll('input, select, textarea');
        campos.forEach(campo => {
            if ((campo.type === 'checkbox' && campo.checked) || (campo.type !== 'checkbox' && campo.value)) {
                detalles[campo.name] = campo.value;
            }
        });

        actividadActual.push({ areteVaca: arete, detalles: detalles });
        mostrarMensaje('mensaje-vaca', `Animal #${arete} agregado. Total: ${actividadActual.length}`, false);
    }
    
    function renderizarCamposProcedimiento(tipo) {
        const container = document.getElementById('campos-dinamicos-procedimiento');
        container.innerHTML = '';
        const proc = PROCEDIMIENTOS[tipo];
        if (!proc) return;
        proc.campos.forEach(c => {
            let campoHTML = `<div><label for="${c.id}" class="block text-sm font-medium text-gray-700">${c.label}</label>`;
            const commonClasses = "mt-1 w-full p-2 border border-gray-300 rounded-lg bg-white";
            if (c.tipo === 'select') {
                const options = c.opciones.map(o => `<option value="${o}">${o}</option>`).join('');
                campoHTML += `<select name="${c.id}" class="${commonClasses}">${options}</select>`;
            } else if (c.tipo === 'textarea') {
                campoHTML += `<textarea name="${c.id}" rows="2" class="${commonClasses}"></textarea>`;
            } else {
                campoHTML += `<input type="${c.tipo || 'text'}" name="${c.id}" placeholder="${c.placeholder || ''}" ${c.required ? 'required' : ''} class="${commonClasses}">`;
            }
            campoHTML += `</div>`;
            container.innerHTML += campoHTML;
        });
    }

    async function cargarHistorialMVZ() {
        const container = document.getElementById('lista-historial-container');
        container.innerHTML = `<p class="text-center text-gray-500">Cargando historial...</p>`;
        try {
            const res = await fetch(`${API_URL}/mvz/${currentUser.id}/historial`);
            if (!res.ok) throw new Error('No se pudo cargar el historial.');
            const historial = await res.json();
            
            if (historial.length === 0) {
                container.innerHTML = `<p class="text-center text-gray-500">Aún no tienes actividades registradas.</p>`;
                return;
            }

            container.innerHTML = '';
            historial.forEach(h => {
                const card = document.createElement('div');
                card.className = "bg-white p-3 rounded-lg shadow-md flex items-center gap-3";
                card.innerHTML = `
                    <input type="checkbox" data-historial-id="${h.id}" class="h-6 w-6 rounded border-gray-300 text-green-600 focus:ring-green-500 historial-checkbox">
                    <div class="flex-grow">
                        <p class="font-bold text-gray-800">${h.tipo_actividad} en ${h.rancho_nombre}</p>
                        <p class="text-sm text-gray-500">${formatDate(h.fecha)} - ${h.numero_animales} animales</p>
                    </div>
                `;
                container.appendChild(card);
            });

            // Listeners para checkboxes y botón de descarga
            const checkboxes = document.querySelectorAll('.historial-checkbox');
            const btnDescargar = document.getElementById('btn-descargar-historial-pdf');
            const contador = document.getElementById('contador-seleccion-pdf');

            checkboxes.forEach(cb => {
                cb.addEventListener('change', () => {
                    const seleccionados = Array.from(checkboxes).filter(i => i.checked).map(i => i.dataset.historialId);
                    contador.textContent = seleccionados.length;
                    btnDescargar.disabled = seleccionados.length === 0;
                });
            });

            btnDescargar.addEventListener('click', async () => {
                const seleccionados = Array.from(checkboxes).filter(i => i.checked).map(i => i.dataset.historialId);
                if (seleccionados.length === 0) return;
                
                btnDescargar.disabled = true;
                btnDescargar.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Generando...`;

                try {
                    const res = await fetch(`${API_URL}/historial/pdf`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ historialIds: seleccionados })
                    });
                    if (!res.ok) throw new Error('Error al generar el PDF.');
                    
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none'; a.href = url;
                    a.download = `reporte_actividades_${new Date().toISOString().split('T')[0]}.pdf`;
                    document.body.appendChild(a); a.click();
                    window.URL.revokeObjectURL(url);

                } catch (err) {
                    alert(err.message);
                } finally {
                     btnDescargar.disabled = false;
                     btnDescargar.innerHTML = `<i class="fa-solid fa-download mr-2"></i> Descargar PDF (${contador.textContent})`;
                }
            });

        } catch (error) {
            container.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
        }
    }

    // =================================================================
    // ===== HELPERS E INICIALIZACIÓN ==================================
    // =================================================================
    const mostrarMensaje = (elId, texto, esError = true) => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.textContent = texto;
        el.className = `text-center text-sm h-4 ${esError ? 'text-red-400' : 'text-green-400'}`;
        setTimeout(() => { if (el) el.textContent = ''; }, 4000);
    };

    function initApp() {
        setupNavigation();
        setupModalVaca();
        setupModalActividad();
        
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