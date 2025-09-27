document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('pacienteModal');
    const addPacienteBtn = document.getElementById('addPacienteBtn');
    const closeModalBtn = document.querySelector('.close-btn');
    const cancelBtn = document.getElementById('cancelBtn');
    const pacienteForm = document.getElementById('pacienteForm');
    const tableBody = document.getElementById('pacientesTableBody');
    const loader = document.getElementById('table-loader');
    const searchInput = document.getElementById('searchInput');
    const noResults = document.getElementById('no-results');
    let allPacientes = []; // Cache para datos de pacientes

    // --- Cargar y Renderizar Pacientes ---
    async function fetchPacientes() {
        loader.style.display = 'block';
        tableBody.innerHTML = '';
        noResults.style.display = 'none';
        
        try {
            const response = await fetch('/api/pacientes/detallados'); 
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al obtener los pacientes');
            }
            
            const pacientesList = await response.json();
            allPacientes = pacientesList || [];

            renderTable(allPacientes);
        } catch (error) {
            console.error('Error fetching pacientes:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; color:red; padding:20px;">
                        Error al cargar los datos: ${error.message}
                    </td>
                </tr>
            `;
        } finally {
            loader.style.display = 'none';
        }
    }

    function renderTable(pacientes) {
        tableBody.innerHTML = '';
        
        if (pacientes.length === 0) {
            noResults.style.display = 'block';
            return;
        }
        
        noResults.style.display = 'none';

        pacientes.forEach(paciente => {
            const statusBadge = paciente.estado === 'A'
                ? '<span class="status-badge active">Activo</span>' 
                : '<span class="status-badge inactive">Inactivo</span>';

            const fechaNac = paciente.fecha_nacimiento 
                ? new Date(paciente.fecha_nacimiento).toLocaleDateString('es-ES')
                : 'N/A';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(paciente.nombre_completo || '')}</td>
                <td>${escapeHtml(paciente.cedula || '')}</td>
                <td>${escapeHtml(paciente.telefono || 'N/A')}</td>
                <td>${fechaNac}</td>
                <td>${statusBadge}</td>
                <td class="action-btns">
                    <button class="edit-btn" data-id="${paciente.id_paciente}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" data-id="${paciente.id_paciente}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Función auxiliar para escapar HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Lógica del Modal ---
    function openModal(paciente = null) {
        pacienteForm.reset();
        document.getElementById('modalTitle').textContent = paciente ? 'Editar Paciente' : 'Añadir Nuevo Paciente';
        
        if (paciente) {
            document.getElementById('pacienteId').value = paciente.id_paciente;
            document.getElementById('nombre_completo').value = paciente.nombre_completo || '';
            document.getElementById('cedula').value = paciente.cedula || '';
            document.getElementById('fecha_nacimiento').value = paciente.fecha_nacimiento ? paciente.fecha_nacimiento.split('T')[0] : '';
            document.getElementById('genero').value = paciente.genero || '';
            document.getElementById('telefono').value = paciente.telefono || '';
            document.getElementById('correo').value = paciente.correo || '';
            document.getElementById('direccion').value = paciente.direccion || '';
            document.getElementById('estado').value = paciente.estado || 'A';
            document.getElementById('tipo_sangre').value = paciente.tipo_sangre || '';
        } else {
            document.getElementById('pacienteId').value = '';
            document.getElementById('estado').value = 'A';
        }
        
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    addPacienteBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    // --- Búsqueda y Filtro ---
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredPacientes = allPacientes.filter(p => 
            (p.nombre_completo && p.nombre_completo.toLowerCase().includes(searchTerm)) ||
            (p.cedula && p.cedula.toLowerCase().includes(searchTerm)) ||
            (p.telefono && p.telefono.toLowerCase().includes(searchTerm))
        );
        renderTable(filteredPacientes);
    });

    // --- Acciones de la Tabla (Delegación de eventos) ---
    tableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            try {
                const pacienteId = editBtn.dataset.id;
                const response = await fetch(`/api/pacientes/${pacienteId}`);
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error al cargar paciente');
                }
                
                const paciente = await response.json();
                openModal(paciente);
            } catch (error) {
                console.error('Error:', error);
                alert('Error al cargar los datos del paciente: ' + error.message);
            }
        }

        if (deleteBtn) {
            const pacienteId = deleteBtn.dataset.id;
            const paciente = allPacientes.find(p => p.id_paciente == pacienteId);
            const pacienteNombre = paciente ? paciente.nombre_completo : 'este paciente';
            
            if (confirm(`¿Está seguro de que desea inactivar a ${pacienteNombre}?`)) {
                try {
                    const response = await fetch(`/api/pacientes/${pacienteId}`, { 
                        method: 'DELETE' 
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Error al eliminar paciente');
                    }
                    
                    await fetchPacientes();
                    alert('Paciente inactivado correctamente');
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error: ' + error.message);
                }
            }
        }
    });

    // --- Envío del Formulario ---
    pacienteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Guardando...';
        saveBtn.disabled = true;
        
        try {
            const formData = new FormData(pacienteForm);
            const pacienteId = formData.get('id_paciente');
            const data = Object.fromEntries(formData.entries());

            // Limpiar campos opcionales vacíos para no enviar strings vacíos
            for (const key in data) {
                if (data[key] === '') data[key] = null;
            }

            // Validación básica
            if (!data.nombre_completo || !data.cedula) {
                throw new Error('Nombre completo y cédula son campos obligatorios');
            }

            const method = pacienteId ? 'PUT' : 'POST';
            const url = pacienteId ? `/api/pacientes/${pacienteId}` : '/api/pacientes';
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al guardar paciente');
            }
            
            closeModal();
            await fetchPacientes();
            alert(pacienteId ? 'Paciente actualizado correctamente' : 'Paciente creado correctamente');
        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    });

    // --- Carga Inicial ---
    fetchPacientes();
});