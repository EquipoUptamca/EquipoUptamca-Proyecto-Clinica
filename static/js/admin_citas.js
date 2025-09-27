document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('citaModal');
    const addCitaBtn = document.getElementById('addCitaBtn');
    const closeModalBtn = document.querySelector('.close-btn');
    const cancelBtn = document.getElementById('cancelBtn');
    const citaForm = document.getElementById('citaForm');
    const tableBody = document.getElementById('citasTableBody');
    const loader = document.getElementById('table-loader');
    const searchInput = document.getElementById('searchInput');

    const pacienteSelect = document.getElementById('id_paciente');
    const medicoSelect = document.getElementById('id_medico');
    const fechaCitaInput = document.getElementById('fecha_cita');
    const horaCitaSelect = document.getElementById('hora_cita');

    let allCitas = [];

    // --- Cargar Datos para Selects del Modal ---
    async function loadSelectOptions() {
        try {
            // Cargar Pacientes
            const pacientesRes = await fetch('/api/pacientes');
            const pacientes = await pacientesRes.json();
            pacienteSelect.innerHTML = '<option value="">Seleccione un paciente...</option>';
            pacientes.pacientes.forEach(p => {
                pacienteSelect.innerHTML += `<option value="${p.id_paciente}">${p.nombre_completo}</option>`;
            });

            // Cargar Médicos
            const medicosRes = await fetch('/api/medicos');
            const medicos = await medicosRes.json();
            medicoSelect.innerHTML = '<option value="">Seleccione un médico...</option>';
            medicos.forEach(m => {
                medicoSelect.innerHTML += `<option value="${m.id_medico}">${m.nombre_completo} (${m.especialidad})</option>`;
            });
        } catch (error) {
            console.error('Error cargando opciones para el modal:', error);
        }
    }

    // --- Cargar Horas Disponibles ---
    async function loadAvailableHours() {
        const medicoId = medicoSelect.value;
        const fecha = fechaCitaInput.value;

        if (!medicoId || !fecha) {
            horaCitaSelect.innerHTML = '<option value="">Seleccione médico y fecha</option>';
            return;
        }

        try {
            horaCitaSelect.innerHTML = '<option value="">Cargando horas...</option>';
            const response = await fetch(`/api/horarios/disponibles?medico_id=${medicoId}&fecha=${fecha}`);
            const horas = await response.json();
            
            horaCitaSelect.innerHTML = '';
            if (horas.length > 0) {
                horas.forEach(hora => {
                    horaCitaSelect.innerHTML += `<option value="${hora}">${hora}</option>`;
                });
            } else {
                horaCitaSelect.innerHTML = '<option value="">No hay horas disponibles</option>';
            }
        } catch (error) {
            console.error('Error al cargar horas disponibles:', error);
            horaCitaSelect.innerHTML = '<option value="">Error al cargar</option>';
        }
    }

    medicoSelect.addEventListener('change', loadAvailableHours);
    fechaCitaInput.addEventListener('change', loadAvailableHours);

    // --- Cargar y Renderizar Citas ---
    async function fetchCitas() {
        loader.style.display = 'block';
        tableBody.innerHTML = '';
        try {
            // Asumimos que existe un endpoint /api/citas
            const response = await fetch('/api/citas'); 
            if (!response.ok) throw new Error('Error al obtener las citas');
            allCitas = await response.json();
            renderTable(allCitas);
        } catch (error) {
            console.error('Error fetching citas:', error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Error al cargar los datos.</td></tr>`;
        } finally {
            loader.style.display = 'none';
        }
    }

    function renderTable(citas) {
        tableBody.innerHTML = '';
        document.getElementById('no-results').style.display = citas.length === 0 ? 'block' : 'none';

        citas.forEach(cita => {
            const statusClass = cita.estado_cita.toLowerCase().replace(' ', '-');
            const row = `
                <tr>
                    <td>${cita.nombre_paciente}</td>
                    <td>${cita.nombre_medico}</td>
                    <td>${new Date(cita.fecha_cita).toLocaleDateString()}</td>
                    <td>${cita.hora_cita}</td>
                    <td><span class="status-badge ${statusClass}">${cita.estado_cita}</span></td>
                    <td class="action-btns">
                        <button class="edit-btn" data-id="${cita.id_cita}"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn" data-id="${cita.id_cita}"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    // --- Lógica del Modal ---
    function openModal(cita = null) {
        citaForm.reset();
        document.getElementById('modalTitle').textContent = cita ? 'Editar Cita' : 'Agendar Nueva Cita';
        horaCitaSelect.innerHTML = '<option value="">Seleccione un médico y fecha</option>';
        
        if (cita) {
            document.getElementById('citaId').value = cita.id_cita;
            pacienteSelect.value = cita.id_paciente;
            medicoSelect.value = cita.id_medico;
            fechaCitaInput.value = cita.fecha_cita.split('T')[0];
            // Cargar horas y luego seleccionar la correcta
            loadAvailableHours().then(() => {
                horaCitaSelect.value = cita.hora_cita;
            });
            document.getElementById('estado_cita').value = cita.estado_cita;
            document.getElementById('observaciones').value = cita.observaciones || '';
        } else {
            document.getElementById('citaId').value = '';
        }
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    addCitaBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    // --- Búsqueda y Acciones ---
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredCitas = allCitas.filter(c => 
            c.nombre_paciente.toLowerCase().includes(searchTerm) ||
            c.nombre_medico.toLowerCase().includes(searchTerm)
        );
        renderTable(filteredCitas);
    });

    tableBody.addEventListener('click', async (e) => {
        if (e.target.closest('.edit-btn')) {
            const citaId = e.target.closest('.edit-btn').dataset.id;
            const cita = allCitas.find(c => c.id_cita == citaId);
            openModal(cita);
        }
        // Lógica para eliminar/cancelar cita aquí
    });

    // --- Envío del Formulario ---
    citaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Lógica para enviar datos a la API (crear o actualizar)
        // ...
        closeModal();
        fetchCitas();
    });

    // --- Carga Inicial ---
    loadSelectOptions();
    fetchCitas();
});