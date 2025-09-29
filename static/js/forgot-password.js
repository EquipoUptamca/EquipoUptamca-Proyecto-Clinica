document.addEventListener('DOMContentLoaded', function() {
    const recoveryForm = document.getElementById('recoveryForm');
    const messageDiv = document.getElementById('message');
    const btnText = document.getElementById('btn-text');

    recoveryForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const identificador = document.getElementById('identificador').value.trim();
        
        if (!identificador) {
            showError('identificador_error', 'Ingrese su usuario o email');
            return;
        }
        
        try {
            const submitBtn = recoveryForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            btnText.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Enviando...';
            
            const response = await fetch('/api/password-recovery', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identificador: identificador
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage('Se han enviado instrucciones a su email registrado. Por favor revise su bandeja de entrada.', 'success');
                recoveryForm.reset();
            } else {
                showMessage(data.error || 'Error al procesar la solicitud', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error de conexión con el servidor', 'error');
        } finally {
            const submitBtn = recoveryForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            btnText.innerHTML = '<i class="fas fa-paper-plane" style="margin-right: 8px;"></i>Enviar Instrucciones';
        }
    });
    
    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.style.animation = 'shake 0.3s ease-in-out';
        setTimeout(() => {
            errorElement.style.animation = '';
        }, 300);
    }
    
    function showMessage(message, type) {
        messageDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center;">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}" 
                   style="margin-right: 10px; font-size: 1.2rem;"></i>
                ${message}
            </div>
        `;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                window.location.href = '/login';
            }, 5000);
        } else {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }
});