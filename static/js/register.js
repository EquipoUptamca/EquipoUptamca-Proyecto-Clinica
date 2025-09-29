document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const form = document.getElementById('registerForm');
    const messageContainer = document.getElementById('message');
    const passwordInput = document.getElementById('contraseña');
    const confirmInput = document.getElementById('confirm_password');
    const strengthMeter = document.getElementById('passwordStrength');
    const strengthText = document.getElementById('strengthText');
    const tipoUsuarioSelect = document.getElementById('tipo_usuario');
    const securityCodeGroup = document.getElementById('securityCodeGroup');
    const adminCodeInput = document.getElementById('admin_code');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = document.getElementById('btn-text');

    // --- Role Descriptions ---
    const roleDescriptions = {
        'admin': 'Acceso total al sistema con permisos de administración completa.',
        'medico': 'Acceso a historiales médicos, gestión de citas y registros clínicos.',
        'recepcion': 'Acceso a programación de citas, registro de pacientes y facturación.',
        'paciente': 'Acceso a su historial médico, citas programadas y resultados.'
    };

    // --- Privileged Roles ---
    const privilegedRoles = ['admin', 'medico', 'recepcion'];

    // --- Initial Setup ---
    setupEventListeners();

    // --- Functions ---

    function setupEventListeners() {
        // Toggle password visibility
        form.querySelectorAll('.toggle-password').forEach(toggle => {
            toggle.addEventListener('click', togglePasswordVisibility);
        });

        // Password strength validation
        passwordInput.addEventListener('input', updatePasswordStrength);

        // Show role description on change
        tipoUsuarioSelect.addEventListener('change', handleRoleChange);

        // Real-time validation on input blur
        form.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => clearError(input));
        });

        // Form submission
        form.addEventListener('submit', handleFormSubmit);

        // Cédula validation (Venezuelan format)
        document.getElementById('cedula').addEventListener('input', function(e) {
            let value = e.target.value.toUpperCase();
            // Remove any existing dashes for processing
            value = value.replace('-', '');
            
            if (value.length > 0) {
                // Add dash after first character if it's V, E, G, or J
                if (/^[VEGJ]/i.test(value) && value.length > 1) {
                    value = value.charAt(0) + '-' + value.substring(1);
                }
                // Limit to 10 characters total (V-12345678)
                value = value.substring(0, 10);
            }
            e.target.value = value;
        });

        // Initialize role description
        handleRoleChange();
    }

    function handleRoleChange() {
        const selectedRole = tipoUsuarioSelect.value;
        showRoleDescription(selectedRole);
        toggleSecurityCodeField(selectedRole);
    }

    function toggleSecurityCodeField(selectedRole) {
        if (privilegedRoles.includes(selectedRole)) {
            securityCodeGroup.style.display = 'block';
            adminCodeInput.required = true;
        } else {
            securityCodeGroup.style.display = 'none';
            adminCodeInput.required = false;
            clearError(adminCodeInput);
        }
    }

    function togglePasswordVisibility(event) {
        const icon = event.target;
        const wrapper = icon.closest('.password-wrapper');
        const input = wrapper.querySelector('input');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    }

    function showRoleDescription(selectedRole) {
        let descriptionElement = document.getElementById('roleDescription');
        
        if (!descriptionElement) {
            descriptionElement = document.createElement('div');
            descriptionElement.id = 'roleDescription';
            descriptionElement.className = 'role-description';
            tipoUsuarioSelect.parentNode.appendChild(descriptionElement);
        }
        
        if (selectedRole && roleDescriptions[selectedRole]) {
            descriptionElement.textContent = roleDescriptions[selectedRole];
            descriptionElement.style.display = 'block';
        } else {
            descriptionElement.style.display = 'none';
        }
    }

    function updatePasswordStrength() {
        const password = passwordInput.value;
        const strength = calculatePasswordStrength(password);
        
        strengthMeter.className = 'strength-meter'; // Reset classes
        if (password.length === 0) {
            strengthMeter.style.width = '0%';
            strengthText.textContent = '';
            return;
        }

        // Animate width based on strength
        const width = (strength.score + 1) * 25;
        strengthMeter.style.width = width + '%';

        switch (strength.score) {
            case 0:
                strengthMeter.classList.add('weak');
                strengthText.textContent = 'Muy débil';
                strengthText.style.color = '#e74c3c';
                break;
            case 1:
                strengthMeter.classList.add('weak');
                strengthText.textContent = 'Débil';
                strengthText.style.color = '#e74c3c';
                break;
            case 2:
                strengthMeter.classList.add('medium');
                strengthText.textContent = 'Moderada';
                strengthText.style.color = '#f39c12';
                break;
            case 3:
                strengthMeter.classList.add('medium');
                strengthText.textContent = 'Fuerte';
                strengthText.style.color = '#27ae60';
                break;
            case 4:
                strengthMeter.classList.add('strong');
                strengthText.textContent = 'Muy fuerte';
                strengthText.style.color = '#27ae60';
                break;
        }
    }

    function calculatePasswordStrength(password) {
        let score = 0;
        
        // Length check
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        
        // Complexity checks
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        // Cap at 4
        return { score: Math.min(score, 4) };
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const isFormValid = await validateAllFields();
        
        if (isFormValid) {
            await submitFormData();
        } else {
            showMessage('Por favor, corrija los errores en el formulario.', 'error');
            // Scroll to first error
            const firstError = form.querySelector('.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    async function validateAllFields() {
        let isValid = true;
        
        // Validate all required fields
        const fieldsToValidate = [
            'nombre_completo', 'usuario_login', 'cedula', 'gmail', 
            'contraseña', 'confirm_password', 'tipo_usuario'
        ];
        
        // Add admin_code to validation if required
        const selectedRole = tipoUsuarioSelect.value;
        if (privilegedRoles.includes(selectedRole)) {
            fieldsToValidate.push('admin_code');
        }
        
        for (const fieldName of fieldsToValidate) {
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (field && !validateField(field)) {
                isValid = false;
            }
        }
        
        // Additional async validations
        if (isValid) {
            isValid = await performAsyncValidations();
        }
        
        return isValid;
    }

    async function performAsyncValidations() {
        let isValid = true;
        
        // Check username availability
        const username = document.querySelector('[name="usuario_login"]').value;
        if (username && !await checkFieldAvailability('username', username)) {
            isValid = false;
        }
        
        // Check cedula availability
        const cedula = document.querySelector('[name="cedula"]').value;
        if (cedula && !await checkFieldAvailability('cedula', cedula)) {
            isValid = false;
        }
        
        // Check email availability
        const email = document.querySelector('[name="gmail"]').value;
        if (email && !await checkFieldAvailability('email', email)) {
            isValid = false;
        }
        
        return isValid;
    }

    async function checkFieldAvailability(fieldType, value) {
        if (!value) return true;
        
        try {
            const endpoint = `/api/check-${fieldType}?${fieldType}=${encodeURIComponent(value)}`;
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                throw new Error(`Error checking ${fieldType}`);
            }
            
            const result = await response.json();
            
            if (result.exists) {
                const field = document.querySelector(`[name="${fieldType === 'username' ? 'usuario_login' : fieldType}"]`);
                showError(field, `Este ${fieldType === 'username' ? 'nombre de usuario' : fieldType} ya está en uso.`);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error(`Error checking ${fieldType}:`, error);
            return true; // Don't block form submission on network errors
        }
    }

    function validateField(field) {
        clearError(field);
        let isValid = true;
        const value = field.value.trim();

        if (field.required && !value) {
            showError(field, 'Este campo es obligatorio.');
            isValid = false;
        } else if (value) {
            switch (field.name) {
                case 'nombre_completo':
                    if (value.length < 5) {
                        showError(field, 'Debe tener al menos 5 caracteres.');
                        isValid = false;
                    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{5,100}$/.test(value)) {
                        showError(field, 'Solo se permiten letras y espacios.');
                        isValid = false;
                    }
                    break;
                case 'usuario_login':
                    if (value.length < 4) {
                        showError(field, 'Debe tener al menos 4 caracteres.');
                        isValid = false;
                    } else if (!/^[a-zA-Z0-9_]{4,50}$/.test(value)) {
                        showError(field, 'Solo se permiten letras, números y guiones bajos.');
                        isValid = false;
                    }
                    break;
                case 'cedula':
                    if (!/^[VEGJ]-\d{5,9}$/i.test(value)) {
                        showError(field, 'Formato inválido. Use V-12345678');
                        isValid = false;
                    }
                    break;
                case 'gmail':
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        showError(field, 'Ingrese un correo electrónico válido.');
                        isValid = false;
                    }
                    break;
                case 'contraseña':
                    if (value.length < 8) {
                        showError(field, 'La contraseña debe tener al menos 8 caracteres.');
                        isValid = false;
                    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
                        showError(field, 'Debe contener mayúsculas, minúsculas y números.');
                        isValid = false;
                    }
                    break;
                case 'confirm_password':
                    if (value !== passwordInput.value) {
                        showError(field, 'Las contraseñas no coinciden.');
                        isValid = false;
                    }
                    break;
                case 'admin_code':
                    if (value !== 'privacidad_medasistencia') {
                        showError(field, 'Código de seguridad incorrecto.');
                        isValid = false;
                    }
                    break;
            }
        }
        return isValid;
    }

    async function submitFormData() {
        setLoadingState(true);
        
        // Prepare form data
        const formData = new FormData(form);
        const data = {
            nombre_completo: formData.get('nombre_completo'),
            usuario_login: formData.get('usuario_login'),
            cedula: formData.get('cedula'),
            telefono: formData.get('telefono'),
            gmail: formData.get('gmail'),
            contraseña: formData.get('contraseña'),
            tipo_usuario: formData.get('tipo_usuario'),
            admin_code: formData.get('admin_code')
        };

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                showMessage('¡Registro exitoso! Redirigiendo al inicio de sesión...', 'success');
                
                // Save user data to localStorage for auto-login
                localStorage.setItem('newUser', JSON.stringify({
                    usuario_login: data.usuario_login,
                    rememberMe: true
                }));
                
                setTimeout(() => {
                    window.location.href = result.redirect || '/login';
                }, 2000);
            } else {
                let errorMessage = result.error || 'Ocurrió un error en el registro. Por favor, intente nuevamente.';
                
                // Handle specific field errors
                if (result.missing_fields && result.missing_fields.length > 0) {
                    errorMessage += ` Campos faltantes: ${result.missing_fields.join(', ')}`;
                }
                
                if (result.field) {
                    const field = document.querySelector(`[name="${result.field === 'usuario_login' ? 'usuario_login' : result.field}"]`);
                    if (field) {
                        showError(field, errorMessage);
                    }
                }
                
                showMessage(errorMessage, 'error');
                setLoadingState(false);
            }
        } catch (error) {
            console.error('Error de red:', error);
            showMessage('Error de conexión. Por favor, verifique su conexión e intente nuevamente.', 'error');
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        submitBtn.disabled = isLoading;
        if (isLoading) {
            btnText.textContent = 'Registrando...';
            submitBtn.querySelector('i').className = 'fas fa-spinner fa-spin';
            submitBtn.style.opacity = '0.8';
        } else {
            btnText.textContent = 'Registrarse';
            submitBtn.querySelector('i').className = 'fas fa-arrow-right';
            submitBtn.style.opacity = '1';
        }
    }

    function showError(field, message) {
        const errorElement = document.getElementById(`${field.name || field.id}_error`);
        if (errorElement) {
            errorElement.textContent = message;
            field.closest('.form-group').classList.add('error');
        }
    }

    function clearError(field) {
        const errorElement = document.getElementById(`${field.name || field.id}_error`);
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
                ${type === 'success' ? '<i class="fas fa-times close-message"></i>' : ''}
            </div>
        `;
        messageContainer.style.display = 'block';
        
        // Add close functionality for success messages
        const closeBtn = messageContainer.querySelector('.close-message');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                messageContainer.style.display = 'none';
            });
        }
        
        messageContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                messageContainer.style.display = 'none';
            }, 5000);
        }
    }

    // Add input masking for phone number
    document.getElementById('telefono').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0) {
            value = value.match(/(\d{0,4})(\d{0,3})(\d{0,4})/);
            e.target.value = !value[2] ? value[1] : value[1] + '-' + value[2] + (value[3] ? '-' + value[3] : '');
        }
    });

    // Add character counter for specific fields
    const maxLengthFields = {
        'nombre_completo': 100,
        'usuario_login': 50,
        'cedula': 20,
        'numero_colegiado': 50
    };

    Object.keys(maxLengthFields).forEach(fieldName => {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field) {
            const counter = document.createElement('div');
            counter.className = 'char-counter';
            counter.style.fontSize = '0.8rem';
            counter.style.color = '#6c757d';
            counter.style.marginTop = '0.25rem';
            field.parentNode.appendChild(counter);

            field.addEventListener('input', function() {
                const remaining = maxLengthFields[fieldName] - this.value.length;
                counter.textContent = `${remaining} caracteres restantes`;
                counter.style.color = remaining < 10 ? '#e74c3c' : '#6c757d';
            });
        }
    });

    // Auto-capitalize first letter of names
    document.getElementById('nombre_completo').addEventListener('blur', function() {
        if (this.value) {
            this.value = this.value.replace(/\b\w/g, c => c.toUpperCase());
        }
    });

    // Auto-lowercase for username and email
    document.getElementById('usuario_login').addEventListener('blur', function() {
        if (this.value) {
            this.value = this.value.toLowerCase();
        }
    });

    document.getElementById('gmail').addEventListener('blur', function() {
        if (this.value) {
            this.value = this.value.toLowerCase();
        }
    });
});