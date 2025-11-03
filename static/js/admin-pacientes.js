$(document).ready(function() {
    let table;
    const pacienteModal = new bootstrap.Modal('#pacienteModal');
    const pacienteForm = $('#pacienteForm');
    const saveBtn = $('#submitBtn');

    // --- Funciones de Utilidad ---
    const showAlert = (message, type = 'info') => {
        const alertContainer = $('#alertContainer');
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'danger' ? 'fa-exclamation-triangle' :
                    type === 'warning' ? 'fa-exclamation-circle' : 'fa-info-circle';
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
                { 
                    data: 'nombre_completo',
                    render: function(data, type, row) {
                        return data || '<span class="text-muted">No especificado</span>';
                    }
                },
                { 
                    data: 'cedula',
                    render: function(data, type, row) {
                        return data || '<span class="text-muted">No especificado</span>';
                    }
                },
                { 
                    data: 'telefono',
                    render: function(data, type, row) {
                        return data || '<span class="text-muted">No especificado</span>';
                    }
                },
                { 
                    data: 'gmail',
                    render: function(data, type, row) {
                        return data || '<span class="text-muted">No especificado</span>';
                    }
                },
                { 
                    data: 'estado', 
                    render: function(data, type, row) {
                        if (data === 'A') {
                            return '<span class="estado-badge estado-activo"><i class="fas fa-check-circle me-1"></i>Activo</span>';
                        } else if (data === 'I') {
                            return '<span class="estado-badge estado-inactivo"><i class="fas fa-times-circle me-1"></i>Inactivo</span>';
                        } else {
                            return '<span class="estado-badge" style="background: #f8f9fa; color: #6c757d; border-color: #dee2e6;">' + (data || 'Desconocido') + '</span>';
                        }
                    }
                },
                {
                    data: null,
                    render: (data, type, row) => {
                        const isActive = row.estado === 'A';
                        return `
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-action btn-edit edit-btn" data-id="${row.id_paciente}" title="Editar paciente">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-action btn-view view-btn" data-id="${row.id_paciente}" title="Ver detalles">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-action ${isActive ? 'btn-delete' : 'btn-success'} status-btn" 
                                        data-id="${row.id_paciente}" 
                                        data-estado="${row.estado}" 
                                        title="${isActive ? 'Inactivar paciente' : 'Activar paciente'}">
                                    <i class="fas ${isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
                                </button>
                            </div>
                        `;
                    },
                    orderable: false,
                    className: 'text-center'
                }
            ],
            language: { 
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json',
                emptyTable: "No hay datos disponibles en la tabla",
                info: "Mostrando _START_ a _END_ de _TOTAL_ pacientes",
                infoEmpty: "Mostrando 0 a 0 de 0 pacientes",
                infoFiltered: "(filtrado de _MAX_ pacientes totales)",
                search: "Buscar:",
                zeroRecords: "No se encontraron pacientes que coincidan con la búsqueda",
                paginate: {
                    first: "Primero",
                    last: "Último",
                    next: "Siguiente",
                    previous: "Anterior"
                }
            },
            order: [[1, 'asc']],
            initComplete: function() {
                updateCounters();
                // Aplicar estilos personalizados después de la inicialización
                this.api().columns.adjust().draw();
            },
            drawCallback: function() {
                // Actualizar contador de pacientes en el header de la tabla
                const total = this.api().data().length;
                const filtered = this.api().rows({ search: 'applied' }).count();
                $('#totalPacientes').text(`${filtered} de ${total} pacientes`);
            },
            // Configuración de botones para exportar
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>' +
                 'B',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: '<i class="fas fa-file-excel me-1"></i> Excel',
                    title: `Listado_de_Pacientes_${new Date().toISOString().slice(0,10)}`,
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5],
                        format: {
                            body: function(data, row, column, node) {
                                // Limpiar HTML de los estados para exportación
                                if (column === 5) {
                                    return data.includes('Activo') ? 'Activo' : 
                                           data.includes('Inactivo') ? 'Inactivo' : data;
                                }
                                return data;
                            }
                        }
                    },
                    className: 'btn btn-success btn-sm me-1'
                },
                {
                    extend: 'pdfHtml5',
                    text: '<i class="fas fa-file-pdf me-1"></i> PDF',
                    title: `Listado de Pacientes - ${new Date().toLocaleDateString()}`,
                    orientation: 'portrait',
                    pageSize: 'A4',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5],
                        format: {
                            body: function(data, row, column, node) {
                                // Limpiar HTML de los estados para exportación
                                if (column === 5) {
                                    return data.includes('Activo') ? 'Activo' : 
                                           data.includes('Inactivo') ? 'Inactivo' : data;
                                }
                                return data;
                            }
                        }
                    },
                    customize: function (doc) {
                        doc.content[1].table.widths = ['30%', '20%', '15%', '20%', '15%'];
                        doc.defaultStyle.fontSize = 10;
                        doc.styles.tableHeader.fontSize = 11;
                        doc.styles.tableHeader.fillColor = '#1a936f';
                        doc.styles.title.fontSize = 14;
                        doc.styles.title.alignment = 'center';
                        doc.pageMargins = [40, 60, 40, 60];
                    },
                    className: 'btn btn-danger btn-sm me-1'
                },
                {
                    extend: 'print',
                    text: '<i class="fas fa-print me-1"></i> Imprimir',
                    title: 'Listado de Pacientes',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5],
                        format: {
                            body: function(data, row, column, node) {
                                // Limpiar HTML de los estados para exportación
                                if (column === 5) {
                                    return data.includes('Activo') ? 'Activo' : 
                                           data.includes('Inactivo') ? 'Inactivo' : data;
                                }
                                return data;
                            }
                        }
                    },
                    customize: function (win) {
                        $(win.document.body).find('table').addClass('table table-sm table-bordered');
                        $(win.document.body).find('h1').css('text-align', 'center').css('font-size', '16pt');
                        $(win.document.body).find('.estado-badge').removeClass('estado-badge estado-activo estado-inactivo');
                    },
                    className: 'btn btn-info btn-sm'
                }
            ]
        });

        // Event Listeners para filtros
        $('#filterEstado, #filterFechaDesde, #filterFechaHasta').on('change', () => table.draw());
        
        let searchTimeout;
        $('#filterSearch').on('keyup', function() {
            clearTimeout(searchTimeout);
            const that = this;
            searchTimeout = setTimeout(() => {
                table.search(that.value).draw();
            }, 300);
        });

        $('#btnClearFilters').on('click', function() {
            $('#filterEstado').val('');
            $('#filterFechaDesde').val('');
            $('#filterFechaHasta').val('');
            $('#filterSearch').val('');
            table.search('').draw();
        });

        // Event Listeners para acciones de la tabla
        $('#pacientesTable tbody').on('click', '.edit-btn', function() {
            const id = $(this).data('id');
            openModalForEdit(id);
        });

        $('#pacientesTable tbody').on('click', '.view-btn', function() {
            const id = $(this).data('id');
            viewPacienteDetails(id);
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
            const $icon = $(this).find('i');
            $icon.addClass('fa-spin');
            table.ajax.reload(() => {
                updateCounters();
                $icon.removeClass('fa-spin');
                showAlert('Datos actualizados correctamente', 'success');
            }, false);
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
                showAlert('Error al cargar la lista de usuarios', 'danger');
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

    const viewPacienteDetails = (id) => {
        fetch(`/api/pacientes/${id}`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar paciente'))
            .then(paciente => {
                // Aquí puedes implementar un modal de solo lectura para ver detalles
                // Por ahora, mostramos la información en un alert
                const detalles = `
Nombre: ${paciente.nombre_completo || 'No especificado'}
Cédula: ${paciente.cedula || 'No especificado'}
Teléfono: ${paciente.telefono || 'No especificado'}
Email: ${paciente.gmail || 'No especificado'}
Estado: ${paciente.estado === 'A' ? 'Activo' : 'Inactivo'}
Fecha Nacimiento: ${paciente.fecha_nacimiento || 'No especificado'}
Género: ${paciente.genero === 'M' ? 'Masculino' : paciente.genero === 'F' ? 'Femenino' : 'Otro'}
Tipo Sangre: ${paciente.tipo_sangre || 'No especificado'}
                `.trim();
                
                showAlert(`Detalles del paciente:\n${detalles}`, 'info');
            })
            .catch(error => showAlert('Error al cargar detalles del paciente', 'danger'));
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
        const actionTextCapitalized = newStatus === 'A' ? 'Activar' : 'Inactivar';

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