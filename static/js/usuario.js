document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('userForm');
            const passwordInput = document.getElementById('contraseña');
            const confirmPasswordInput = document.getElementById('confirmar_contraseña');
            const passwordStrength = document.getElementById('passwordStrength');
            const passwordMatchError = document.getElementById('passwordMatchError');
            const successModal = new bootstrap.Modal(document.getElementById('successModal'));
            const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
            const submitBtn = document.getElementById('submitBtn');

            // Cargar roles desde la API
            fetch('/api/roles')
                .then(response => response.json())
                .then(roles => {
                    const roleSelect = document.getElementById('id_rol');
                    roles.forEach(role => {
                        const option = document.createElement('option');
                        option.value = role.id_rol;
                        option.textContent = role.nombre_rol;
                        roleSelect.appendChild(option);
                    });
                })
                .catch(error => {
                    console.error('Error al cargar roles:', error);
                });

            // Validación de fortaleza de contraseña
            passwordInput.addEventListener('input', function() {
                const password = this.value;
                let strength = 0;

                // Requisitos de contraseña
                const hasMinLength = password.length >= 8;
                const hasUpperCase = /[A-Z]/.test(password);
                const hasNumber = /[0-9]/.test(password);
                const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

                // Actualizar indicadores visuales
                updateRequirement('req-length', hasMinLength);
                updateRequirement('req-uppercase', hasUpperCase);
                updateRequirement('req-number', hasNumber);
                updateRequirement('req-special', hasSpecialChar);

                // Calcular fortaleza
                if (hasMinLength) strength += 25;
                if (hasUpperCase) strength += 25;
                if (hasNumber) strength += 25;
                if (hasSpecialChar) strength += 25;

                // Actualizar barra de fortaleza
                passwordStrength.style.width = strength + '%';

                // Cambiar color según fortaleza
                if (strength < 50) {
                    passwordStrength.style.backgroundColor = '#dc3545'; // Rojo
                } else if (strength < 75) {
                    passwordStrength.style.backgroundColor = '#ffc107'; // Amarillo
                } else {
                    passwordStrength.style.backgroundColor = '#28a745'; // Verde
                }
            });

            function updateRequirement(elementId, condition) {
                const element = document.getElementById(elementId);
                if (condition) {
                    element.classList.remove('unmet');
                    element.classList.add('met');
                    element.querySelector('i').className = 'fas fa-check-circle';
                } else {
                    element.classList.remove('met');
                    element.classList.add('unmet');
                    element.querySelector('i').className = 'fas fa-circle';
                }
            }

            // Validación de coincidencia de contraseñas
            confirmPasswordInput.addEventListener('input', function() {
                if (passwordInput.value !== this.value) {
                    this.classList.add('is-invalid');
                    passwordMatchError.style.display = 'block';
                } else {
                    this.classList.remove('is-invalid');
                    passwordMatchError.style.display = 'none';
                }
            });

            // Validación de formulario antes de enviar
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // Validar todos los campos
                if (!form.checkValidity()) {
                    form.classList.add('was-validated');
                    return;
                }

                // Validar coincidencia de contraseñas
                if (passwordInput.value !== confirmPasswordInput.value) {
                    confirmPasswordInput.classList.add('is-invalid');
                    passwordMatchError.style.display = 'block';
                    form.classList.add('was-validated');
                    return;
                }

                // Deshabilitar botón para evitar múltiples envíos
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';

                // Crear objeto con los datos del formulario
                const formData = {
                    nombre_completo: document.getElementById('nombre_completo').value,
                    usuario_login: document.getElementById('usuario_login').value,
                    contraseña: passwordInput.value,
                    id_rol: document.getElementById('id_rol').value,
                };

                // Enviar datos al servidor
                fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => { throw err; });
                    }
                    return response.json();
                })
                .then(data => {
                    // Mostrar modal de éxito
                    document.getElementById('successMessage').textContent = data.message || 'El usuario ha sido registrado exitosamente.';
                    successModal.show();

                    // Redirigir después de cerrar el modal
                    document.querySelector('#successModal .btn-success').addEventListener('click', function() {
                        window.location.href = '/admin_dashboard';
                    });

                    // Resetear formulario
                    form.reset();
                    form.classList.remove('was-validated');
                    passwordStrength.style.width = '0%';
                    resetPasswordRequirements();
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('errorMessage').textContent = error.error || 'Error al registrar el usuario. Por favor, intente nuevamente.';
                    errorModal.show();
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-save me-1"></i> Guardar Usuario';
                });
            });

            function resetPasswordRequirements() {
                const requirements = ['req-length', 'req-uppercase', 'req-number', 'req-special'];
                requirements.forEach(id => {
                    const element = document.getElementById(id);
                    element.classList.remove('met');
                    element.classList.add('unmet');
                    element.querySelector('i').className = 'fas fa-circle';
                });
            }
        });