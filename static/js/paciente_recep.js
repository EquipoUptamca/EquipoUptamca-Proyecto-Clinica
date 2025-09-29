document.addEventListener('DOMContentLoaded', function () {
    const API_URL = 'http://127.0.0.1:5000'; // Asegúrate que la URL de tu API sea correcta

    // --- SELECTORES DEL DOM ---
    const pacienteModal = new bootstrap.Modal(document.getElementById('pacienteModal'));
    const pacienteForm = document.getElementById('pacienteForm');
    const modalTitle = document.getElementById('modalTitle');
    const btnGuardar = document.getElementById('btnGuardar');
    const spinner = btnGuardar.querySelector('.spinner-border');
    const alertContainerModal = document.getElementById('alert-container-modal');

    let dataTable;
    let currentEditingUserId = null;
    let currentEditingPatientId = null;

    // --- CONFIGURACIÓN DE DATATABLES ---
    function initializeDataTable() {
        dataTable = $('#pacientesTable').DataTable({
            "ajax": {
                "url": `${API_URL}/api/pacientes/all`,
                "dataSrc": "" // La respuesta es un array de objetos
            },
            "columns": [
                { "data": "nombre_completo" },
                { "data": "cedula" },
                { "data": "telefono", "defaultContent": "<em>N/A</em>" },
                { "data": "gmail", "defaultContent": "<em>N/A</em>" },
                {
                    "data": "activo",
                    "render": function (data, type, row) {
                        const statusClass = data ? 'bg-success' : 'bg-danger';
                        const statusText = data ? 'Activo' : 'Inactivo';
                        return `<span class="badge ${statusClass}">${statusText}</span>`;
                    }
                },
                {
                    "data": "id_usuario",
                    "render": function (data, type, row) {
                        return `
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-primary btn-edit" data-id="${data}" title="Editar Paciente">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-info btn-complete" data-id="${row.id_paciente}" data-user-id="${data}" title="Completar Perfil Clínico">
                                    <i class="fas fa-notes-medical"></i>
                                </button>
                                <button class="btn btn-sm btn-danger btn-delete" data-id="${data}" title="Desactivar Paciente">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        `;
                    },
                    "orderable": false,
                    "searchable": false,
                    "width": "100px"
                }
            ],
            "language": {
                "url": "https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json"
            },
            "drawCallback": function(settings) {
                // Actualizar contador de pacientes
                const total = settings.fnRecordsDisplay();
                $('#totalPacientes').text(`${total} paciente(s)`);
            },
            "responsive": true,
            "autoWidth": false
        });
    }

    // --- MANEJO DE NOTIFICACIONES ---
    function showAlert(message, type = 'danger') {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertContainerModal.innerHTML = ''; // Limpiar alertas previas
        alertContainerModal.append(wrapper);
    }

    // --- LÓGICA DEL MODAL ---
    function setupCreateModal() {
        currentEditingUserId = null;
        currentEditingPatientId = null;
        pacienteForm.reset();
        pacienteForm.classList.remove('was-validated');
        alertContainerModal.innerHTML = '';
        modalTitle.innerHTML = '<i class="fas fa-user-plus me-2"></i> Registrar Nuevo Paciente';
        document.getElementById('contraseña').required = true;
        document.getElementById('contraseña').parentElement.style.display = 'block';
        $('#datos-usuario-tab').tab('show'); // Mostrar la primera pestaña
        $('#info-medica-tab').hide(); // Ocultar pestaña de info médica
        btnGuardar.textContent = 'Guardar Paciente';
        pacienteModal.show();
    }

    function setupEditModal(userId) {
        const patientData = dataTable.rows().data().toArray().find(p => p.id_usuario === userId);
        if (!patientData) {
            console.error("No se encontraron datos para el paciente con ID:", userId);
            return;
        }

        currentEditingUserId = userId;
        currentEditingPatientId = patientData.id_paciente;
        pacienteForm.reset();
        pacienteForm.classList.remove('was-validated');
        alertContainerModal.innerHTML = '';
        modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i> Editar Paciente';

        // Llenar formulario
        $('#nombre_completo').val(patientData.nombre_completo);
        $('#cedula').val(patientData.cedula).prop('disabled', true);
        $('#usuario_login').val(patientData.cedula).prop('disabled', true); // Usamos cédula como usuario por defecto
        $('#telefono').val(patientData.telefono);
        $('#gmail').val(patientData.gmail);

        // Ocultar campo de contraseña, no es requerido para editar
        document.getElementById('contraseña').required = false;
        document.getElementById('contraseña').parentElement.style.display = 'none';
        
        $('#datos-usuario-tab').tab('show');
        $('#info-medica-tab').hide();
        
        btnGuardar.textContent = 'Guardar Cambios';
        pacienteModal.show();
    }

    function resetModalState() {
        // Habilitar todos los campos antes de un nuevo uso
        $('#pacienteForm input, #pacienteForm select, #pacienteForm textarea').prop('disabled', false);
        // Limpiar el formulario
        pacienteForm.reset();
        pacienteForm.classList.remove('was-validated');
    }

    async function setupCompleteProfileModal(patientId, userId) {
        try {
            const response = await fetch(`${API_URL}/api/pacientes/${patientId}`);
            if (!response.ok) throw new Error('No se pudo cargar la información del paciente.');
            const patientData = await response.json();

            currentEditingUserId = userId;
            currentEditingPatientId = patientId;
            resetModalState();
            pacienteForm.classList.remove('was-validated');
            alertContainerModal.innerHTML = '';
            modalTitle.innerHTML = '<i class="fas fa-notes-medical me-2"></i> Completar Perfil Clínico';

            // Pestaña 1: Datos de Usuario (solo lectura)
            $('#nombre_completo').val(patientData.nombre_completo).prop('disabled', false);
            $('#cedula').val(patientData.cedula).prop('disabled', true);
            $('#usuario_login').val(patientData.cedula).prop('disabled', true);
            $('#telefono').val(patientData.telefono).prop('disabled', false);
            $('#gmail').val(patientData.gmail || '').prop('disabled', false);
            document.getElementById('contraseña').parentElement.style.display = 'none';

            // Pestaña 2: Información Médica (editable)
            $('#fecha_nacimiento').val(patientData.fecha_nacimiento);
            $('#genero').val(patientData.genero);
            $('#tipo_sangre').val(patientData.tipo_sangre);
            $('#alergias').val(patientData.alergias);
            $('#enfermedades_cronicas').val(patientData.enfermedades_cronicas);
            $('#contacto_emergencia').val(patientData.contacto_emergencia);
            $('#telefono_emergencia').val(patientData.telefono_emergencia);

            $('#info-medica-tab').show();
            $('#datos-usuario-tab').tab('show');
            btnGuardar.textContent = 'Guardar Perfil';
            pacienteModal.show();

        } catch (error) {
            alert(error.message);
        }
    }
    // --- OPERACIONES CRUD (Crear, Leer, Actualizar, Borrar) ---

    async function handleFormSubmit(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!pacienteForm.checkValidity()) {
            pacienteForm.classList.add('was-validated');
            return;
        }

        spinner.classList.remove('d-none');
        btnGuardar.disabled = true;

        let url, method, data;

        if (currentEditingPatientId) { // Editando perfil completo o solo datos de usuario básicos
            url = `${API_URL}/api/pacientes/${currentEditingPatientId}`;
            method = 'PUT';
            data = { // Se envían todos los campos, el backend se encarga de actualizar
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
            };
            // El backend no espera estos campos para una actualización de paciente
            delete data.cedula;
            delete data.usuario_login;
            delete data.contraseña;

        } else { // Creando nuevo usuario/paciente
            url = `${API_URL}/api/users`;
            method = 'POST';
            data = {
                nombre_completo: document.getElementById('nombre_completo').value,
                cedula: document.getElementById('cedula').value,
                usuario_login: document.getElementById('usuario_login').value,
                contraseña: document.getElementById('contraseña').value,
                telefono: document.getElementById('telefono').value,
                gmail: document.getElementById('gmail').value,
                id_rol: 4, // Rol de Paciente
                tipo_usuario: 'paciente', // ¡¡¡ESTA LÍNEA ES LA SOLUCIÓN CLAVE!!!
                activo: true
            };
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ocurrió un error desconocido.');
            }

            pacienteModal.hide();
            dataTable.ajax.reload(); // Recargar la tabla
            // Aquí podrías usar una notificación más elegante (ej. SweetAlert2)
            alert(result.message);

        } catch (error) {
            showAlert(error.message, 'danger');
        } finally {
            spinner.classList.add('d-none');
            btnGuardar.disabled = false;
        }
    }

    async function deletePatient(userId) {
        if (!confirm('¿Está seguro de que desea desactivar a este paciente?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/users/${userId}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            dataTable.ajax.reload();
            alert(result.message);

        } catch (error) {
            alert('Error al desactivar el paciente: ' + error.message);
        }
    }

    // --- ASIGNACIÓN DE EVENTOS ---

    // Botón para abrir modal de nuevo paciente
    $('#btnNuevoPaciente').on('click', setupCreateModal);

    // Enviar formulario
    pacienteForm.addEventListener('submit', handleFormSubmit);

    // Botones de editar y eliminar (delegación de eventos)
    $('#pacientesTable tbody').on('click', '.btn-edit', function () {
        const userId = $(this).data('id');
        setupEditModal(userId);
    });

    $('#pacientesTable tbody').on('click', '.btn-complete', function () {
        const patientId = $(this).data('id');
        const userId = $(this).data('user-id');
        setupCompleteProfileModal(patientId, userId);
    });

    $('#pacientesTable tbody').on('click', '.btn-delete', function () {
        const userId = $(this).data('id');
        deletePatient(userId);
    });

    // Filtros de la tabla
    $('#filterSearch').on('keyup', function () {
        dataTable.search(this.value).draw();
    });

    $('#filterEstado').on('change', function () {
        const status = this.value;
        if (status === 'A') {
            dataTable.column(4).search('Activo').draw();
        } else if (status === 'I') {
            dataTable.column(4).search('Inactivo').draw();
        } else {
            dataTable.column(4).search('').draw();
        }
    });

    $('#btnClearFilters').on('click', function() {
        $('#filterSearch').val('');
        $('#filterEstado').val('A').change(); // Volver a activos por defecto
        dataTable.search('').columns().search('').draw();
    });

    // --- INICIALIZACIÓN ---
    initializeDataTable();
    $('#filterEstado').trigger('change'); // Aplicar filtro inicial de "Activos"
});