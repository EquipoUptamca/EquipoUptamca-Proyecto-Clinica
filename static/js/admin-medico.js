$(document).ready(function() {
    // 1. Cargar datos del usuario
    const loadUserData = () => {
        fetch('/api/user-data')
            .then(response => {
                if (!response.ok) throw new Error('Error al cargar datos de usuario');
                return response.json();
            })
            .then(data => {
                $('#username').text(data.nombre || 'Administrador');
                $('#userrole').text(data.rol || 'Admin');
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('Error al cargar datos de usuario', 'danger');
            });
    };

    // 2. Inicializar DataTable
    const initializeDataTable = () => {
        const table = $('#medicosTable').DataTable({
            ajax: {
                url: '/api/medicos',
                dataSrc: '',
                error: (xhr, error, thrown) => {
                    console.error('Error al cargar datos:', error);
                    showAlert('Error al cargar la lista de médicos', 'danger');
                }
            },
            columns: [
                { data: 'id_medico', className: 'fw-bold' },
                {
                    data: 'nombre_completo',
                    render: function(data, type, row) {
                        return `<span class="fw-semibold">${data}</span>`;
                    }
                },
                { data: 'especialidad' },
                { 
                    data: 'numero_colegiado',
                    render: data => data ? data : '<span class="text-muted">N/A</span>'
                },
                {
                    data: 'años_experiencia',
                    render: data => data > 0 ? `${data} años` : '<span class="text-muted">N/A</span>',
                    className: 'text-center'
                },
                {
                    data: 'telefono',
                    render: data => data ? `<a href="tel:${data}" class="text-decoration-none">${data}</a>` : '<span class="text-muted">No registrado</span>'
                },
                {
                    data: 'correo',
                    render: data => data ? `<a href="mailto:${data}" class="text-decoration-none">${data}</a>` : '<span class="text-muted">No registrado</span>'
                },
                {
                    data: 'estado',
                    render: function(data) {
                        const badgeClass = data === 'A' ? 'badge bg-success' : 'badge bg-danger';
                        const estadoText = data === 'A' ? 'Activo' : 'Inactivo';
                        return `<span class="badge ${badgeClass}">${estadoText}</span>`;
                    }
                },
                {
                    data: 'id_medico',
                    render: function(data, type, row) {
                        return `
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-outline-success action-btn edit-btn" data-id="${data}" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-primary action-btn schedule-btn" data-id="${data}" title="Gestionar horario">
                                    <i class="fas fa-calendar-alt"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger action-btn delete-btn" data-id="${data}" title="${row.estado === 'A' ? 'Desactivar' : 'Activar'}">
                                    <i class="fas ${row.estado === 'A' ? 'fa-user-slash' : 'fa-user-check'}"></i>
                                </button>
                            </div>
                        `;
                    },
                    orderable: false,
                    width: '150px'
                }
            ],
            language: {
                url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-ES.json'
            },
            responsive: true,
            order: [[1, 'asc']],
            dom: '<"top"<"row"<"col-md-6"l><"col-md-6"f>>>rt<"bottom"<"row"<"col-md-6"i><"col-md-6"p>>>',
            initComplete: function() {
                $('.dataTables_filter input').addClass('form-control');
                $('.dataTables_length select').addClass('form-select');
            },
            drawCallback: function() {
                const api = this.api();
                $('#totalMedicos').text(`${api.rows().count()} médicos`);
            }
        });

        return table;
    };

    // 3. Configurar filtros
    const setupFilters = (table) => {
        $('#filterEspecialidad').change(function() {
            const value = this.value;
            table.column(2).search(value ? '^' + value + '$' : '', true, false).draw();
        });

        $('#filterEstado').change(function() {
            const value = this.value;
            table.column(7).search(value ? '^' + value + '$' : '', true, false).draw();
        });

        $('#filterSearch').keyup(function() {
            table.search(this.value).draw();
        });

        $('#btnClearFilters').click(function() {
            $('#filterEspecialidad, #filterEstado').val('');
            $('#filterSearch').val('');
            table.search('').columns().search('').draw();
        });
    };

    // Cargar usuarios que pueden ser promovidos a médicos
    const loadUsuariosParaMedico = () => {
        const userSelect = $('#id_usuario');
        userSelect.html('<option value="">Cargando usuarios...</option>').prop('disabled', true);

        fetch('/api/usuarios-para-medico')
            .then(response => {
                if (!response.ok) throw new Error('Error al cargar usuarios');
                return response.json();
            })
            .then(users => {
                userSelect.html('<option value="">Seleccione un usuario</option>');
                if (users.length > 0) {
                    users.forEach(user => {
                        const option = $('<option>')
                            .val(user.id_usuario)
                            .text(`${user.nombre_completo} (C.I: ${user.cedula})`);
                        
                        // Almacenar datos adicionales en el elemento de la opción
                        option.data('telefono', user.telefono || '');
                        option.data('correo', user.gmail || '');

                        userSelect.append(option);
                    });
                }
                userSelect.prop('disabled', false);
            })
            .catch(error => {
                console.error('Error:', error);
                userSelect.html('<option value="">Error al cargar usuarios</option>');
            });
    };

   // ... (código anterior se mantiene igual)

// 4. Manejo del modal y formulario (VERSIÓN CORREGIDA)
const setupMedicoModal = (table) => {
    const medicoModal = new bootstrap.Modal('#medicoModal');
    const medicoForm = $('#medicoForm');
    
    // Autocompletar teléfono y correo al seleccionar usuario
    $('#id_usuario').change(function() {
        const selectedOption = $(this).find('option:selected');
        const telefono = selectedOption.data('telefono') || '';
        const correo = selectedOption.data('correo') || '';

        $('#telefono').val(telefono);
        $('#correo').val(correo);
    });
    
    // Validación del formulario (CORREGIDO)
    medicoForm.on('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Reiniciar validación
        $(this).removeClass('was-validated');
        
        // Validar campos obligatorios según el modo (crear/editar)
        let isValid = true;
        
        if ($('#id_medico').val()) {
            // Modo edición - validar nombre completo
            if (!$('#nombre_completo').val().trim()) {
                $('#nombre_completo').addClass('is-invalid');
                isValid = false;
            }
        } else {
            // Modo creación - validar selección de usuario
            if (!$('#id_usuario').val()) {
                $('#id_usuario').addClass('is-invalid');
                isValid = false;
            }
        }
        
        // Validar campos comunes
        if (!$('#id_especialidad').val()) {
            $('#id_especialidad').addClass('is-invalid');
            isValid = false;
        }
        
        if (!$('#numero_colegiado').val().trim()) {
            $('#numero_colegiado').addClass('is-invalid');
            isValid = false;
        }
        
        // Validar email si está presente
        const email = $('#correo').val().trim();
        if (email && !isValidEmail(email)) {
            $('#correo').addClass('is-invalid');
            isValid = false;
        }
        
        if (!isValid) {
            $(this).addClass('was-validated');
            return;
        }
        
        // Preparar datos para enviar
        const id = $('#id_medico').val();
        let formData = {
            id_especialidad: $('#id_especialidad').val(),
            numero_colegiado: $('#numero_colegiado').val().trim(),
            años_experiencia: $('#años_experiencia').val() || 0,
            telefono: $('#telefono').val().trim(),
            correo: email,
            estado: $('#estado').val()
        };

        if (id) {
            // Modo edición
            formData.nombre_completo = $('#nombre_completo').val().trim();
        } else {
            // Modo creación
            formData.id_usuario = $('#id_usuario').val();
        }

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/medicos/${id}` : '/api/medicos';
        
        // Mostrar estado de carga
        $('#saveSpinner').removeClass('d-none');
        $('#saveText').text('Guardando...');
        $('button[type="submit"]').prop('disabled', true);
        
        // Enviar datos
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { 
                    throw new Error(err.error || 'Error del servidor'); 
                });
            }
            return response.json();
        })
        .then(data => {
            table.ajax.reload(null, false);
            medicoModal.hide();
            showAlert(data.message || `Médico ${id ? 'actualizado' : 'creado'} exitosamente`, 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert(error.message || 'Error al guardar el médico', 'danger');
        })
        .finally(() => {
            $('#saveSpinner').addClass('d-none');
            $('#saveText').text('Guardar');
            $('button[type="submit"]').prop('disabled', false);
        });
    });

    // Nuevo médico (CORREGIDO)
    $('#nuevoMedicoBtn').click(function() {
        medicoForm[0].reset();
        medicoForm.removeClass('was-validated');
        $('.is-invalid').removeClass('is-invalid');
        
        $('#modalTitle').text('Nuevo Perfil de Médico');
        $('#id_medico').val('');
        $('#estado').val('A');
        
        // Mostrar selector de usuario y ocultar campo de nombre
        $('#usuarioSelectGroup').show();
        $('#nombreCompletoGroup').hide();
        loadUsuariosParaMedico();

        medicoModal.show();
    });

    // Editar médico (CORREGIDO)
    $('#medicosTable').on('click', '.edit-btn', function() {
        const id = $(this).data('id');
        fetch(`/api/medicos/${id}`)
            .then(response => {
                if (!response.ok) throw new Error('Médico no encontrado');
                return response.json();
            })
            .then(medico => {
                medicoForm[0].reset();
                medicoForm.removeClass('was-validated');
                $('.is-invalid').removeClass('is-invalid');
                
                $('#modalTitle').text(`Editar Médico: ${medico.nombre_completo}`);
                
                // Ocultar selector de usuario y mostrar campo de nombre
                $('#usuarioSelectGroup').hide();
                $('#nombreCompletoGroup').show();

                // Llenar el formulario
                $('#id_medico').val(medico.id_medico);
                $('#nombre_completo').val(medico.nombre_completo);
                $('#id_especialidad').val(medico.id_especialidad);
                $('#numero_colegiado').val(medico.numero_colegiado);
                $('#años_experiencia').val(medico.años_experiencia);
                $('#telefono').val(medico.telefono);
                $('#correo').val(medico.correo);
                $('#estado').val(medico.estado);

                medicoModal.show();
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert(error.message || 'Error al cargar datos del médico', 'danger');
            });
    });

    // Limpiar validación cuando se cambian los campos
    $('#medicoForm input, #medicoForm select').on('input change', function() {
        $(this).removeClass('is-invalid');
    });

    // Cerrar modal con el botón de cancelar o la 'X'
    $('#medicoModal .btn-secondary, #medicoModal .btn-close').click(function() {
        medicoModal.hide();
    });

    medicoModal._element.addEventListener('hidden.bs.modal', function () {
        medicoForm.removeClass('was-validated');
        $('.is-invalid').removeClass('is-invalid');
    });
};

// ... (el resto del código se mantiene igual)

    // 5. Manejo de acciones
    const setupActions = (table) => {
        // Eliminar/Activar médico
        $('#medicosTable').on('click', '.delete-btn', function(e) {
            e.stopPropagation();
            const id = $(this).data('id');
            const row = table.row($(this).closest('tr'));
            const medico = row.data();
            const action = medico.estado === 'A' ? 'desactivar' : 'activar';
            const actionText = medico.estado === 'A' ? 'desactivado' : 'activado';
            
            if (confirm(`¿Está seguro que desea ${action} este médico?`)) {
                fetch(`/api/medicos/${id}`, {
                    method: 'DELETE'
                })
                .then(response => {
                    if (!response.ok) return response.json().then(err => { throw err; });
                    return response.json();
                })
                .then(data => {
                    table.ajax.reload(null, false);
                    showAlert(data.message || `Médico ${actionText} correctamente`, 'success');
                })
                .catch(error => {
                    console.error('Error:', error);
                    showAlert(error.message || 'Error al cambiar estado del médico', 'danger');
                });
            }
        });

        // Redirigir a horarios
        $('#medicosTable').on('click', '.schedule-btn', function(e) {
            e.preventDefault();
            const id = $(this).data('id');
            if (id) {
                window.location.href = `/horarios?id=${id}`;
            }
        });

        // Seleccionar fila
        $('#medicosTable').on('click', 'tbody tr', function(e) {
            if (!$(e.target).is('button, a, input, select, textarea')) {
                const id = table.row(this).data().id_medico;
                $('.edit-btn[data-id="'+id+'"]').click();
            }
        });
    };

    // 6. Mostrar notificaciones
    const showAlert = (message, type) => {
        const alertId = 'alert-' + Date.now();
        const alert = $(`
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3" role="alert" style="z-index: 9999; min-width: 300px;">
                <div class="d-flex align-items-center">
                    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
                    <div>${message}</div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `);
        
        $('body').append(alert);
        
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                bootstrap.Alert.getOrCreateInstance(alertElement).close();
            }
        }, 5000);
    };

    // 7. Cargar especialidades dinámicamente
    const loadEspecialidades = () => {
        fetch('/api/medicos/especialidades')
            .then(response => {
                if (!response.ok) throw new Error('Error al cargar especialidades');
                return response.json();
            })
            .then(groupedEspecialidades => {
                const filterSelect = $('#filterEspecialidad');
                const modalSelect = $('#id_especialidad');
                
                // Limpiar opciones existentes (excepto la primera)
                filterSelect.find('option:not(:first)').remove();
                modalSelect.find('option:not(:first)').remove();

                // Iterar sobre el objeto de especialidades agrupadas
                for (const category in groupedEspecialidades) {
                    if (groupedEspecialidades.hasOwnProperty(category)) {
                        const optgroup = $('<optgroup>').attr('label', category);
                        
                        groupedEspecialidades[category].forEach(especialidad => {
                            // Añadir al filtro de la tabla (solo el nombre)
                            if (filterSelect.find(`option[value="${especialidad.nombre}"]`).length === 0) {
                                filterSelect.append($('<option>').val(especialidad.nombre).text(especialidad.nombre));
                            }
                            
                            // Añadir al select del modal (con id y nombre)
                            optgroup.append($('<option>').val(especialidad.id).text(especialidad.nombre));
                        });
                        modalSelect.append(optgroup);
                    }
                }
            })
            .catch(error => {
                console.error('Error al cargar especialidades:', error);
            });
    };

    // 8. Validación de formulario
    const setupFormValidation = () => {
        $('#telefono').on('input', function() {
            const value = $(this).val().replace(/\D/g, '');
            $(this).val(value);
        });

        $('#años_experiencia').on('input', function() {
            const value = $(this).val().replace(/\D/g, '');
            $(this).val(value);
        });

        $('#correo').on('blur', function() {
            const email = $(this).val();
            if (email && !isValidEmail(email)) {
                $(this).addClass('is-invalid');
            } else {
                $(this).removeClass('is-invalid');
            }
        });
    };

    // 9. Función auxiliar para validar email
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // 10. Inicializar tooltips
    const initializeTooltips = () => {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    };

    // Inicialización completa
    const initializeApp = () => {
        loadUserData();
        const table = initializeDataTable();
        setupFilters(table);
        setupMedicoModal(table);
        setupActions(table);
        loadEspecialidades();
        setupFormValidation();
        initializeTooltips();

        // Recargar tabla periódicamente
        setInterval(() => {
            table.ajax.reload(null, false);
        }, 300000);
    };

    // Iniciar la aplicación
    initializeApp();
});