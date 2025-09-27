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

        // Botones
        elements.addUserBtn.addEventListener('click', openAddUserModal);
    elements.userForm.addEventListener('submit', saveUser);
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

        // Validación de teléfono (7-10 dígitos)
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
                        No se encontraron usuarios
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
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.nombre_completo)}&background=random" 
                             class="user-avatar" alt="${user.nombre_completo}">
                        ${user.usuario_login}
                    </div>
                </td>
                <td>${user.nombre_completo}</td>
                <td>${user.cedula}</td>
                <td>
                    <span class="badge ${getRoleBadgeClass(user.id_rol)} role-badge">
                        ${getRoleText(user.id_rol)}
                    </span>
                </td>
                <td>
                    <span class="badge ${user.activo ? 'bg-success' : 'bg-secondary'}">
                        ${user.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="action-btns">
                    <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${user.id_usuario}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${user.id_usuario}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary status-btn" data-id="${user.id_usuario}">
                        <i class="fas fa-power-off"></i>
                    </button>
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
            4: 'Pacientes'
        };
        return roles[roleId] || 'Desconocido';
    }

    function getRoleBadgeClass(roleId) {
        const classes = {
            1: 'badge-admin',
            2: 'badge-medico',
            3: 'badge-enfermeria',
            4: 'badge-recepcion'
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

    function createPaginationItem(content, isDisabled, onClick) {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.innerHTML = content;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (!isDisabled) onClick();
        });
        
        li.appendChild(a);
        return li;
    }

    function openAddUserModal() {
        document.getElementById('userModalLabel').textContent = 'Nuevo Usuario';
        elements.userForm.reset();
        document.getElementById('userId').value = '';
        elements.contraseña.required = true;
        elements.confirmPassword.required = true;
        elements.userModal.show();
    }

    function editUser(userId) {
        fetch(`${config.apiBaseUrl}/${userId}`)
            .then(response => {
                if (!response.ok) throw new Error('Error al cargar usuario');
                return response.json();
            })
            .then(user => {
                document.getElementById('userModalLabel').textContent = 'Editar Usuario';
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
                
                elements.userModal.show();
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error al cargar los datos del usuario', 'error');
            });
    }

    function saveUser(event) {
        event.preventDefault();
        if (!elements.userForm.checkValidity()) {
            elements.userForm.reportValidity();
            return;
        }
        
        const password = elements.contraseña.value;
        const confirmPassword = elements.confirmPassword.value;
        
        // Validar contraseña solo para nuevos usuarios o cuando se cambia
        const isNewUser = !document.getElementById('userId').value;
        if ((isNewUser || password) && password !== confirmPassword) {
            showToast('Las contraseñas no coinciden', 'error');
            return;
        }
        
        if (isNewUser && password.length < 8) {
            showToast('La contraseña debe tener al menos 8 caracteres', 'error');
            return;
        }
        
        const userId = document.getElementById('userId').value;
        const isNew = !userId;
        const url = isNew ? config.apiBaseUrl : `${config.apiBaseUrl}/${userId}`;
        const method = isNew ? 'POST' : 'PUT';
        
        const userData = {
            nombre_completo: elements.nombreCompleto.value,
            usuario_login: elements.usuarioLogin.value,
            cedula: elements.cedula.value,
            telefono: elements.telefono.value || null,
            gmail: elements.gmail.value || null,
            id_rol: elements.idRol.value,
            activo: elements.activo.checked
        };
        
        // Solo incluir contraseña si se proporcionó
        if (password) {
            userData.contraseña = password;
        }
        
        toggleSaveButton(true);
        
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'Error al guardar usuario');
                });
            }
            return response.json();
        })
        .then(data => {
            elements.userModal.hide();
            loadUsers();
            showToast(isNew ? 'Usuario creado exitosamente' : 'Usuario actualizado exitosamente', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showToast(error.message || 'Error al guardar el usuario', 'error');
        })
        .finally(() => {
            toggleSaveButton(false);
        });
    }

    function toggleSaveButton(isLoading) {
        elements.saveUserBtn.disabled = isLoading;
        elements.saveUserBtn.innerHTML = isLoading 
            ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...'
            : 'Guardar Usuario';
    }

    function confirmAction(action, userId) {
        state.currentAction = action;
        state.selectedUserId = userId;
        
        const user = state.usersData.find(u => u.id_usuario == userId);
        if (!user) return;
        
        let message = '';
        
        switch(action) {
            case 'delete':
                message = `¿Está seguro que desea eliminar al usuario ${user.nombre_completo}?`;
                break;
            case 'toggleStatus':
                const newStatus = !user.activo;
                message = `¿Está seguro que desea ${newStatus ? 'activar' : 'desactivar'} al usuario ${user.nombre_completo}?`;
                break;
        }
        
        document.getElementById('confirmModalBody').textContent = message;
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
            ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...'
            : 'Confirmar';
    }

    function showToast(message, type) {
        // Implementación mejorada con Toastify o similar en producción
        const toast = document.createElement('div');
        toast.className = `toast show position-fixed ${type === 'success' ? 'bg-success' : 'bg-danger'}`;
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="toast-body text-white">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
                ${message}
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
});