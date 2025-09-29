document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const form = document.getElementById('loginForm');
    const messageContainer = document.getElementById('message');
    const identificadorInput = document.getElementById('identificador');
    const passwordInput = document.getElementById('contraseña');
    const togglePassword = document.getElementById('togglePassword');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = document.getElementById('btn-text');

    // --- Initial Setup ---
    setupEventListeners();

    // --- Functions ---
    function setupEventListeners() {
        // Toggle password visibility
        if (togglePassword) {
            togglePassword.addEventListener('click', togglePasswordVisibility);
        }

        // Real-time validation on input blur
        form.querySelectorAll('input').forEach(input => {
            input.addEventListener('blur', () => validateField(input));
        });

        // Form submission
        form.addEventListener('submit', handleFormSubmit);
    }

    function togglePasswordVisibility() {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePassword.classList.toggle('fa-eye-slash', !isPassword);
        togglePassword.classList.toggle('fa-eye', isPassword);
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        if (validateAllFields()) {
            await submitFormData();
        } else {
            showMessage('Por favor, corrija los errores.', 'error');
        }
    }

    function validateAllFields() {
        const isIdentificadorValid = validateField(identificadorInput);
        const isPasswordValid = validateField(passwordInput);
        return isIdentificadorValid && isPasswordValid;
    }

    function validateField(field) {
        clearError(field);
        if (field.required && !field.value.trim()) {
            showError(field, 'Este campo es obligatorio.');
            return false;
        }
        return true;
    }

    async function submitFormData() {
        setLoadingState(true);
        const identificador = identificadorInput.value.trim();
        const contraseña = passwordInput.value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identificador, contraseña })
            });

            const result = await response.json();

            if (response.ok) {
                showMessage('Inicio de sesión exitoso. Redirigiendo...', 'success');
                setTimeout(() => {
                    window.location.href = result.redirect || '/dashboard';
                }, 1500);
            } else {
                showMessage(result.error || 'Credenciales incorrectas.', 'error');
                setLoadingState(false);
            }
        } catch (error) {
            console.error('Error de red:', error);
            showMessage('Error de conexión con el servidor. Intente más tarde.', 'error');
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        submitBtn.disabled = isLoading;
        const icon = submitBtn.querySelector('i');
        if (isLoading) {
            btnText.textContent = 'Ingresando...';
            icon.className = 'fas fa-spinner fa-spin';
        } else {
            btnText.textContent = 'Ingresar';
            icon.className = 'fas fa-sign-in-alt';
        }
    }

    function showError(field, message) {
        const errorElement = document.getElementById(`${field.id}_error`);
        if (errorElement) {
            errorElement.textContent = message;
            field.closest('.form-group').classList.add('error');
        }
    }

    function clearError(field) {
        const errorElement = document.getElementById(`${field.id}_error`);
        if (errorElement) {
            errorElement.textContent = '';
            field.closest('.form-group').classList.remove('error');
        }
    }

    function showMessage(message, type) {
        messageContainer.innerHTML = `
            <div class="message ${type}">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        messageContainer.style.display = 'block';
        messageContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});