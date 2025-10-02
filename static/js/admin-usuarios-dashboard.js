document.addEventListener('DOMContentLoaded', function() {
    // Configuración
    const config = {
        usersPerPage: 10,
        apiBaseUrl: '/api/users',
        debounceTime: 500
    };

    // Estado de la aplicación
    const state = {
        currentPage: 1,
        totalUsers: 0,
        usersData: [],
        currentAction: '',
        selectedUserId: null,
        searchTerm: '',
        roleFilter: '',
        statusFilter: ''
    };

    // Elementos del DOM
    const elements = {
        usersTable: document.getElementById('usersTable'),
        userCount: document.getElementById('userCount'),
        pagination: document.getElementById('pagination'),
        searchInput: document.getElementById('searchInput'),
        searchBtn: document.getElementById('searchBtn'),
        roleFilter: document.getElementById('roleFilter'),
        statusFilter: document.getElementById('statusFilter'),
        userModal: new bootstrap.Modal(document.getElementById('userModal')),
        confirmModal: new bootstrap.Modal(document.getElementById('confirmModal')),
        saveUserBtn: document.getElementById('saveUserBtn'),
        confirmActionBtn: document.getElementById('confirmActionBtn'),
        userForm: document.getElementById('userForm'),
        addUserBtn: document.getElementById('addUserBtn'),
        nombreCompleto: document.getElementById('nombre_completo'),
        usuarioLogin: document.getElementById('usuario_login'),
        cedula: document.getElementById('cedula'),
        telefono: document.getElementById('telefono'),
        gmail: document.getElementById('gmail'),
        idRol: document.getElementById('id_rol'),
        activo: document.getElementById('activo'),
        contraseña: document.getElementById('contraseña'),
        confirmPassword: document.getElementById('confirm_password')
    };

    // Inicializar
    init();

    function init() {
        loadUsers();
        setupEventListeners();
        setupFormValidation();
    }

    function setupEventListeners() {
        // Búsqueda
        elements.searchBtn.addEventListener('click', handleSearch);
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        
        // Debounce para búsqueda mientras se escribe
        let debounceTimer;
        elements.searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(handleSearch, config.debounceTime);
        });

        // Filtros
        elements.roleFilter.addEventListener('change', handleFilterChange);
        elements.statusFilter.addEventListener('change', handleFilterChange);

        // Botones - CORREGIDO
        elements.addUserBtn.addEventListener('click', openAddUserModal);
        
        // CORRECCIÓN PRINCIPAL: Conectar el botón guardar correctamente
        elements.saveUserBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveUser(e);
        });
        
        // También conectar el evento submit del formulario
        elements.userForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveUser(e);
        });
        
        elements.confirmActionBtn.addEventListener('click', executeAction);
    }

    function setupFormValidation() {
        // Validación de cédula (8 dígitos)
        elements.cedula.addEventListener('input', function() {
            const value = this.value.trim();
            if (value && (!/^\d{8}$/.test(value))) {
                this.setCustomValidity('La cédula debe tener 8 dígitos numéricos');
            } else {
                this.setCustomValidity('');
            }
        });

        // Validación de teléfono (7-12 dígitos)
        elements.telefono.addEventListener('input', function() {
            const value = this.value.trim();
            if (value && (!/^\d{7,12}$/.test(value))) {
                this.setCustomValidity('El teléfono debe tener entre 7 y 12 dígitos');
            } else {
                this.setCustomValidity('');
            }
        });

        // Validación de email
        elements.gmail.addEventListener('input', function() {
            const value = this.value.trim();
            if (value && !/^[^@]+@[^@]+\.[^@]+$/.test(value)) {
                this.setCustomValidity('Ingrese un email válido');
            } else {
                this.setCustomValidity('');
            }
        });

        // Validación de nombre de usuario (máx 50 caracteres)
        elements.usuarioLogin.addEventListener('input', function() {
            if (this.value.length > 50) {
                this.setCustomValidity('Máximo 50 caracteres');
            } else {
                this.setCustomValidity('');
            }
        });

        // Validación de nombre completo (máx 100 caracteres)
        elements.nombreCompleto.addEventListener('input', function() {
            if (this.value.length > 100) {
                this.setCustomValidity('Máximo 100 caracteres');
            } else {
                this.setCustomValidity('');
            }
        });

        // Validación de contraseña en tiempo real
        elements.contraseña.addEventListener('input', function() {
            const value = this.value;
            if (value && value.length < 8) {
                this.setCustomValidity('La contraseña debe tener al menos 8 caracteres');
            } else {
                this.setCustomValidity('');
            }
        });

        // Validación de confirmación de contraseña
        elements.confirmPassword.addEventListener('input', function() {
            const password = elements.contraseña.value;
            const confirmPassword = this.value;
            if (password !== confirmPassword) {
                this.setCustomValidity('Las contraseñas no coinciden');
            } else {
                this.setCustomValidity('');
            }
        });
    }

    function handleSearch() {
        state.currentPage = 1;
        state.searchTerm = elements.searchInput.value.trim();
        loadUsers();
    }

    function handleFilterChange() {
        state.currentPage = 1;
        state.roleFilter = elements.roleFilter.value;
        state.statusFilter = elements.statusFilter.value;
        loadUsers();
    }

    function loadUsers() {
        showLoadingSpinner();
        
        const queryParams = new URLSearchParams({
            page: state.currentPage,
            per_page: config.usersPerPage,
            search: state.searchTerm,
            role_id: state.roleFilter,
            status: state.statusFilter
        });

        fetch(`${config.apiBaseUrl}?${queryParams}`)
            .then(response => {
                if (!response.ok) throw new Error('Error al cargar usuarios');
                return response.json();
            })
            .then(data => {
                state.usersData = data.users;
                state.totalUsers = data.total;
                updateUI(data);
            })
            .catch(error => {
                console.error('Error:', error);
                showError('Error al cargar usuarios');
            });
    }

    function updateUI(data) {
        elements.userCount.textContent = data.total;
        renderUsers(data.users);
        renderPagination(data.total_pages);
    }

    function showLoadingSpinner() {
        const tbody = elements.usersTable.querySelector('tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-2 text-muted">Cargando usuarios...</p>
                </td>
            </tr>
        `;
    }

    function showError(message) {
        const tbody = elements.usersTable.querySelector('tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>${message}
                </td>
            </tr>
        `;
    }

    function renderUsers(users) {
        const tbody = elements.usersTable.querySelector('tbody');
        
        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="fas fa-users me-2"></i>No se encontraron usuarios
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id_usuario}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.nombre_completo)}&background=1a936f&color=fff" 
                             class="user-avatar rounded-circle me-2" alt="${user.nombre_completo}" width="32" height="32">
                        <span>${user.usuario_login}</span>
                    </div>
                </td>
                <td>${user.nombre_completo}</td>
                <td>${user.cedula}</td>
                <td>
                    <span class="badge ${getRoleBadgeClass(user.id_rol)}">
                        ${getRoleText(user.id_rol)}
                    </span>
                </td>
                <td>
                    <span class="badge ${user.activo ? 'bg-success' : 'bg-secondary'}">
                        <i class="fas ${user.activo ? 'fa-check' : 'fa-times'} me-1"></i>
                        ${user.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary edit-btn" data-id="${user.id_usuario}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-btn" data-id="${user.id_usuario}" title="Eliminar">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        <button class="btn btn-outline-secondary status-btn" data-id="${user.id_usuario}" title="${user.activo ? 'Desactivar' : 'Activar'}">
                            <i class="fas fa-power-off"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Agregar event listeners a los botones
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => editUser(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => confirmAction('delete', btn.dataset.id));
        });
        
        document.querySelectorAll('.status-btn').forEach(btn => {
            btn.addEventListener('click', () => confirmAction('toggleStatus', btn.dataset.id));
        });
    }

    function getRoleText(roleId) {
        const roles = {
            1: 'Administrador',
            2: 'Médico',
            3: 'Recepción',
            4: 'Paciente'
        };
        return roles[roleId] || 'Desconocido';
    }

    function getRoleBadgeClass(roleId) {
        const classes = {
            1: 'bg-danger',
            2: 'bg-primary',
            3: 'bg-warning text-dark',
            4: 'bg-info text-dark'
        };
        return classes[roleId] || 'bg-secondary';
    }

    function renderPagination(totalPages) {
        elements.pagination.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // Botón Anterior
        const prevLi = createPaginationItem(
            '&laquo;',
            state.currentPage === 1,
            () => {
                if (state.currentPage > 1) {
                    state.currentPage--;
                    loadUsers();
                }
            }
        );
        elements.pagination.appendChild(prevLi);
        
        // Números de página
        const maxVisiblePages = 5;
        let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageLi = createPaginationItem(
                i,
                i === state.currentPage,
                () => {
                    state.currentPage = i;
                    loadUsers();
                }
            );
            elements.pagination.appendChild(pageLi);
        }
        
        // Botón Siguiente
        const nextLi = createPaginationItem(
            '&raquo;',
            state.currentPage === totalPages,
            () => {
                if (state.currentPage < totalPages) {
                    state.currentPage++;
                    loadUsers();
                }
            }
        );
        elements.pagination.appendChild(nextLi);
    }

    function createPaginationItem(content, isActive, onClick) {
        const li = document.createElement('li');
        li.className = `page-item ${isActive ? 'active' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.innerHTML = content;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (!isActive) onClick();
        });
        
        li.appendChild(a);
        return li;
    }

    function openAddUserModal() {
        document.getElementById('userModalLabel').innerHTML = '<i class="fas fa-user-plus me-2"></i> Nuevo Usuario';
        elements.userForm.reset();
        document.getElementById('userId').value = '';
        elements.contraseña.required = true;
        elements.confirmPassword.required = true;
        elements.activo.checked = true;
        
        // Limpiar mensajes de validación
        clearValidationMessages();
        
        elements.userModal.show();
    }

    function editUser(userId) {
        fetch(`${config.apiBaseUrl}/${userId}`)
            .then(response => {
                if (!response.ok) throw new Error('Error al cargar usuario');
                return response.json();
            })
            .then(user => {
                document.getElementById('userModalLabel').innerHTML = '<i class="fas fa-edit me-2"></i> Editar Usuario';
                document.getElementById('userId').value = user.id_usuario;
                elements.nombreCompleto.value = user.nombre_completo;
                elements.usuarioLogin.value = user.usuario_login;
                elements.cedula.value = user.cedula;
                elements.telefono.value = user.telefono || '';
                elements.gmail.value = user.gmail || '';
                elements.idRol.value = user.id_rol;
                elements.activo.checked = user.activo;
                elements.contraseña.required = false;
                elements.confirmPassword.required = false;
                elements.contraseña.value = '';
                elements.confirmPassword.value = '';
                
                // Limpiar mensajes de validación
                clearValidationMessages();
                
                elements.userModal.show();
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error al cargar los datos del usuario', 'error');
            });
    }

    function clearValidationMessages() {
        // Limpiar mensajes de validación personalizados
        const inputs = elements.userForm.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.setCustomValidity('');
        });
    }

    function saveUser(event) {
        event.preventDefault();
        
        console.log('Iniciando guardado de usuario...');
        
        // Validar formulario
        if (!elements.userForm.checkValidity()) {
            elements.userForm.reportValidity();
            showToast('Por favor, complete todos los campos requeridos correctamente', 'error');
            return;
        }
        
        const password = elements.contraseña.value;
        const confirmPassword = elements.confirmPassword.value;
        const userId = document.getElementById('userId').value;
        const isNewUser = !userId;
        
        console.log('Nuevo usuario:', isNewUser, 'ID:', userId);
        
        // Validación de contraseñas mejorada
        if (isNewUser && !password) {
            showToast('La contraseña es requerida para nuevos usuarios', 'error');
            elements.contraseña.focus();
            return;
        }
        
        if (password && password.length < 8) {
            showToast('La contraseña debe tener al menos 8 caracteres', 'error');
            elements.contraseña.focus();
            return;
        }
        
        if (password !== confirmPassword) {
            showToast('Las contraseñas no coinciden', 'error');
            elements.confirmPassword.focus();
            return;
        }
        
        const url = isNewUser ? config.apiBaseUrl : `${config.apiBaseUrl}/${userId}`;
        const method = isNewUser ? 'POST' : 'PUT';
        
        const userData = {
            nombre_completo: elements.nombreCompleto.value.trim(),
            usuario_login: elements.usuarioLogin.value.trim(),
            cedula: elements.cedula.value.trim(),
            telefono: elements.telefono.value.trim() || null,
            gmail: elements.gmail.value.trim() || null,
            id_rol: parseInt(elements.idRol.value),
            activo: elements.activo.checked
        };
        
        // Solo incluir contraseña si se proporcionó
        if (password) {
            userData.contraseña = password;
        }
        
        console.log('Enviando datos:', userData);
        console.log('URL:', url, 'Método:', method);
        
        toggleSaveButton(true);
        
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })
        .then(response => {
            console.log('Respuesta recibida, status:', response.status);
            
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || `Error ${response.status}: ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Usuario guardado exitosamente:', data);
            
            elements.userModal.hide();
            loadUsers();
            showToast(isNewUser ? 'Usuario creado exitosamente' : 'Usuario actualizado exitosamente', 'success');
        })
        .catch(error => {
            console.error('Error completo:', error);
            showToast(error.message || 'Error al guardar el usuario', 'error');
        })
        .finally(() => {
            toggleSaveButton(false);
        });
    }

    function toggleSaveButton(isLoading) {
        elements.saveUserBtn.disabled = isLoading;
        elements.saveUserBtn.innerHTML = isLoading 
            ? '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Guardando...'
            : '<i class="fas fa-save me-1"></i> Guardar Usuario';
    }

    function confirmAction(action, userId) {
        state.currentAction = action;
        state.selectedUserId = userId;
        
        const user = state.usersData.find(u => u.id_usuario == userId);
        if (!user) return;
        
        let message = '';
        let buttonText = '';
        let buttonClass = 'btn-danger';
        
        switch(action) {
            case 'delete':
                message = `¿Está seguro que desea eliminar al usuario <strong>${user.nombre_completo}</strong>?`;
                buttonText = '<i class="fas fa-trash me-1"></i> Eliminar';
                break;
            case 'toggleStatus':
                const newStatus = !user.activo;
                message = `¿Está seguro que desea <strong>${newStatus ? 'activar' : 'desactivar'}</strong> al usuario <strong>${user.nombre_completo}</strong>?`;
                buttonText = `<i class="fas fa-power-off me-1"></i> ${newStatus ? 'Activar' : 'Desactivar'}`;
                buttonClass = newStatus ? 'btn-success' : 'btn-warning';
                break;
        }
        
        document.getElementById('confirmModalBody').innerHTML = message;
        elements.confirmActionBtn.className = `btn ${buttonClass}`;
        elements.confirmActionBtn.innerHTML = buttonText;
        elements.confirmModal.show();
    }

    function executeAction() {
        toggleConfirmButton(true);
        
        let url, method, body;
        
        switch(state.currentAction) {
            case 'delete':
                url = `${config.apiBaseUrl}/${state.selectedUserId}`;
                method = 'DELETE';
                break;
            case 'toggleStatus':
                const user = state.usersData.find(u => u.id_usuario == state.selectedUserId);
                url = `${config.apiBaseUrl}/${state.selectedUserId}/status`;
                method = 'PUT';
                body = JSON.stringify({ activo: !user.activo });
                break;
        }
        
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: body ? body : null
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'Error al ejecutar acción');
                });
            }
            return response.json();
        })
        .then(data => {
            elements.confirmModal.hide();
            loadUsers();
            showToast('Acción realizada exitosamente', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showToast(error.message || 'Error al realizar la acción', 'error');
        })
        .finally(() => {
            toggleConfirmButton(false);
        });
    }

    function toggleConfirmButton(isLoading) {
        elements.confirmActionBtn.disabled = isLoading;
        elements.confirmActionBtn.innerHTML = isLoading 
            ? '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Procesando...'
            : elements.confirmActionBtn.innerHTML;
    }

    function showToast(message, type) {
        // Crear toast dinámicamente
        const toast = document.createElement('div');
        toast.className = `toast show position-fixed ${type === 'success' ? 'bg-success' : 'bg-danger'}`;
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '9999';
        toast.style.minWidth = '300px';
        toast.style.maxWidth = '400px';
        toast.innerHTML = `
            <div class="toast-body text-white d-flex align-items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2 fs-5"></i>
                <span class="flex-grow-1">${message}</span>
                <button type="button" class="btn-close btn-close-white ms-3" data-bs-dismiss="toast"></button>
            </div>
        `;
        document.body.appendChild(toast);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
        
        // Permitir cerrar manualmente
        toast.querySelector('.btn-close').addEventListener('click', () => {
            toast.remove();
        });
    }

    // Función para cambiar estado del usuario (toggle)
    function toggleUserStatus(userId, newStatus) {
        fetch(`${config.apiBaseUrl}/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ activo: newStatus })
        })
        .then(response => {
            if (!response.ok) throw new Error('Error al cambiar estado');
            return response.json();
        })
        .then(data => {
            loadUsers();
            showToast(`Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`, 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error al cambiar el estado del usuario', 'error');
        });
    }
});