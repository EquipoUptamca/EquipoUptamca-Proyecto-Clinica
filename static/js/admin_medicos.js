document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('medicoModal');
    const addMedicoBtn = document.getElementById('addMedicoBtn');
    const closeModalBtn = document.querySelector('.close-btn');
    const cancelBtn = document.getElementById('cancelBtn');
    const medicoForm = document.getElementById('medicoForm');
    const tableBody = document.getElementById('medicosTableBody');
    const loader = document.getElementById('table-loader');
    const searchInput = document.getElementById('searchInput');
    let allMedicos = []; // Cache para datos de médicos

    // --- Cargar y Renderizar Médicos ---
    async function fetchMedicos() {
        loader.style.display = 'block';
        tableBody.innerHTML = '';
        try {
            const response = await fetch('/api/medicos'); 
            if (!response.ok) throw new Error('Error al obtener los médicos');
            // La API de médicos devuelve un array directamente
            allMedicos = await response.json();
            renderTable(allMedicos);
        } catch (error) {
            console.error('Error fetching medicos:', error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Error al cargar los datos.</td></tr>`;
        } finally {
            loader.style.display = 'none';
        }
    }

    function renderTable(medicos) {
        tableBody.innerHTML = '';
        const noResults = document.getElementById('no-results');
        if (medicos.length === 0) {
            noResults.style.display = 'block';
            return;
        }
        noResults.style.display = 'none';

        medicos.forEach(medico => {
            const statusBadge = medico.estado === 'A'
                ? '<span class="status-badge active">Activo</span>' 
                : '<span class="status-badge inactive">Inactivo</span>';

            const row = `
                <tr>
                    <td>${medico.nombre_completo}</td>
                    <td>${medico.especialidad}</td>
                    <td>${medico.telefono || 'N/A'}</td>
                    <td>${medico.correo || 'N/A'}</td>
                    <td>${statusBadge}</td>
                    <td class="action-btns">
                        <button class="edit-btn" data-id="${medico.id_medico}"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn" data-id="${medico.id_medico}"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    // --- Lógica del Modal ---
    function openModal(medico = null) {
        medicoForm.reset();
        document.getElementById('modalTitle').textContent = medico ? 'Editar Médico' : 'Añadir Nuevo Médico';
        if (medico) {
            document.getElementById('medicoId').value = medico.id_medico;
            document.getElementById('nombre_completo').value = medico.nombre_completo;
            document.getElementById('especialidad').value = medico.especialidad;
            document.getElementById('telefono').value = medico.telefono;
            document.getElementById('correo').value = medico.correo;
            document.getElementById('estado').value = medico.estado;
        } else {
            document.getElementById('medicoId').value = '';
        }
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    addMedicoBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    // --- Búsqueda y Filtro ---
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredMedicos = allMedicos.filter(medico => 
            medico.nombre_completo.toLowerCase().includes(searchTerm) ||
            medico.especialidad.toLowerCase().includes(searchTerm)
        );
        renderTable(filteredMedicos);
    });

    // --- Acciones de la Tabla (Delegación de eventos) ---
    tableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const medicoId = editBtn.dataset.id;
            const response = await fetch(`/api/medicos/${medicoId}`);
            const medico = await response.json();
            openModal(medico);
        }

        if (deleteBtn) {
            const medicoId = deleteBtn.dataset.id;
            if (confirm('¿Está seguro de que desea cambiar el estado de este médico?')) {
                await fetch(`/api/medicos/${medicoId}`, { method: 'DELETE' });
                fetchMedicos();
            }
        }
    });

    // --- Envío del Formulario ---
    medicoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(medicoForm);
        const medicoId = formData.get('id_medico');
        const data = Object.fromEntries(formData.entries());

        const method = medicoId ? 'PUT' : 'POST';
        const url = medicoId ? `/api/medicos/${medicoId}` : '/api/medicos';
        
        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        
        closeModal();
        fetchMedicos();
    });

    // --- Carga Inicial ---
    fetchMedicos();
});