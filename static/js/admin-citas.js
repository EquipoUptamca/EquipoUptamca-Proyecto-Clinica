$(document).ready(function() {
    let calendar;
    const citaModal = new bootstrap.Modal('#citaModal');
    const citaForm = $('#citaForm');
    const viewCitaModal = new bootstrap.Modal('#viewCitaModal');
    const agendaModal = new bootstrap.Modal('#agendaModal');
    const submitBtn = $('#submitBtn');

    // --- Funciones de Utilidad ---
    const showAlert = (message, type = 'info') => {
        const alertContainer = $('#alertContainer');
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
        const alert = $(`<div class="alert alert-${type} alert-dismissible fade show" role="alert"><i class="fas ${icon} me-2"></i>${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`);
        alertContainer.append(alert);
        setTimeout(() => alert.alert('close'), 5000);
    };

    const updateCounters = () => {
        fetch('/api/citas/stats')
            .then(response => response.json())
            .then(data => {
                $('#countPending').text(data.pending || 0);
                $('#countToday').text(data.today || 0);
                $('#countCompleted').text(data.completed || 0);
            })
            .catch(error => console.error('Error al obtener estadísticas de citas:', error));
    };

    // --- Inicialización y Event Listeners ---
    const initialize = () => {
        initializeCalendar();
        initializeForm();
        initializeFilters();
        initializeEventListeners();
        updateCounters();
    };

    const initializeCalendar = () => {
        const calendarEl = document.getElementById('calendar');
        calendar = new FullCalendar.Calendar(calendarEl, {
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            },
            initialView: 'dayGridMonth',
            locale: 'es',
            navLinks: true,
            editable: true, // for drag-and-drop
            selectable: true, // for click-to-create
            selectMirror: true,
            dayMaxEvents: true, // allow "more" link when too many events
            events: function(fetchInfo, successCallback, failureCallback) {
                const medicoId = $('#filterMedico').val();
                const pacienteId = $('#filterPaciente').val();
                const params = new URLSearchParams();
                if (medicoId) {
                    params.append('id_medico', medicoId);
                }
                if (pacienteId) {
                    params.append('id_paciente', pacienteId);
                }

                fetch(`/api/citas/calendar?${params.toString()}`)
                    .then(response => {
                        if (!response.ok) throw new Error('Network response was not ok');
                        return response.json();
                    })
                    .then(data => successCallback(data))
                    .catch(error => {
                        console.error('Error fetching calendar events:', error);
                        failureCallback(error);
                        showAlert('Error al cargar las citas en el calendario.', 'danger');
                    });
            },
            eventClick: function(info) {
                openViewModal(info.event.id);
            },
            select: function(info) {
                resetForm();
                const selectedDate = info.startStr.split('T')[0];
                $('#fecha_cita').val(selectedDate);
                flatpickr("#fecha_cita").setDate(selectedDate, true);
                citaModal.show();
            },
            eventDrop: function(info) {
                const citaId = info.event.id;
                const newStartDate = info.event.start;

                const newFecha = newStartDate.toISOString().split('T')[0];
                const newHora = ('0' + newStartDate.getHours()).slice(-2) + ':' + ('0' + newStartDate.getMinutes()).slice(-2);

                if (!confirm(`¿Está seguro de que desea reagendar esta cita al ${newFecha} a las ${newHora}?`)) {
                    info.revert();
                    return;
                }

                fetch(`/api/citas/${citaId}/reschedule`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fecha_cita: newFecha, hora_cita: newHora })
                })
                .then(response => {
                    if (!response.ok) return response.json().then(err => Promise.reject(err));
                    return response.json();
                })
                .then(data => {
                    showAlert(data.message, 'success');
                    updateCounters();
                })
                .catch(error => {
                    showAlert(error.error || 'No se pudo reagendar. El horario podría no ser válido.', 'danger');
                    info.revert();
                });
            },
            loading: function(isLoading) {
                const refreshBtnIcon = $('#refreshTableBtn i');
                if (isLoading) {
                    refreshBtnIcon.addClass('fa-spin');
                } else {
                    refreshBtnIcon.removeClass('fa-spin');
                }
            }
        });
        calendar.render();
    };

    const initializeForm = () => {
        // Inicializar Select2
        const initSelect2 = (selector, placeholder, url) => {
            $(selector).select2({
                theme: 'bootstrap-5',
                dropdownParent: $('#citaModal'),
                placeholder: placeholder,
                ajax: {
                    url: url,
                    dataType: 'json',
                    delay: 250,
                    processResults: function(data) {
                        const results = data.map(item => ({
                            id: item.id_medico || item.id_paciente,
                            text: item.nombre_completo + (item.especialidad ? ` - ${item.especialidad}` : '')
                        }));
                        return { results: results };
                    },
                    cache: true
                }
            });
        };

        initSelect2('#id_medico', 'Buscar médico...', '/api/medicos/disponibles');
        initSelect2('#id_paciente', 'Buscar paciente...', '/api/pacientes');

        // Inicializar Flatpickr
        flatpickr("#fecha_cita", {
            locale: 'es',
            minDate: 'today',
            dateFormat: 'Y-m-d',
            disable: [date => (date.getDay() === 0 || date.getDay() === 6)]
        });
    };

    const initializeFilters = () => {
        const initFilterSelect2 = (selector, placeholder, url, idKey) => {
            $(selector).select2({
                theme: 'bootstrap-5',
                placeholder: placeholder,
                allowClear: true,
                ajax: {
                    url: url,
                    dataType: 'json',
                    delay: 250,
                    processResults: function(data) {
                        const results = data.map(item => ({
                            id: item[idKey],
                            text: item.nombre_completo + (item.especialidad ? ` - ${item.especialidad}` : '')
                        }));
                        return { results: results };
                    },
                    cache: true
                }
            });
        };

        initFilterSelect2('#filterMedico', 'Todos los médicos', '/api/medicos/disponibles', 'id_medico');
        initFilterSelect2('#filterPaciente', 'Todos los pacientes', '/api/pacientes', 'id_paciente');
    };

    const initializeEventListeners = () => {
        // Sidebar toggle
        $('#sidebarToggle').on('click', () => {
            $('#sidebar, #mainContent').toggleClass('collapsed');
            // Redibujar calendario al cambiar tamaño del contenedor
            setTimeout(() => calendar.updateSize(), 350);
        });

        // Abrir agenda del día
        $('#agendaHoyBtn').on('click', () => {
            openAgendaModal();
        });

        // Imprimir agenda
        $(document).on('click', '#printAgendaBtn', () => {
            printAgenda();
        });

        // Recargar tabla
        $('#refreshTableBtn').on('click', () => {
            calendar.refetchEvents();
            updateCounters();
        });

        // Listeners para filtros
        $('#filterMedico, #filterPaciente').on('change', function() {
            calendar.refetchEvents();
        });

        $('#clearFiltersBtn').on('click', function() {
            $('#filterMedico, #filterPaciente').val(null).trigger('change');
        });

        // Eventos del formulario
        $('#id_medico, #fecha_cita').on('change', () => {
            const medicoId = $('#id_medico').val();
            const fecha = $('#fecha_cita').val();
            if (medicoId && fecha) {
                loadAvailableSlots(medicoId, fecha);
            }
        });

        citaForm.on('submit', handleFormSubmit);
        citaForm.find('input, select, textarea').on('input change', checkFormValidity);

        $('#citaModal').on('hidden.bs.modal', resetForm);
    };

    const printAgenda = () => {
        const printContent = document.getElementById('agendaContent').innerHTML;
        const printWindow = window.open('', '_blank');

        printWindow.document.write('<html><head><title>Agenda del Día</title>');
        printWindow.document.write('<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">');
        printWindow.document.write('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">');
        printWindow.document.write(`
            <style>
                body { 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                    font-family: 'Montserrat', sans-serif;
                }
                .agenda-card {
                    border-left-width: 5px !important;
                    page-break-inside: avoid;
                    box-shadow: none !important;
                    border: 1px solid #dee2e6 !important;
                }
                .btn { display: none; }
                .badge { border: 1px solid transparent; }
                .bg-opacity-10 { background-color: rgba(var(--bs-dark-rgb), .1) !important; }
                @media print {
                    body { margin: 20px; }
                }
            </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write('<div class="container-fluid">');
        const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
        printWindow.document.write(`<h1 class="my-4">Agenda del Día - ${today}</h1>`);
        printWindow.document.write(printContent);
        printWindow.document.write('</div></body></html>');
        printWindow.document.close();
        setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
    };

    const openAgendaModal = () => {
        const agendaContent = $('#agendaContent');
        agendaContent.html('<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Cargando agenda...</p></div>');
        agendaModal.show();

        fetch('/api/citas/agenda-hoy')
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar la agenda.'))
            .then(citas => {
                renderAgenda(citas);
            })
            .catch(error => {
                agendaContent.html(`<div class="alert alert-danger">${error}</div>`);
            });
    };

    const renderAgenda = (citas) => {
        const agendaContent = $('#agendaContent');
        if (citas.length === 0) {
            agendaContent.html(`
                <div class="text-center py-5">
                    <i class="fas fa-calendar-check fa-4x text-muted mb-3"></i>
                    <h4>No hay citas programadas para hoy.</h4>
                </div>
            `);
            return;
        }

        const listHtml = citas.map(cita => {
            const statusMap = {
                'pendiente': { class: 'border-warning', textClass: 'text-warning', icon: 'fa-clock', text: 'Pendiente' },
                'completada': { class: 'border-success', textClass: 'text-success', icon: 'fa-check-circle', text: 'Completada' },
                'cancelada': { class: 'border-danger', textClass: 'text-danger', icon: 'fa-times-circle', text: 'Cancelada' }
            };
            const statusInfo = statusMap[cita.estado] || { class: 'border-secondary', textClass: 'text-secondary', icon: 'fa-question-circle', text: 'Desconocido' };

            let actionButton = '';
            if (cita.estado === 'pendiente') {
                actionButton = `<button class="btn btn-sm btn-outline-success complete-btn" data-id="${cita.id_cita}"><i class="fas fa-check"></i> Marcar como Completada</button>`;
            }

            return `
                <div class="card mb-3 shadow-sm agenda-card ${statusInfo.class}">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-2 text-center">
                                <h4 class="mb-0">${cita.hora}</h4>
                                <span class="badge bg-${statusInfo.class.split('-')[1]} bg-opacity-10 ${statusInfo.textClass}"><i class="fas ${statusInfo.icon} me-1"></i> ${statusInfo.text}</span>
                            </div>
                            <div class="col-md-7">
                                <h5 class="mb-1">${cita.paciente}</h5>
                                <p class="text-muted mb-0"><i class="fas fa-user-md me-2"></i>Dr(a). ${cita.medico} <small>(${cita.especialidad})</small></p>
                            </div>
                            <div class="col-md-3 text-end">
                                ${actionButton}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        agendaContent.html(listHtml);
    };

    // --- Lógica del Formulario ---
    const loadAvailableSlots = (medicoId, fecha) => {
        $('#timeSlotError').text('');
        $('#hora_cita').val('');
        const timeSlotsContainer = $('#timeSlotsContainer');
        timeSlotsContainer.html(`<div class="d-flex justify-content-center align-items-center py-3"><div class="spinner-border spinner-border-sm text-primary" role="status"></div><span class="ms-2">Cargando...</span></div>`);
        
        fetch(`/api/medicos/${medicoId}/horarios?fecha=${fecha}`)
            .then(response => response.ok ? response.json() : response.json().then(err => Promise.reject(err)))
            .then(horarios => {
                timeSlotsContainer.empty();
                if (!horarios || horarios.length === 0) {
                    timeSlotsContainer.html(`<div class="alert alert-warning small p-2">No hay horarios disponibles para este día.</div>`);
                    return;
                }
                horarios.forEach(horario => {
                    const slot = $(`<button type="button" class="btn btn-outline-success btn-sm time-slot">${horario}</button>`);
                    slot.on('click', function() {
                        $('.time-slot').removeClass('active');
                        $(this).addClass('active');
                        $('#hora_cita').val(horario).trigger('change');
                    });
                    timeSlotsContainer.append(slot);
                });
            })
            .catch(error => {
                console.error('Error:', error);
                timeSlotsContainer.html(`<div class="alert alert-danger small p-2">${error.error || 'Error al cargar horarios.'}</div>`);
            })
            .finally(checkFormValidity);
    };

    const checkFormValidity = () => {
        const isFormValid = citaForm[0].checkValidity() && $('#hora_cita').val() !== '';
        submitBtn.prop('disabled', !isFormValid);
        return isFormValid;
    };

    const openViewModal = (citaId) => {
        const modalContent = $('#viewCitaContent');
        const modalFooter = $('#viewCitaFooter');
        modalContent.html('<div class="text-center py-5"><div class="spinner-border text-info" role="status"><span class="visually-hidden">Cargando...</span></div></div>');
        modalFooter.html('<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>'); // Reset footer
        viewCitaModal.show();

        fetch(`/api/citas/${citaId}`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar los detalles de la cita.'))
            .then(data => {
                const fechaHora = `${new Date(data.fecha_cita + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} a las ${data.hora_cita}`;
                
                const statusMap = {
                    'pendiente': { class: 'bg-warning text-dark', icon: 'fa-clock' },
                    'completada': { class: 'bg-success text-white', icon: 'fa-check-circle' },
                    'cancelada': { class: 'bg-danger', icon: 'fa-times-circle' }
                };
                const statusInfo = statusMap[data.estado] || { class: 'bg-secondary', icon: 'fa-question-circle' };
                const statusBadge = `<span class="badge ${statusInfo.class}"><i class="fas ${statusInfo.icon} me-1"></i>${data.estado.charAt(0).toUpperCase() + data.estado.slice(1)}</span>`;

                const detailsHtml = `
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong><i class="fas fa-user-injured me-2"></i>Paciente:</strong><br>${data.paciente_nombre}</p>
                            <p><strong><i class="fas fa-user-md me-2"></i>Médico:</strong><br>${data.medico_nombre}</p>
                            <p><strong><i class="fas fa-calendar-alt me-2"></i>Fecha y Hora:</strong><br>${fechaHora}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong><i class="fas fa-info-circle me-2"></i>Estado:</strong><br>${statusBadge}</p>
                            <p><strong><i class="fas fa-comment-medical me-2"></i>Motivo de la Consulta:</strong></p>
                            <p class="bg-light p-2 rounded" style="white-space: pre-wrap;">${data.motivo_consulta || 'No especificado'}</p>
                        </div>
                    </div>
                `;
                modalContent.html(detailsHtml);

                // Dynamic footer
                if (data.estado === 'pendiente') {
                    const actionButtons = `
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-danger" id="cancelarBtn" data-id="${data.id_cita}"><i class="fas fa-times-circle me-1"></i> Cancelar Cita</button>
                        <button type="button" class="btn btn-warning" id="reagendarBtn" data-id="${data.id_cita}"><i class="fas fa-edit me-1"></i> Reagendar</button>
                    `;
                    modalFooter.html(actionButtons);

                    // Add listeners for new buttons
                    $('#reagendarBtn').on('click', function() {
                        viewCitaModal.hide();
                        openModalForEdit($(this).data('id'));
                    });
                    $('#cancelarBtn').on('click', function() {
                        viewCitaModal.hide();
                        cancelAppointment($(this).data('id'));
                    });
                }
            })
            .catch(error => modalContent.html(`<div class="alert alert-danger">${error}</div>`));
    };

    const openModalForEdit = (citaId) => {
        fetch(`/api/citas/${citaId}`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar datos de la cita.'))
            .then(data => {
                resetForm();
                
                $('#citaModalLabel').html('<i class="fas fa-edit me-2"></i> Reagendar Cita');
                $('#id_cita_edit').val(data.id_cita);
                submitBtn.find('#saveText').html('<i class="fas fa-save me-1"></i> Guardar Cambios');

                // Poblar y deshabilitar Select2
                const medicoSelect = $('#id_medico');
                medicoSelect.append(new Option(data.medico_nombre, data.id_medico, true, true)).trigger('change').prop('disabled', true);

                const pacienteSelect = $('#id_paciente');
                pacienteSelect.append(new Option(data.paciente_nombre, data.id_paciente, true, true)).trigger('change').prop('disabled', true);

                // Poblar otros campos
                $('#fecha_cita').val(data.fecha_cita);
                flatpickr("#fecha_cita").setDate(data.fecha_cita, true);
                $('#motivo_consulta').val(data.motivo_consulta);

                loadAvailableSlots(data.id_medico, data.fecha_cita);

                citaModal.show();
            })
            .catch(error => showAlert(error, 'danger'));
    };

    const handleFormSubmit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        citaForm.addClass('was-validated');

        if (!checkFormValidity()) {
            if ($('#hora_cita').val() === '') {
                $('#timeSlotError').text('Seleccione un horario.');
            }
            return;
        }

        const citaId = $('#id_cita_edit').val();
        const method = citaId ? 'PUT' : 'POST';
        const url = citaId ? `/api/citas/${citaId}` : '/api/citas';
        const actionText = citaId ? 'Guardando...' : 'Programando...';

        const formData = {
            id_medico: $('#id_medico').val(),
            id_paciente: $('#id_paciente').val(),
            fecha_cita: $('#fecha_cita').val(),
            hora_cita: $('#hora_cita').val(),
            motivo_consulta: $('#motivo_consulta').val()
        };

        submitBtn.prop('disabled', true).find('.spinner-border').removeClass('d-none');
        submitBtn.find('#saveText').text(actionText);

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(response => response.ok ? response.json() : response.json().then(err => Promise.reject(err)))
        .then(data => {
            citaModal.hide();
            showAlert(data.message, 'success');
            calendar.refetchEvents();
            updateCounters();
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert(error.error || 'Error en la operación.', 'danger');
        })
        .finally(() => {
            submitBtn.prop('disabled', false).find('.spinner-border').addClass('d-none');
            // El texto se restaura en resetForm
        });
    };

    const resetForm = () => {
        citaForm[0].reset();
        citaForm.removeClass('was-validated');
        $('#id_cita_edit').val('');
        $('#citaModalLabel').html('<i class="fas fa-calendar-plus me-2"></i> Nueva Cita Médica');
        $('#id_medico, #id_paciente').val(null).trigger('change').prop('disabled', false);
        $('#timeSlotsContainer').html('<div class="alert alert-info small">Seleccione un médico y una fecha para ver los horarios.</div>');
        $('#timeSlotError').text('');
        submitBtn.prop('disabled', true);
        submitBtn.find('#saveText').html('<i class="fas fa-save me-1"></i> Programar Cita');
    };

    const cancelAppointment = (citaId) => {
        if (!confirm('¿Está seguro de que desea cancelar esta cita? Esta acción no se puede deshacer.')) {
            return;
        }

        fetch(`/api/citas/${citaId}/cancel`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
        })
        .then(response => response.ok ? response.json() : response.json().then(err => Promise.reject(err)))
        .then(data => {
            showAlert(data.message, 'success');
            calendar.refetchEvents();
            updateCounters();
        })
        .catch(error => showAlert(error.error || 'Error al cancelar la cita.', 'danger'));
    };

    const markAsCompleted = (citaId) => {
        if (!confirm('¿Marcar esta cita como completada?')) return;

        fetch(`/api/citas/${citaId}/complete`, { method: 'PATCH' })
            .then(response => response.ok ? response.json() : response.json().then(err => Promise.reject(err.error || 'Error al completar la cita.')))
            .then(data => {
                showAlert(data.message, 'success');
                openAgendaModal(); // Refresh agenda view
                calendar.refetchEvents();
                updateCounters();
            })
            .catch(error => showAlert(error, 'danger'));
    };

    // Delegated event listener for agenda actions
    $('#agendaContent').on('click', '.complete-btn', function() {
        const citaId = $(this).data('id');
        markAsCompleted(citaId);
    });

    // --- Funciones de Renderizado de la Tabla ---

    // Iniciar la aplicación
    initialize();
});