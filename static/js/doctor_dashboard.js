document.addEventListener('DOMContentLoaded', function() {

    const viewCitaModal = new bootstrap.Modal(document.getElementById('viewCitaModal'));

    // --- Inicialización ---
    function initialize() {
        initializeAsistencia(); // Inicializar lógica de asistencia
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
                const weeklySchedule = scheduleData.schedule;

                container.innerHTML = ''; // Clear spinner
                const grid = document.createElement('div');
                grid.className = 'weekly-schedule-grid';

                const daysOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                
                const hasSchedules = weeklySchedule && Object.values(weeklySchedule).some(daySchedules => daySchedules.length > 0);

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
                    const schedules = weeklySchedule[dayName] || [];
                    
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

    /**
     * Muestra un modal de confirmación genérico y ejecuta una acción.
     * @param {string} title - Título del modal.
     * @param {string} body - Mensaje del modal.
     * @param {function} onConfirm - Callback a ejecutar si se confirma.
     */
    function showConfirmModal(title, body, onConfirm) {
        const confirmModalHTML = `
            <div class="modal fade" id="confirmActionModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title"><i class="fas fa-question-circle me-2"></i> ${title}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">${body}</div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" id="confirmActionBtn" class="btn btn-primary">Confirmar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        // Eliminar modal anterior si existe
        document.getElementById('confirmActionModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', confirmModalHTML);

        const modalElement = document.getElementById('confirmActionModal');
        const confirmModal = new bootstrap.Modal(modalElement);

        modalElement.querySelector('#confirmActionBtn').onclick = () => {
            onConfirm();
            confirmModal.hide();
        };

        modalElement.addEventListener('hidden.bs.modal', () => modalElement.remove());
        
        confirmModal.show();
    }

    function confirmAppointment(citaId) {
        const onConfirm = () => {
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
        };

        showConfirmModal(
            'Confirmar Cita',
            '¿Está seguro de que desea confirmar esta cita?',
            onConfirm
        );
    }

    // --- LÓGICA DEL MODAL DE ASISTENCIA (ACTUALIZADA) ---
    function initializeAsistencia() {
        const asistenciaModalElement = document.getElementById('asistenciaModal');
        if (!asistenciaModalElement) return;

        const asistenciaModal = new bootstrap.Modal(asistenciaModalElement);
        const modalBody = document.getElementById('asistenciaModalBody');
        const modalFooter = document.getElementById('asistenciaModalFooter');
        const openAsistenciaBtn = document.getElementById('openAsistenciaBtn');

        let asistenciaState = null;

        const checkAsistenciaStatus = async () => {
            try {
                const response = await fetch('/api/asistencia/hoy');
                if (!response.ok) {
                    if (response.status !== 404) { // 404 es esperado si no hay registro
                        throw new Error('Error al verificar asistencia');
                    }
                    asistenciaState = null; // No hay registro hoy
                } else {
                    asistenciaState = await response.json();
                }
                
                // Si no hay registro, mostrar modal automáticamente
                if (!asistenciaState) {
                    asistenciaModal.show();
                }
                updateModalUI();

            } catch (error) {
                console.error(error);
                modalBody.innerHTML = `<p class="text-danger">No se pudo verificar el estado de la asistencia. Intente de nuevo.</p>`;
            }
        };

        const updateModalUI = () => {
            modalBody.innerHTML = '';
            modalFooter.innerHTML = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>';

            if (!asistenciaState) {
                // No ha marcado entrada
                modalBody.innerHTML = `<p>No has registrado tu asistencia para hoy, <strong>${new Date().toLocaleDateString('es-ES', { dateStyle: 'full' })}</strong>.</p>`;
                const btnEntrada = document.createElement('button');
                btnEntrada.className = 'btn btn-success';
                btnEntrada.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Registrar Entrada';
                btnEntrada.onclick = registrarEntrada;
                modalFooter.appendChild(btnEntrada);
            } else if (asistenciaState && !asistenciaState.hora_salida) {
                // Marcó entrada, pero no salida
                modalBody.innerHTML = `<p>✅ Entrada registrada a las: <strong>${asistenciaState.hora_entrada}</strong>.</p>
                                       <p>Tu turno de hoy finaliza a las: <strong>${asistenciaState.horario_fin_hoy || 'N/A'}</strong>.</p>`;
                const btnSalida = document.createElement('button');
                btnSalida.id = 'btnRegistrarSalida';
                btnSalida.className = 'btn btn-primary';
                btnSalida.innerHTML = '<i class="fas fa-sign-out-alt me-2"></i>Registrar Salida';
                btnSalida.onclick = registrarSalida;

                // Habilitar botón de salida solo si la hora actual es posterior a la hora de fin de turno
                const ahora = new Date();
                const horaFinTurno = new Date();
                if (asistenciaState.horario_fin_hoy) {
                    const [h, m, s] = asistenciaState.horario_fin_hoy.split(':');
                    horaFinTurno.setHours(h, m, s);
                    if (ahora < horaFinTurno) {
                        btnSalida.disabled = true;
                        btnSalida.title = `Podrás marcar tu salida después de las ${asistenciaState.horario_fin_hoy}.`;
                    }
                }
                
                modalFooter.appendChild(btnSalida);
            } else {
                // Ya marcó entrada y salida
                modalBody.innerHTML = `<p>🎉 ¡Jornada completada por hoy!</p>
                                       <p><strong>Entrada:</strong> ${asistenciaState.hora_entrada}</p>
                                       <p><strong>Salida:</strong> ${asistenciaState.hora_salida}</p>`;
            }
        };

        const registrarEntrada = async () => {
            const hora_entrada = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
            try {
                const response = await fetch('/api/asistencia', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fecha: new Date().toISOString().split('T')[0],
                        hora_entrada: hora_entrada,
                        estado_asistencia: 'Asistió'  // VALOR VÁLIDO SEGÚN LA BD
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error al registrar entrada');
                
                asistenciaModal.hide();
                alert('Entrada registrada con éxito.');
                checkAsistenciaStatus(); // Recargar estado
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        };

        const registrarSalida = async () => {
            const hora_salida = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM
            try {
                const response = await fetch(`/api/asistencia/${asistenciaState.id_asistencia}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hora_salida: hora_salida })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error al registrar salida');

                asistenciaModal.hide();
                alert('Salida registrada con éxito.');
                checkAsistenciaStatus(); // Recargar estado
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        };

        // Evento para abrir el modal manualmente
        if (openAsistenciaBtn) {
            openAsistenciaBtn.addEventListener('click', () => {
                updateModalUI(); // Asegurarse de que el UI esté actualizado
                asistenciaModal.show();
            });
        }

        // Al cerrar el modal, recargar el estado por si acaso
        asistenciaModalElement.addEventListener('hidden.bs.modal', () => {
            checkAsistenciaStatus();
        });

        // Carga inicial
        checkAsistenciaStatus();
    }

    // --- Iniciar la aplicación ---
    initialize();
});