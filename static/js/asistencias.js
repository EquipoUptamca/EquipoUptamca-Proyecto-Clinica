document.addEventListener('DOMContentLoaded', function () {
    const tablaBody = document.getElementById('tabla-asistencias-body');
    const filtroMedico = document.getElementById('filtro-medico');
    const filtroFechaInicio = document.getElementById('filtro-fecha-inicio'); // Corregido
    const filtroFechaFin = document.getElementById('filtro-fecha-fin'); // Corregido
    const btnFiltrar = document.getElementById('btn-filtrar');

    // Modal de Salida
    const salidaModal = new bootstrap.Modal(document.getElementById('salidaModal'));
    const btnConfirmarSalida = document.getElementById('btn-confirmar-salida');

    // Inicializar Select2 para el filtro de médicos
    $('#filtro-medico').select2({
        theme: 'bootstrap-5',
        placeholder: 'Buscar un médico...',
        allowClear: true,
        ajax: {
            url: '/api/medicos/disponibles',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return {
                    term: params.term // término de búsqueda
                };
            },
            processResults: function (data) {
                const medicos = data.map(medico => ({
                    id: medico.id_medico,
                    text: `${medico.nombre_completo} (ID: ${medico.id_medico})`
                }));
                return {
                    results: [{ id: '', text: 'Todos los médicos' }, ...medicos]
                };
            },
            cache: true
        }
    });

    // Función para cargar las asistencias
    async function cargarAsistencias() {
        tablaBody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div></td></tr>`;

        const idMedico = filtroMedico.value;
        const fechaInicio = filtroFechaInicio.value;
        const fechaFin = filtroFechaFin.value;

        let url = '/api/asistencia?';
        const params = new URLSearchParams();

        if (idMedico) params.append('id_medico', idMedico);
        if (fechaInicio) params.append('fecha_inicio', fechaInicio);
        if (fechaFin) params.append('fecha_fin', fechaFin);

        try {
            const response = await fetch(url + params.toString());
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            const asistencias = await response.json();
            renderizarTabla(asistencias);
        } catch (error) {
            console.error('Error al cargar asistencias:', error);
            tablaBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error al cargar los datos. Intente de nuevo.</td></tr>`;
        }
    }

    // Función para renderizar la tabla
    function renderizarTabla(asistencias) {
        if (asistencias.length === 0) {
            tablaBody.innerHTML = `<tr><td colspan="7" class="text-center">No se encontraron registros de asistencia.</td></tr>`;
            return;
        }

        tablaBody.innerHTML = '';
        asistencias.forEach(asistencia => {
            const estadoBadge = getEstadoBadge(asistencia.estado_asistencia);
            const horaSalidaContent = asistencia.hora_salida
                ? asistencia.hora_salida
                : `<button class="btn btn-sm btn-outline-success btn-marcar-salida" 
                           data-id="${asistencia.id_asistencia}" 
                           data-nombre="${asistencia.nombre_medico}">
                       <i class="fas fa-clock me-1"></i> Marcar Salida
                   </button>`;

            const fila = `
                <tr>
                    <td>${asistencia.id_asistencia}</td>
                    <td>${asistencia.nombre_medico}</td>
                    <td>${dayjs(asistencia.fecha).format('DD/MM/YYYY')}</td>
                    <td>${asistencia.hora_entrada || 'N/A'}</td>
                    <td>${horaSalidaContent}</td>
                    <td><span class="badge ${estadoBadge.clase}">${estadoBadge.texto}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger btn-eliminar" title="Eliminar" data-id="${asistencia.id_asistencia}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
            tablaBody.innerHTML += fila;
        });

        // Añadir event listeners a los nuevos botones
        document.querySelectorAll('.btn-eliminar').forEach(btn => btn.addEventListener('click', handleEliminar));
        document.querySelectorAll('.btn-marcar-salida').forEach(btn => btn.addEventListener('click', handleMarcarSalida));
    }

    function getEstadoBadge(estado) {
        switch (estado.toLowerCase()) {
            case 'presente': return { texto: 'Presente', clase: 'bg-success' };
            case 'ausente': return { texto: 'Ausente', clase: 'bg-danger' };
            case 'justificado': return { texto: 'Justificado', clase: 'bg-warning text-dark' };
            default: return { texto: estado, clase: 'bg-secondary' };
        }
    }

    // --- MANEJO DE ACCIONES ---

    function handleEliminar(event) {
        const id = event.currentTarget.dataset.id;
        if (confirm('¿Estás seguro de que deseas eliminar este registro de asistencia? Esta acción no se puede deshacer.')) {
            eliminarAsistencia(id);
        }
    }

    async function eliminarAsistencia(id) {
        try {
            const response = await fetch(`/api/asistencia/${id}`, { method: 'DELETE' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en el servidor');
            }

            showToast(data.message || 'Registro eliminado con éxito.', 'success');
            cargarAsistencias(); // Recargar la tabla
        } catch (error) {
            console.error('Error al eliminar asistencia:', error);
            showToast(`Error al eliminar: ${error.message}`, 'danger');
        }
    }

    function handleMarcarSalida(event) {
        const id = event.currentTarget.dataset.id;
        const nombre = event.currentTarget.dataset.nombre;

        document.getElementById('id-asistencia-salida').value = id;
        document.getElementById('medico-salida-nombre').textContent = nombre;
        
        // Poner la hora actual por defecto
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('hora-salida-input').value = `${hours}:${minutes}`;

        salidaModal.show();
    }

    async function registrarSalida() {
        const id = document.getElementById('id-asistencia-salida').value;
        const horaSalida = document.getElementById('hora-salida-input').value;

        if (!horaSalida) {
            showToast('Por favor, especifique una hora de salida.', 'warning');
            return;
        }

        try {
            const response = await fetch(`/api/asistencia/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hora_salida: horaSalida })
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Error en el servidor');

            showToast(data.message || 'Hora de salida registrada.', 'success');
            salidaModal.hide();
            cargarAsistencias();
        } catch (error) {
            console.error('Error al registrar salida:', error);
            showToast(`Error al registrar: ${error.message}`, 'danger');
        }
    }

    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toastHTML = `<div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true"><div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div></div>`;
        toastContainer.innerHTML += toastHTML;
        const newToast = toastContainer.lastElementChild;
        new bootstrap.Toast(newToast, { delay: 5000 }).show();
    }

    // Event Listeners
    btnFiltrar.addEventListener('click', cargarAsistencias);
    btnConfirmarSalida.addEventListener('click', registrarSalida);

    // Carga inicial
    cargarAsistencias();
});