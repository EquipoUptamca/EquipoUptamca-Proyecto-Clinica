document.addEventListener('DOMContentLoaded', function() {

    // --- SELECTORES DEL DOM ---
    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');
    const notificationContainer = document.getElementById('notification-container');

    // --- CARGA INICIAL DE DATOS ---
    function loadUserData() {
        fetch('/api/user-data')
            .then(response => {
                if (!response.ok) throw new Error('No se pudo cargar la información del perfil.');
                return response.json();
            })
            .then(data => {
                // Llenar datos del sidebar
                document.getElementById('username').textContent = data.nombre || 'Paciente';
                document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre)}&background=1E8449&color=fff`;

                // Llenar formulario de perfil
                document.getElementById('nombre_completo').value = data.nombre || '';
                document.getElementById('cedula').value = data.cedula || '';
                document.getElementById('email').value = data.email || '';
                document.getElementById('telefono').value = data.telefono || '';
            })
            .catch(error => {
                showNotification(error.message, 'danger');
            });
    }

    // --- MANEJO DE FORMULARIOS ---

    // Actualizar información del perfil
    profileForm.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!profileForm.checkValidity()) {
            event.stopPropagation();
            profileForm.classList.add('was-validated');
            return;
        }

        const btn = profileForm.querySelector('button[type="submit"]');
        const spinner = btn.querySelector('.spinner-border');
        
        setLoading(btn, spinner, true);

        const data = {
            nombre_completo: document.getElementById('nombre_completo').value,
            email: document.getElementById('email').value,
            telefono: document.getElementById('telefono').value
        };

        fetch('/api/profile/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => response.json().then(result => ({ ok: response.ok, result })))
        .then(({ ok, result }) => {
            if (!ok) throw new Error(result.error || 'Error desconocido.');
            showNotification(result.message, 'success');
            profileForm.classList.remove('was-validated');
        })
        .catch(error => {
            showNotification(error.message, 'danger');
        })
        .finally(() => {
            setLoading(btn, spinner, false);
        });
    });

    // Cambiar contraseña
    passwordForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const newPassword = document.getElementById('new_password').value;
        const confirmPassword = document.getElementById('confirm_password').value;

        if (newPassword !== confirmPassword) {
            document.getElementById('confirm_password').setCustomValidity('Las contraseñas no coinciden.');
        } else {
            document.getElementById('confirm_password').setCustomValidity('');
        }

        if (!passwordForm.checkValidity()) {
            event.stopPropagation();
            passwordForm.classList.add('was-validated');
            return;
        }

        const btn = passwordForm.querySelector('button[type="submit"]');
        const spinner = btn.querySelector('.spinner-border');
        
        setLoading(btn, spinner, true);

        const data = {
            current_password: document.getElementById('current_password').value,
            new_password: newPassword
        };

        fetch('/api/profile/change-password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => response.json().then(result => ({ ok: response.ok, result })))
        .then(({ ok, result }) => {
            if (!ok) throw new Error(result.error || 'Error desconocido.');
            showNotification(result.message, 'success');
            passwordForm.reset();
            passwordForm.classList.remove('was-validated');
        })
        .catch(error => {
            showNotification(error.message, 'danger');
        })
        .finally(() => {
            setLoading(btn, spinner, false);
        });
    });


    // --- FUNCIONES DE UTILIDAD ---

    function showNotification(message, type = 'info') {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        notificationContainer.append(wrapper);

        // Auto-cierre de la notificación
        setTimeout(() => {
            const alert = bootstrap.Alert.getOrCreateInstance(wrapper.querySelector('.alert'));
            if (alert) {
                alert.close();
            }
        }, 5000);
    }

    function setLoading(button, spinner, isLoading) {
        if (isLoading) {
            button.disabled = true;
            spinner.classList.remove('d-none');
        } else {
            button.disabled = false;
            spinner.classList.add('d-none');
        }
    }

    // --- INICIALIZACIÓN ---
    loadUserData();
});