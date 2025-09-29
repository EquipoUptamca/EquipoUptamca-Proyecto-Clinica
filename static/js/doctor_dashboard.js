document.addEventListener('DOMContentLoaded', function() {

    const viewCitaModal = new bootstrap.Modal(document.getElementById('viewCitaModal'));

    // --- Inicialización ---
    function initialize() {
        loadUserData();
        loadStats();
        loadUpcomingAppointments();
        loadMyWeeklySchedule();
        setupEventListeners();
        updateDateTime();
        setInterval(updateDateTime, 1000); // Actualizar cada segundo
    }

    // --- Carga de Datos ---
    function loadUserData() {
        fetch('/api/user-data')
            .then(response => response.json())
            .then(data => {
                document.getElementById('username').textContent = data.nombre || 'Doctor';
                document.getElementById('userrole').textContent = data.rol || 'Médico';
            })
            .catch(error => console.error('Error al cargar datos del usuario:', error));
    }

    function loadStats() {
        fetch('/api/doctor/stats')
            .then(response => response.json())
            .then(stats => {
                document.getElementById('today-appointments').textContent = stats.today_appointments || 0;
                document.getElementById('pending-appointments').textContent = stats.pending_appointments || 0;
                document.getElementById('weekly-completed').textContent = stats.weekly_completed || 0;
            })
            .catch(error => console.error('Error al cargar estadísticas del médico:', error));
    }

    function loadUpcomingAppointments() {
        const tableBody = document.getElementById('upcoming-appointments-table');
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-success" role="status"></div></td></tr>`;

        fetch('/api/upcoming-appointments')
            .then(response => response.json())
            .then(appointments => {
                tableBody.innerHTML = ''; 
                if (appointments.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="4" class="text-center text-muted py-5">
                                <i class="fas fa-calendar-times fa-3x mb-3"></i>
                                <p class="mb-0">No tiene citas próximas.</p>
                            </td>
                        </tr>
                    `;
                    return;
                }

                appointments.forEach(appt => {
                    const row = document.createElement('tr');

                    const formattedDate = new Date(appt.date + 'T' + appt.time).toLocaleString('es-ES', {
                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });

                    let actionsHtml = `<button class="btn btn-sm btn-outline-info view-btn" data-id="${appt.id}" title="Ver Detalles"><i class="fas fa-eye"></i></button>`;

                    if (appt.status === 'pendiente') {
                        actionsHtml += ` <button class="btn btn-sm btn-outline-success confirm-btn" data-id="${appt.id}" title="Confirmar Cita"><i class="fas fa-check"></i></button>`;
                    }

                    row.innerHTML = `
                        <td>${formattedDate}</td>
                        <td>${appt.patient_name || 'N/A'}</td>
                        <td>${appt.reason || 'No especificado'}</td>
                        <td><span class="badge bg-${getStatusBadgeColor(appt.status)}">${getStatusText(appt.status)}</span></td>
                        <td>${actionsHtml}</td>
                    `;
                    tableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error al cargar próximas citas:', error);
                tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Error al cargar las citas.</td></tr>`;
            });
    }

    function loadMyWeeklySchedule() {
        const container = document.getElementById('my-weekly-schedule-container');
        container.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-success" role="status"></div></div>`;

        fetch('/api/doctor/my-schedule')
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => Promise.reject(err));
                }
                return response.json();
            })
            .then(scheduleData => {
                container.innerHTML = ''; // Clear spinner
                const grid = document.createElement('div');
                grid.className = 'weekly-schedule-grid';

                const daysOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                
                const hasSchedules = Object.values(scheduleData).some(daySchedules => daySchedules.length > 0);

                if (!hasSchedules) {
                    container.innerHTML = `
                        <div class="text-center text-muted py-5">
                            <i class="fas fa-calendar-times fa-3x mb-3"></i>
                            <p class="mb-0">No tiene un horario semanal configurado.</p>
                            <a href="/horarios" class="btn btn-sm btn-outline-success mt-3">Configurar mi horario</a>
                        </div>
                    `;
                    return;
                }

                daysOrder.forEach(dayName => {
                    const schedules = scheduleData[dayName] || [];
                    
                    const dayColumn = document.createElement('div');
                    dayColumn.className = 'day-column';

                    const dayHeader = document.createElement('div');
                    dayHeader.className = 'day-header';
                    dayHeader.textContent = dayName;
                    dayColumn.appendChild(dayHeader);

                    if (schedules.length > 0) {
                        schedules.forEach(schedule => {
                            const scheduleBlock = document.createElement('div');
                            scheduleBlock.className = 'schedule-block';
                            scheduleBlock.innerHTML = `<i class="fas fa-clock me-2"></i>${schedule.hora_inicio.substring(0, 5)} - ${schedule.hora_fin.substring(0, 5)}`;
                            dayColumn.appendChild(scheduleBlock);
                        });
                    } else {
                        const noScheduleBlock = document.createElement('div');
                        noScheduleBlock.className = 'text-muted small text-center pt-3';
                        noScheduleBlock.textContent = 'Libre';
                        dayColumn.appendChild(noScheduleBlock);
                    }
                    grid.appendChild(dayColumn);
                });
                container.appendChild(grid);
            })
            .catch(error => {
                console.error('Error al cargar el horario semanal:', error);
                container.innerHTML = `<div class="alert alert-danger">${error.error || 'Error al cargar el horario semanal.'}</div>`;
            });
    }

    // --- Funciones de Utilidad y Eventos ---
    function setupEventListeners() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('collapsed');
                document.getElementById('mainContent').classList.toggle('collapsed');
            });
        }

        // Event listener for clicking on appointment rows
        const tableBody = document.getElementById('upcoming-appointments-table');
        if (tableBody) {
            tableBody.addEventListener('click', function(event) {
                const target = event.target.closest('button');
                if (!target) return;

                const citaId = target.dataset.id;

                if (target.classList.contains('view-btn')) {
                    openViewModal(citaId);
                } else if (target.classList.contains('confirm-btn')) {
                    confirmAppointment(citaId);
                }
            });
        }
    }

    function updateDateTime() {
        const now = new Date();
        const formattedDateTime = now.toLocaleString('es-ES', {
            dateStyle: 'full',
            timeStyle: 'medium'
        });
        const dateTimeElement = document.getElementById('currentDateTime');
        if (dateTimeElement) {
            dateTimeElement.textContent = formattedDateTime;
        }
    }

    function getStatusBadgeColor(status) {
        switch (status) {
            case 'confirmada': return 'primary';
            case 'completada': return 'success';
            case 'pendiente': return 'warning';
            case 'cancelada': return 'danger';
            default: return 'secondary';
        }
    }

    function getStatusText(status) {
        if (!status) return 'Desconocido';
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    function openViewModal(citaId) {
        const modalContent = document.getElementById('viewCitaContent');
        modalContent.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-info" role="status"></div></div>';
        viewCitaModal.show();

        fetch(`/api/citas/${citaId}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => Promise.reject(err.error || 'Error al cargar los detalles de la cita.'));
                }
                return response.json();
            })
            .then(data => {
                const fechaHora = `${new Date(data.fecha_cita + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} a las ${data.hora_cita}`;
                
                const statusBadge = `<span class="badge bg-${getStatusBadgeColor(data.estado)}">${getStatusText(data.estado)}</span>`;

                const detailsHtml = `
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong><i class="fas fa-user-injured me-2"></i>Paciente:</strong><br>${data.paciente_nombre}</p>
                            <p><strong><i class="fas fa-calendar-alt me-2"></i>Fecha y Hora:</strong><br>${fechaHora}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong><i class="fas fa-info-circle me-2"></i>Estado:</strong><br>${statusBadge}</p>
                            <p><strong><i class="fas fa-comment-medical me-2"></i>Motivo de la Consulta:</strong></p>
                            <p class="bg-light p-2 rounded" style="white-space: pre-wrap;">${data.motivo_consulta || 'No especificado'}</p>
                        </div>
                    </div>
                `;
                modalContent.innerHTML = detailsHtml;
            })
            .catch(error => {
                console.error('Error al abrir el modal de detalles:', error);
                modalContent.innerHTML = `<div class="alert alert-danger">${error}</div>`;
            });    }

    function confirmAppointment(citaId) {
        if (!confirm('¿Está seguro de que desea confirmar esta cita?')) {
            return;
        }

        const button = document.querySelector(`.confirm-btn[data-id='${citaId}']`);
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

        fetch(`/api/citas/${citaId}/confirm`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => Promise.reject(err));
            }
            return response.json();
        })
        .then(data => {
            loadUpcomingAppointments(); 
            loadStats();
        })
        .catch(error => {
            console.error('Error al confirmar la cita:', error);
            alert(`Error: ${error.error || 'No se pudo confirmar la cita.'}`);
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-check"></i>';
        });
    }

    // --- Iniciar la aplicación ---
    initialize();
});