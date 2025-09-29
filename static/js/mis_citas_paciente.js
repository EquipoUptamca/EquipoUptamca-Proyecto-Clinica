document.addEventListener('DOMContentLoaded', function() {

    let allAppointments = [];

    // --- SELECTORES ---
    const tableBody = document.getElementById('appointments-table-body');
    const loadingIndicator = document.getElementById('loading-indicator');
    const noResultsDiv = document.getElementById('no-results');
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    const statusFilter = document.getElementById('statusFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    // --- CARGA DE DATOS ---
    function loadInitialData() {
        loadUserData();
        fetchAppointments();
    }

    function loadUserData() {
        fetch('/api/user-data')
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar datos'))
            .then(data => {
                document.getElementById('username').textContent = data.nombre || 'Paciente';
                document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre)}&background=1E8449&color=fff`;
            })
            .catch(console.error);
    }

    function fetchAppointments() {
        loadingIndicator.classList.remove('d-none');
        tableBody.innerHTML = '';
        noResultsDiv.classList.add('d-none');

        fetch('/api/citas/detalladas')
            .then(response => {
                if (!response.ok) throw new Error('No se pudo cargar el historial de citas.');
                return response.json();
            })
            .then(data => {
                allAppointments = data;
                renderTable(allAppointments);
            })
            .catch(error => {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
            })
            .finally(() => {
                loadingIndicator.classList.add('d-none');
            });
    }

    // --- RENDERIZADO Y FILTROS ---
    function renderTable(appointments) {
        tableBody.innerHTML = '';
        if (appointments.length === 0) {
            noResultsDiv.classList.remove('d-none');
            return;
        }
        noResultsDiv.classList.add('d-none');

        appointments.forEach(appt => {
            const row = document.createElement('tr');
            const formattedDate = new Date(appt.fecha_cita + 'T00:00:00').toLocaleDateString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });

            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${appt.hora_cita}</td>
                <td>${appt.medico_nombre}</td>
                <td>${appt.especialidad}</td>
                <td>${appt.motivo_consulta}</td>
                <td><span class="badge bg-${getStatusBadgeColor(appt.estado)}">${getStatusText(appt.estado)}</span></td>
            `;
            tableBody.appendChild(row);
        });
    }

    function applyFilters() {
        let filteredAppointments = [...allAppointments];

        const dateFrom = dateFromInput.value;
        const dateTo = dateToInput.value;
        const status = statusFilter.value;

        if (dateFrom) {
            filteredAppointments = filteredAppointments.filter(a => a.fecha_cita >= dateFrom);
        }
        if (dateTo) {
            filteredAppointments = filteredAppointments.filter(a => a.fecha_cita <= dateTo);
        }
        if (status) {
            filteredAppointments = filteredAppointments.filter(a => a.estado === status);
        }

        renderTable(filteredAppointments);
    }

    // --- EVENT LISTENERS ---
    dateFromInput.addEventListener('change', applyFilters);
    dateToInput.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);

    clearFiltersBtn.addEventListener('click', () => {
        dateFromInput.value = '';
        dateToInput.value = '';
        statusFilter.value = '';
        renderTable(allAppointments);
    });

    // --- FUNCIONES DE UTILIDAD ---
    function getStatusBadgeColor(status) {
        const colors = {
            'confirmada': 'primary',
            'completada': 'success',
            'programada': 'warning',
            'cancelada': 'danger',
            'pendiente': 'secondary'
        };
        return colors[status] || 'dark';
    }

    function getStatusText(status) {
        if (!status) return 'Desconocido';
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    // --- INICIALIZACIÓN ---
    loadInitialData();
});