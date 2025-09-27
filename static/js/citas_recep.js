document.addEventListener('DOMContentLoaded', function() {
    let calendar;
    const citaModal = new bootstrap.Modal(document.getElementById('citaModal'));
    const citaForm = document.getElementById('citaForm');
    const viewCitaModal = new bootstrap.Modal(document.getElementById('viewCitaModal'));
    const submitBtn = document.getElementById('submitBtn');

    // --- Funciones de Utilidad ---
    const showAlert = (message, type = 'info') => {
        const alertContainer = document.getElementById('alertContainer');
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `<i class="fas ${icon} me-2"></i>${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        alertContainer.prepend(alert);
        setTimeout(() => bootstrap.Alert.getOrCreateInstance(alert).close(), 5000);
    };

    // --- Inicialización y Event Listeners ---
    const initialize = () => {
        initializeCalendar();
        initializeForm();
        initializeFilters();
        initializeEventListeners();
        fetchUserData();
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
            editable: true,
            selectable: true,
            selectMirror: true,
            dayMaxEvents: true,
            events: (fetchInfo, successCallback, failureCallback) => {
                const medicoId = $('#filterMedico').val();
                const pacienteId = $('#filterPaciente').val();
                const params = new URLSearchParams();
                if (medicoId) params.append('id_medico', medicoId);
                if (pacienteId) params.append('id_paciente', pacienteId);

                fetch(`/api/citas/calendar?${params.toString()}`)
                    .then(response => response.ok ? response.json() : Promise.reject('Error al cargar citas'))
                    .then(data => successCallback(data))
                    .catch(error => {
                        failureCallback(error);
                        showAlert('Error al cargar las citas en el calendario.', 'danger');
                    });
            },
            eventClick: info => openViewModal(info.event.id),
            select: info => {
                resetForm();
                const selectedDate = info.startStr.split('T')[0];
                document.getElementById('fecha_cita').value = selectedDate;
                flatpickr("#fecha_cita").setDate(selectedDate, true);
                citaModal.show();
            },
            eventDrop: info => handleEventDrop(info),
            loading: isLoading => {
                const refreshBtnIcon = document.querySelector('#refreshTableBtn i');
                if (isLoading) refreshBtnIcon.classList.add('fa-spin');
                else refreshBtnIcon.classList.remove('fa-spin');
            }
        });
        calendar.render();
    };

    const initializeForm = () => {
        const initSelect2 = (selector, placeholder, url, idKey, textKey) => {
            $(selector).select2({
                theme: 'bootstrap-5',
                dropdownParent: $('#citaModal'),
                placeholder: placeholder,
                ajax: {
                    url: url,
                    dataType: 'json',
                    delay: 250,
                    processResults: data => ({
                        results: data.map(item => ({
                            id: item[idKey],
                            text: item[textKey] + (item.especialidad ? ` - ${item.especialidad}` : '')
                        }))
                    }),
                    cache: true
                }
            });
        };

        initSelect2('#id_medico', 'Buscar médico...', '/api/medicos/disponibles', 'id_medico', 'nombre_completo');
        initSelect2('#id_paciente', 'Buscar paciente...', '/api/pacientes', 'id_paciente', 'nombre_completo');

        flatpickr("#fecha_cita", {
            locale: 'es',
            minDate: 'today',
            dateFormat: 'Y-m-d',
            disable: [date => (date.getDay() === 0)] // Deshabilitar Domingos
        });
    };

    const initializeFilters = () => {
        const initFilterSelect2 = (selector, placeholder, url, idKey, textKey) => {
            $(selector).select2({
                theme: 'bootstrap-5',
                placeholder: placeholder,
                allowClear: true,
                ajax: {
                    url: url,
                    dataType: 'json',
                    delay: 250,
                    processResults: data => ({
                        results: data.map(item => ({
                            id: item[idKey],
                            text: item[textKey] + (item.especialidad ? ` - ${item.especialidad}` : '')
                        }))
                    }),
                    cache: true
                }
            });
        };

        initFilterSelect2('#filterMedico', 'Todos los médicos', '/api/medicos/disponibles', 'id_medico', 'nombre_completo');
        initFilterSelect2('#filterPaciente', 'Todos los pacientes', '/api/pacientes', 'id_paciente', 'nombre_completo');
    };

    const initializeEventListeners = () => {
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.getElementById('wrapper').classList.toggle('toggled');
            setTimeout(() => calendar.updateSize(), 350);
        });

        document.getElementById('refreshTableBtn').addEventListener('click', () => calendar.refetchEvents());
        $('#filterMedico, #filterPaciente').on('change', () => calendar.refetchEvents());
        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            $('#filterMedico, #filterPaciente').val(null).trigger('change');
        });

        $('#id_medico, #fecha_cita').on('change', () => {
            const medicoId = $('#id_medico').val();
            const fecha = $('#fecha_cita').val();
            if (medicoId && fecha) loadAvailableSlots(medicoId, fecha);
        });

        citaForm.addEventListener('submit', handleFormSubmit);
        citaForm.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('input', checkFormValidity);
            el.addEventListener('change', checkFormValidity);
        });

        document.getElementById('citaModal').addEventListener('hidden.bs.modal', resetForm);
    };

    const fetchUserData = () => {
        fetch('/api/user-data')
            .then(res => res.ok ? res.json() : Promise.reject('Error'))
            .then(data => {
                document.getElementById('username').textContent = data.nombre || 'Usuario';
            }).catch(() => {
                document.getElementById('username').textContent = 'Usuario';
            });
    };

    // --- Lógica del Formulario ---
    const loadAvailableSlots = (medicoId, fecha) => {
        const timeSlotsContainer = document.getElementById('timeSlotsContainer');
        $('#hora_cita').val('');
        timeSlotsContainer.innerHTML = `<div class="d-flex justify-content-center align-items-center py-3"><div class="spinner-border spinner-border-sm text-primary" role="status"></div><span class="ms-2">Cargando...</span></div>`;
        
        fetch(`/api/medicos/${medicoId}/horarios?fecha=${fecha}`)
            .then(response => response.ok ? response.json() : response.json().then(err => Promise.reject(err)))
            .then(horarios => {
                timeSlotsContainer.innerHTML = '';
                if (!horarios || horarios.length === 0) {
                    timeSlotsContainer.innerHTML = `<div class="alert alert-warning small p-2">No hay horarios disponibles para este día.</div>`;
                    return;
                }
                horarios.forEach(horario => {
                    const slot = document.createElement('button');
                    slot.type = 'button';
                    slot.className = 'btn btn-outline-success btn-sm time-slot';
                    slot.textContent = horario;
                    slot.addEventListener('click', function() {
                        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('active'));
                        this.classList.add('active');
                        $('#hora_cita').val(horario).trigger('change');
                    });
                    timeSlotsContainer.appendChild(slot);
                });
            })
            .catch(error => {
                timeSlotsContainer.innerHTML = `<div class="alert alert-danger small p-2">${error.error || 'Error al cargar horarios.'}</div>`;
            })
            .finally(checkFormValidity);
    };

    const checkFormValidity = () => {
        const isFormValid = citaForm.checkValidity() && document.getElementById('hora_cita').value !== '';
        submitBtn.disabled = !isFormValid;
        return isFormValid;
    };

    const openViewModal = (citaId) => {
        const modalContent = document.getElementById('viewCitaContent');
        const modalFooter = document.getElementById('viewCitaFooter');
        modalContent.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-info" role="status"></div></div>';
        modalFooter.innerHTML = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>';
        viewCitaModal.show();

        fetch(`/api/citas/${citaId}`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar detalles.'))
            .then(data => {
                const fechaHora = `${new Date(data.fecha_cita + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} a las ${data.hora_cita}`;
                const statusMap = { 'pendiente': 'warning', 'completada': 'success', 'cancelada': 'danger' };
                const statusBadge = `<span class="badge bg-${statusMap[data.estado] || 'secondary'}">${data.estado}</span>`;

                modalContent.innerHTML = `
                    <p><strong>Paciente:</strong> ${data.paciente_nombre}</p>
                    <p><strong>Médico:</strong> ${data.medico_nombre}</p>
                    <p><strong>Fecha y Hora:</strong> ${fechaHora}</p>
                    <p><strong>Estado:</strong> ${statusBadge}</p>
                    <p><strong>Motivo:</strong><br><span class="text-muted">${data.motivo_consulta || 'N/A'}</span></p>
                `;

                if (data.estado === 'pendiente') {
                    modalFooter.innerHTML = `
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-danger" id="cancelarBtn" data-id="${data.id_cita}"><i class="fas fa-times me-1"></i> Cancelar Cita</button>
                        <button type="button" class="btn btn-warning" id="reagendarBtn" data-id="${data.id_cita}"><i class="fas fa-edit me-1"></i> Reagendar</button>
                    `;
                    document.getElementById('reagendarBtn').addEventListener('click', function() {
                        viewCitaModal.hide();
                        openModalForEdit(this.dataset.id);
                    });
                    document.getElementById('cancelarBtn').addEventListener('click', function() {
                        viewCitaModal.hide();
                        cancelAppointment(this.dataset.id);
                    });
                }
            })
            .catch(error => modalContent.innerHTML = `<div class="alert alert-danger">${error}</div>`);
    };

    const openModalForEdit = (citaId) => {
        fetch(`/api/citas/${citaId}`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar datos.'))
            .then(data => {
                resetForm();
                $('#citaModalLabel').html('<i class="fas fa-edit me-2"></i> Reagendar Cita');
                $('#id_cita_edit').val(data.id_cita);
                $('#saveText').html('<i class="fas fa-save me-1"></i> Guardar Cambios');

                $('#id_medico').append(new Option(data.medico_nombre, data.id_medico, true, true)).trigger('change').prop('disabled', true);
                $('#id_paciente').append(new Option(data.paciente_nombre, data.id_paciente, true, true)).trigger('change').prop('disabled', true);

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
        if (!checkFormValidity()) {
            if (!$('#hora_cita').val()) $('#timeSlotError').text('Seleccione un horario.');
            return;
        }

        const citaId = $('#id_cita_edit').val();
        const method = citaId ? 'PUT' : 'POST';
        const url = citaId ? `/api/citas/${citaId}` : '/api/citas';
        const formData = {
            id_medico: $('#id_medico').val(),
            id_paciente: $('#id_paciente').val(),
            fecha_cita: $('#fecha_cita').val(),
            hora_cita: $('#hora_cita').val(),
            motivo_consulta: $('#motivo_consulta').val()
        };

        submitBtn.disabled = true;
        submitBtn.querySelector('.spinner-border').classList.remove('d-none');

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
        })
        .catch(error => showAlert(error.error || 'Error en la operación.', 'danger'))
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.querySelector('.spinner-border').classList.add('d-none');
        });
    };

    const resetForm = () => {
        citaForm.reset();
        citaForm.classList.remove('was-validated');
        $('#id_cita_edit').val('');
        $('#citaModalLabel').html('<i class="fas fa-calendar-plus me-2"></i> Nueva Cita Médica');
        $('#id_medico, #id_paciente').val(null).trigger('change').prop('disabled', false);
        $('#timeSlotsContainer').html('<div class="alert alert-info small">Seleccione un médico y una fecha para ver los horarios.</div>');
        $('#timeSlotError').text('');
        submitBtn.disabled = true;
        $('#saveText').html('<i class="fas fa-save me-1"></i> Programar Cita');
    };

    const cancelAppointment = (citaId) => {
        if (!confirm('¿Está seguro de que desea cancelar esta cita?')) return;

        fetch(`/api/citas/${citaId}/cancel`, { method: 'PATCH' })
            .then(response => response.ok ? response.json() : response.json().then(err => Promise.reject(err)))
            .then(data => {
                showAlert(data.message, 'success');
                calendar.refetchEvents();
            })
            .catch(error => showAlert(error.error || 'Error al cancelar la cita.', 'danger'));
    };

    const handleEventDrop = (info) => {
        const { id, start } = info.event;
        const newFecha = start.toISOString().split('T')[0];
        const newHora = ('0' + start.getHours()).slice(-2) + ':' + ('0' + start.getMinutes()).slice(-2);

        if (!confirm(`¿Reagendar esta cita al ${newFecha} a las ${newHora}?`)) {
            info.revert();
            return;
        }

        fetch(`/api/citas/${id}/reschedule`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha_cita: newFecha, hora_cita: newHora })
        })
        .then(response => response.ok ? response.json() : response.json().then(err => Promise.reject(err)))
        .then(data => showAlert(data.message, 'success'))
        .catch(error => {
            showAlert(error.error || 'No se pudo reagendar. El horario podría no ser válido.', 'danger');
            info.revert();
        });
    };

    // Iniciar la aplicación
    initialize();
});