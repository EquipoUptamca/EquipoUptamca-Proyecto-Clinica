document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('userModal');
    const addUserBtn = document.getElementById('addUserBtn');
    const closeModalBtn = document.querySelector('.close-btn');
    const cancelBtn = document.getElementById('cancelBtn');
    const userForm = document.getElementById('userForm');
    const tableBody = document.getElementById('usersTableBody');
    const loader = document.getElementById('table-loader');
    const searchInput = document.getElementById('searchInput');
    let allUsers = []; // Cache for user data

    // --- Cargar Roles en el Modal ---
    async function loadRoles() {
        try {
            const response = await fetch('/api/roles');
            const roles = await response.json();
            const roleSelect = document.getElementById('id_rol');
            roleSelect.innerHTML = '<option value="">Seleccione un rol...</option>';
            roles.forEach(role => {
                roleSelect.innerHTML += `<option value="${role.id_rol}">${role.nombre_rol}</option>`;
            });
        } catch (error) {
            console.error('Error al cargar roles:', error);
        }
    }

    // --- Cargar y Renderizar Usuarios ---
    async function fetchUsers() {
        loader.style.display = 'block';
        tableBody.innerHTML = '';
        try {
            // Asumimos que existe un endpoint /api/users que devuelve todos los usuarios
            const response = await fetch('/api/users'); 
            if (!response.ok) throw new Error('Error al obtener los usuarios');
            const data = await response.json();
            allUsers = data.users; // La API devuelve un objeto con una propiedad 'users'
            renderTable(allUsers); 
        } catch (error) {
            console.error('Error fetching users:', error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Error al cargar los datos.</td></tr>`;
        } finally {
            loader.style.display = 'none';
        }
    }

    function renderTable(users) {
        tableBody.innerHTML = '';
        if (users.length === 0) {
            document.getElementById('no-results').style.display = 'block';
            return;
        }
        document.getElementById('no-results').style.display = 'none';

        users.forEach(user => {
            const statusBadge = user.activo 
                ? '<span class="status-badge active">Activo</span>' 
                : '<span class="status-badge inactive">Inactivo</span>';

            const row = `
                <tr>
                    <td>${user.nombre_completo}</td>
                    <td>${user.usuario_login}</td>
                    <td>${user.cedula || 'N/A'}</td>
                    <td>${user.nombre_rol}</td>
                    <td>${statusBadge}</td>
                    <td class="action-btns">
                        <button class="edit-btn" data-id="${user.id_usuario}"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn" data-id="${user.id_usuario}"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    // --- Lógica del Modal ---
    function openModal(user = null) {
        userForm.reset();
        document.getElementById('modalTitle').textContent = user ? 'Editar Usuario' : 'Añadir Nuevo Usuario';
        if (user) {
            document.getElementById('userId').value = user.id_usuario;
            document.getElementById('nombre_completo').value = user.nombre_completo;
            document.getElementById('usuario_login').value = user.usuario_login;
            document.getElementById('cedula').value = user.cedula;
            document.getElementById('id_rol').value = user.id_rol;
            document.getElementById('contraseña').placeholder = "Dejar en blanco para no cambiar";
        } else {
            document.getElementById('userId').value = '';
            document.getElementById('contraseña').placeholder = "Contraseña requerida";
        }
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    addUserBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    // --- Búsqueda y Filtro ---
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredUsers = allUsers.filter(user => 
            user.nombre_completo.toLowerCase().includes(searchTerm) ||
            user.usuario_login.toLowerCase().includes(searchTerm) ||
            (user.cedula && user.cedula.toLowerCase().includes(searchTerm))
        );
        renderTable(filteredUsers);
    });

    // --- Acciones de la Tabla (Delegación de eventos) ---
    tableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const userId = editBtn.dataset.id;
            const user = allUsers.find(u => u.id_usuario == userId);
            if (user) {
                openModal(user);
            }
        }

        if (deleteBtn) {
            const userId = deleteBtn.dataset.id;
            const user = allUsers.find(u => u.id_usuario == userId);
            if (!user) return;

            // El endpoint DELETE en realidad desactiva al usuario (soft delete).
            if (confirm(`¿Está seguro de que desea desactivar al usuario "${user.nombre_completo}"?`)) {
                try {
                    const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'No se pudo desactivar el usuario.');
                    }
                    await fetchUsers(); // Recargar la tabla para mostrar el estado actualizado
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        }
    });

    // --- Envío del Formulario ---
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        const formData = new FormData(userForm);
        const userId = formData.get('id_usuario');
        const data = Object.fromEntries(formData.entries());

        // La contraseña no se envía si está vacía en modo edición
        if (userId && !data.contraseña) {
            delete data.contraseña;
        }

        const method = userId ? 'PUT' : 'POST';
        const url = userId ? `/api/users/${userId}` : '/api/users';
        
        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ocurrió un error al guardar.');
            }

            closeModal();
            fetchUsers(); // Recargar la tabla
            // Aquí podrías añadir una notificación de éxito.

        } catch (error) {
            // Mostrar error en el modal o con una alerta.
            alert(`Error: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar Cambios';
        }
    });

    // --- Carga Inicial ---
    loadRoles();
    fetchUsers();
});