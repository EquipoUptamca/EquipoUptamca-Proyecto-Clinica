$(document).ready(function() {
    let table;
    const pacienteModal = new bootstrap.Modal('#pacienteModal');
    const pacienteForm = $('#pacienteForm');
    const saveBtn = $('#submitBtn');

    // --- Funciones de Utilidad ---
    const showAlert = (message, type = 'info') => {
        const alertContainer = $('#alertContainer');
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
        const alert = $(`<div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas ${icon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`);
        alertContainer.append(alert);
        setTimeout(() => alert.alert('close'), 5000);
    };

    const updateCounters = () => {
        fetch('/api/pacientes/stats')
            .then(response => response.json())
            .then(data => {
                $('#totalPacientes').text(`${data.total || 0} pacientes`);
                $('#countActive').text(data.active || 0);
                $('#countTotal').text(data.total || 0);
                $('#countNew').text(data.new_this_month || 0);
            })
            .catch(error => console.error('Error al obtener estadísticas:', error));
    };

    // --- Lógica de Validación Interactiva ---
    const showError = (field, message) => {
        field.addClass('is-invalid');
        field.siblings('.invalid-feedback').text(message);
    };

    const clearError = (field) => {
        field.removeClass('is-invalid');
    };

    const validateField = async (field) => {
        const value = field.val().trim();
        let isValid = true;
        clearError(field);

        if (field.prop('required') && value === '') {
            showError(field, 'Este campo es obligatorio.');
            isValid = false;
        } else if (value) {
            const fieldId = field.attr('id');
            if (fieldId === 'gmail' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                showError(field, 'Por favor, ingrese un correo válido.');
                isValid = false;
            }
            if (fieldId === 'nombre_completo' && value.length < 5) {
                showError(field, 'Debe tener al menos 5 caracteres.');
                isValid = false;
            }
            if (fieldId === 'contraseña' && value.length < 8) {
                showError(field, 'La contraseña debe tener al menos 8 caracteres.');
                isValid = false;
            }
            if (fieldId === 'cedula') {
                if (field.prop('readonly')) return true; // No validar si es de solo lectura
                const id = $('#id_paciente').val();
                const params = new URLSearchParams({ cedula: value });
                if (id) params.append('exclude', id);

                const response = await fetch(`/api/pacientes/check-cedula?${params}`);
                const data = await response.json();
                if (data.exists) {
                    showError(field, 'Esta cédula ya está registrada.');
                    isValid = false;
                }
            }
        }
        return isValid;
    };

    const checkFormValidity = async () => {
        let isFormValid = true;
        const fields = pacienteForm.find('input:visible[required], select:visible[required]');
        
        for (const field of fields) {
            if (!await validateField($(field))) {
                isFormValid = false;
            }
        }
        
        saveBtn.prop('disabled', !isFormValid);
        return isFormValid;
    };

    // --- Inicialización y Event Listeners ---
    const initialize = () => {
        // Cargar datos del usuario
        fetch('/api/user-data')
            .then(response => response.json())
            .then(data => {
                $('#username').text(data.nombre || 'Administrador');
                $('#userrole').text(data.rol || 'Admin');
            })
            .catch(error => console.error('Error:', error));

        // Inicializar DataTable
        table = $('#pacientesTable').DataTable({
            ajax: {
                url: '/api/pacientes/detallados',
                dataSrc: ''
            },
            columns: [
                { data: 'id_paciente', visible: false },
                { data: 'nombre_completo' },
                { data: 'cedula' },
                { data: 'telefono' },
                { data: 'gmail' },
                { data: 'estado', render: data => data === 'A' ? '<span class="badge bg-success-soft">Activo</span>' : '<span class="badge bg-danger text-white">Inactivo</span>' },
                {
                    data: null,
                    render: (data, type, row) => `
                        <button class="btn btn-sm btn-outline-primary action-btn edit-btn" data-id="${row.id_paciente}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-${row.estado === 'A' ? 'danger' : 'success'} action-btn status-btn" data-id="${row.id_paciente}" data-estado="${row.estado}" title="${row.estado === 'A' ? 'Inactivar' : 'Activar'}">
                            <i class="fas ${row.estado === 'A' ? 'fa-user-slash' : 'fa-user-check'}"></i>
                        </button>
                    `,
                    orderable: false
                }
            ],
            language: { url: '//cdn.datatables.net/1.13.6/i18n/es-ES.json' },
            order: [[1, 'asc']],
            initComplete: updateCounters,
            // Configuración de botones para exportar
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar a Excel',
                    title: `Listado_de_Pacientes_${new Date().toISOString().slice(0,10)}`,
                    exportOptions: {
                        // Columnas a exportar: Nombre, Cédula, Teléfono, Correo, Estado
                        columns: [1, 2, 3, 4, 5] 
                    },
                    className: 'd-none' // Ocultar el botón por defecto
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar a PDF',
                    title: `Listado de Pacientes - ${new Date().toLocaleDateString()}`,
                    orientation: 'portrait',
                    pageSize: 'A4',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5]
                    },
                    customize: function (doc) {
                        doc.content[1].table.widths = ['30%', '20%', '20%', '20%', '10%'];
                        doc.defaultStyle.fontSize = 10;
                        doc.styles.tableHeader.fontSize = 12;
                        doc.styles.title.fontSize = 15;
                        doc.styles.title.alignment = 'center';
                        doc.pageMargins = [40, 60, 40, 60];
                    },
                    className: 'd-none'
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: 'Listado de Pacientes',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5]
                    },
                    customize: function (win) {
                        $(win.document.body).css('font-size', '10pt');
                        $(win.document.body).find('table').addClass('compact').css('font-size', 'inherit');
                        $(win.document.body).find('h1').css('text-align', 'center').css('font-size', '16pt');
                    },
                    className: 'd-none'
                }
            ]
        });

        // Event Listeners para filtros
        $('#filterEstado, #filterFechaDesde, #filterFechaHasta').on('change', () => table.draw());
        let searchTimeout;
        $('#filterSearch').on('keyup', function() {
            clearTimeout(searchTimeout);
            const that = this;
            searchTimeout = setTimeout(() => table.search(that.value).draw(), 300);
        });

        // Event Listeners para acciones de la tabla
        $('#pacientesTable tbody').on('click', '.edit-btn', function() {
            const id = $(this).data('id');
            openModalForEdit(id);
        });

        $('#pacientesTable tbody').on('click', '.status-btn', function() {
            const id = $(this).data('id');
            const estado = $(this).data('estado');
            toggleStatus(id, estado);
        });

        // Event Listeners para el modal
        $('#nuevoPacienteBtn').on('click', openModalForCreate);
        pacienteForm.on('submit', handleFormSubmit);
        pacienteForm.find('input, select').on('input change', () => checkFormValidity());

        $('#id_usuario_select').on('change', function() {
            const selectedOption = $(this).find('option:selected');
            if (!selectedOption.val()) {
                $('#cedula, #telefono, #gmail').val('');
                return;
            }
            $('#cedula').val(selectedOption.data('cedula'));
            $('#telefono').val(selectedOption.data('telefono'));
            $('#gmail').val(selectedOption.data('gmail'));
            checkFormValidity();
        });

        // Event listeners para acciones de exportación
        $('#exportExcel').on('click', function(e) {
            e.preventDefault();
            table.button('.buttons-excel').trigger();
        });

        $('#exportPdf').on('click', function(e) {
            e.preventDefault();
            table.button('.buttons-pdf').trigger();
        });

        $('#printTable').on('click', function(e) {
            e.preventDefault();
            table.button('.buttons-print').trigger();
        });

        $('#refreshTableBtn').on('click', function() {
            $(this).find('i').addClass('fa-spin');
            table.ajax.reload(null, false);
            setTimeout(() => $(this).find('i').removeClass('fa-spin'), 500);
        });
    };

    const loadUsuariosParaPaciente = () => {
        const userSelect = $('#id_usuario_select');
        userSelect.html('<option value="">Cargando usuarios...</option>').prop('disabled', true);

        fetch('/api/usuarios-para-paciente')
            .then(response => response.json())
            .then(users => {
                userSelect.html('<option value="">Seleccione un usuario</option>');
                users.forEach(user => {
                    const option = $('<option>')
                        .val(user.id_usuario)
                        .text(`${user.nombre_completo} (C.I: ${user.cedula})`);
                    
                    option.data('cedula', user.cedula || '');
                    option.data('telefono', user.telefono || '');
                    option.data('gmail', user.gmail || '');

                    userSelect.append(option);
                });
                userSelect.prop('disabled', false);
            })
            .catch(error => {
                console.error('Error:', error);
                userSelect.html('<option value="">Error al cargar usuarios</option>');
            });
    };

    // --- Lógica del Modal ---
    const openModalForCreate = () => {
        pacienteForm[0].reset();
        pacienteForm.find('.is-invalid').removeClass('is-invalid');
        $('#modalTitle').html('<i class="fas fa-user-plus me-2"></i> Nuevo Paciente');
        $('#id_paciente').val('');

        $('#usuarioSelectGroup').show();
        $('#nombreCompletoGroup').hide();
        $('#creation-fields').hide();
        $('#edit-fields').hide();
        $('#cedula, #telefono, #gmail').prop('readonly', true);
        loadUsuariosParaPaciente();
        $('#id_usuario_select').prop('required', true);
        $('#nombre_completo, #usuario_login, #contraseña').prop('required', false);
        pacienteModal.show();
        checkFormValidity();
    };

    const openModalForEdit = (id) => {
        fetch(`/api/pacientes/${id}`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar paciente'))
            .then(paciente => {
                pacienteForm[0].reset();
                pacienteForm.find('.is-invalid').removeClass('is-invalid');
                $('#modalTitle').html('<i class="fas fa-user-edit me-2"></i> Editar Paciente');

                $('#usuarioSelectGroup').hide();
                $('#nombreCompletoGroup').show();
                $('#creation-fields').hide();
                $('#edit-fields').show();

                $('#id_paciente').val(paciente.id_paciente);
                $('#id_usuario').val(paciente.id_usuario);
                $('#nombre_completo').val(paciente.nombre_completo);
                $('#cedula').val(paciente.cedula);
                $('#telefono').val(paciente.telefono);
                $('#gmail').val(paciente.gmail);
                $('#fecha_nacimiento').val(paciente.fecha_nacimiento);
                $('#genero').val(paciente.genero);
                $('#tipo_sangre').val(paciente.tipo_sangre);
                $('#alergias').val(paciente.alergias);
                $('#enfermedades_cronicas').val(paciente.enfermedades_cronicas);
                $('#contacto_emergencia').val(paciente.contacto_emergencia);
                $('#telefono_emergencia').val(paciente.telefono_emergencia);
                $('#estado').val(paciente.estado);

                $('#cedula').prop('readonly', true);
                $('#telefono, #gmail').prop('readonly', false);
                $('#id_usuario_select').prop('required', false);
                $('#nombre_completo').prop('required', true);
                
                pacienteModal.show();
                checkFormValidity();
            })
            .catch(error => showAlert(error, 'danger'));
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        if (!await checkFormValidity()) {
            showAlert('Por favor, corrija los errores en el formulario.', 'warning');
            return;
        }
        submitPacienteForm();
    };

    const submitPacienteForm = () => {
        const id = $('#id_paciente').val();
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/pacientes/${id}` : '/api/pacientes';

        let formData;

        if (id) {
            formData = {
                nombre_completo: $('#nombre_completo').val(),
                telefono: $('#telefono').val(),
                gmail: $('#gmail').val(),
                fecha_nacimiento: $('#fecha_nacimiento').val() || null,
                genero: $('#genero').val() || null,
                tipo_sangre: $('#tipo_sangre').val() || null,
                alergias: $('#alergias').val() || null,
                enfermedades_cronicas: $('#enfermedades_cronicas').val() || null,
                contacto_emergencia: $('#contacto_emergencia').val() || null,
                telefono_emergencia: $('#telefono_emergencia').val() || null,
                estado: $('#estado').val()
            };
        } else {
            formData = {
                id_usuario: $('#id_usuario_select').val(),
                fecha_nacimiento: $('#fecha_nacimiento').val() || null,
                genero: $('#genero').val() || null,
                tipo_sangre: $('#tipo_sangre').val() || null,
                alergias: $('#alergias').val() || null,
                enfermedades_cronicas: $('#enfermedades_cronicas').val() || null,
                contacto_emergencia: $('#contacto_emergencia').val() || null,
                telefono_emergencia: $('#telefono_emergencia').val() || null,
            };
        }

        saveBtn.prop('disabled', true).find('#saveText').text('Guardando...');
        saveBtn.find('#saveSpinner').removeClass('d-none');

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(response => response.ok ? response.json() : response.json().then(err => Promise.reject(err)))
        .then(data => {
            table.ajax.reload(null, false);
            pacienteModal.hide();
            showAlert(data.message || 'Operación exitosa', 'success');
            updateCounters();
        })
        .catch(error => showAlert(error.error || 'Error al guardar el paciente', 'danger'))
        .finally(() => {
            saveBtn.prop('disabled', false).find('#saveText').text('Guardar');
            saveBtn.find('#saveSpinner').addClass('d-none');
        });
    };

    const toggleStatus = (id, currentStatus) => {
        const newStatus = currentStatus === 'A' ? 'I' : 'A';
        const actionText = newStatus === 'A' ? 'activar' : 'inactivar';

        if (!confirm(`¿Está seguro que desea ${actionText} a este paciente?`)) return;

        fetch(`/api/pacientes/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: newStatus })
        })
        .then(response => response.ok ? response.json() : response.json().then(err => Promise.reject(err)))
        .then(data => {
            table.ajax.reload(null, false);
            showAlert(data.message, 'success');
            updateCounters();
        })
        .catch(error => showAlert(error.error || 'Error al cambiar el estado', 'danger'));
    };

    // Iniciar la aplicación
    initialize();
});