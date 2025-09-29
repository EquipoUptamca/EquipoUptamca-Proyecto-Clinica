document.addEventListener('DOMContentLoaded', () => {
    const codeForm = document.getElementById('codeForm');
    const passwordForm = document.getElementById('passwordForm');
    const messageDiv = document.getElementById('message');
    const instructionText = document.getElementById('instruction-text');

    const urlParams = new URLSearchParams(window.location.search);
    const identifier = urlParams.get('identifier');

    if (!identifier) {
        messageDiv.textContent = 'Identificador no encontrado. Por favor, inicie el proceso de nuevo.';
        messageDiv.className = 'message error';
        codeForm.style.display = 'none';
        return;
    }

    // --- Manejo del formulario de código ---
    codeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codeInput = document.getElementById('code');
        const codeError = document.getElementById('code_error');
        const btn = codeForm.querySelector('button');
        const btnText = document.getElementById('code-btn-text');

        codeError.textContent = '';
        const code = codeInput.value.trim();

        if (!code) {
            codeError.textContent = 'El código es requerido.';
            return;
        }

        // Simulación de verificación. En un caso real, aquí iría una llamada a un endpoint de verificación.
        // Por simplicidad, asumimos que cualquier código de 6 dígitos es válido para pasar al siguiente paso.
        // La verificación real se hará en el backend al enviar la nueva contraseña.
        
        // Ocultar formulario de código y mostrar el de contraseña
        codeForm.classList.add('d-none');
        passwordForm.classList.remove('d-none');
        instructionText.textContent = 'Ahora, crea tu nueva contraseña.';
    });

    // --- Manejo del formulario de contraseña ---
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const code = document.getElementById('code').value.trim();
        const newPasswordInput = document.getElementById('new_password');
        const confirmPasswordInput = document.getElementById('confirm_password');
        const newPasswordError = document.getElementById('new_password_error');
        const confirmPasswordError = document.getElementById('confirm_password_error');
        const btn = passwordForm.querySelector('button');
        const btnText = document.getElementById('password-btn-text');

        // Limpiar errores
        newPasswordError.textContent = '';
        confirmPasswordError.textContent = '';
        messageDiv.textContent = '';
        messageDiv.className = 'message';

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        let isValid = true;
        if (newPassword.length < 8) {
            newPasswordError.textContent = 'La contraseña debe tener al menos 8 caracteres.';
            isValid = false;
        }
        if (newPassword !== confirmPassword) {
            confirmPasswordError.textContent = 'Las contraseñas no coinciden.';
            isValid = false;
        }

        if (!isValid) return;

        // Mostrar estado de carga
        btnText.textContent = 'Restableciendo...';
        btn.disabled = true;

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identificador: identifier,
                    code: code,
                    nueva_contraseña: newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error desconocido');
            }

            messageDiv.textContent = data.message + ' Serás redirigido en 3 segundos.';
            messageDiv.className = 'message success';
            passwordForm.style.display = 'none';

            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);

        } catch (error) {
            messageDiv.textContent = error.message;
            messageDiv.className = 'message error';
        } finally {
            btnText.textContent = 'Restablecer Contraseña';
            btn.disabled = false;
        }
    });
});