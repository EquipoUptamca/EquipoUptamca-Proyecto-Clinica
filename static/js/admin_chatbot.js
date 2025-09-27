document.addEventListener('DOMContentLoaded', () => {
    const fab = document.getElementById('chatbot-fab');
    const widget = document.getElementById('chat-widget');
    const closeBtn = document.getElementById('chat-close-btn');
    const messagesContainer = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('chat-send-btn');
    const suggestionsContainer = document.getElementById('chat-suggestions');

    const suggestions = [
        '¿Cómo creo un nuevo usuario?',
        'Gestionar perfiles de médicos',
        'Ver la lista de pacientes',
        '¿Dónde gestiono los horarios?',
        'Ver estadísticas del sistema',
        'Necesito ayuda con la plataforma'
    ];

    // Abrir y cerrar el widget
    fab.addEventListener('click', () => {
        widget.classList.toggle('open');
        if (widget.classList.contains('open')) {
            input.focus();
        }
    });
    
    closeBtn.addEventListener('click', () => {
        widget.classList.remove('open');
        clearSuggestions();
    });

    // Enviar mensaje
    sendBtn.addEventListener('click', handleUserInput);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserInput();
    });

    // Mostrar sugerencias al enfocar el input
    input.addEventListener('focus', () => {
        if (input.value.length === 0) {
            renderSuggestions(suggestions);
        }
    });

    // Mostrar sugerencias al escribir
    input.addEventListener('input', () => {
        const inputText = input.value.toLowerCase();
        if (inputText.length > 0) {
            const filteredSuggestions = suggestions.filter(s => 
                s.toLowerCase().includes(inputText)
            );
            renderSuggestions(filteredSuggestions);
        } else {
            renderSuggestions(suggestions);
        }
    });

    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            clearSuggestions();
        }
    });

    async function handleUserInput() {
        const userText = input.value.trim();
        if (userText === '') return;

        addMessage(userText, 'user');
        clearSuggestions();
        input.value = '';

        // Muestra un indicador de carga mientras se espera la respuesta del servidor
        const loadingMessageId = addMessage('<div class="spinner-border spinner-border-sm" role="status"></div>', 'bot-loading');

        try {
            // Llama al nuevo endpoint del backend
            const response = await fetch('/api/chatbot/response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText, type: 'admin' })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            
            // Remueve el mensaje de carga
            removeMessage(loadingMessageId);
            
            // Procesa la respuesta del backend
            addMessage(data.text, 'bot');

            // Si el backend solicita una acción, la ejecuta
            if (data.action === 'render_user_search') {
                renderUserSearchComponent();
            }
        } catch (error) {
            removeMessage(loadingMessageId);
            addMessage('Lo siento, tengo problemas para conectarme. Inténtalo de nuevo.', 'bot');
        }
    }

    function addMessage(text, type) {
        const messageDiv = document.createElement('div');
        const messageId = 'msg-' + Date.now();
        messageDiv.id = messageId;
        messageDiv.className = `message ${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = text;
        
        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return messageId;
    }

    function removeMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            messageElement.remove();
        }
    }

    function renderSuggestions(filteredSuggestions) {
        suggestionsContainer.innerHTML = '';
        
        if (filteredSuggestions.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        suggestionsContainer.style.display = 'block';
        
        filteredSuggestions.forEach(suggestionText => {
            const suggestionBtn = document.createElement('button');
            suggestionBtn.className = 'suggestion-item';
            suggestionBtn.textContent = suggestionText;
            suggestionBtn.onclick = () => {
                input.value = suggestionText;
                clearSuggestions();
                handleUserInput();
            };
            suggestionsContainer.appendChild(suggestionBtn);
        });
    }

    function clearSuggestions() {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
    }

    function renderUserSearchComponent() {
        const searchHtml = `
            <div class="chat-interactive-form" id="user-search-form">
                <input type="text" id="user-search-input" class="form-control" placeholder="Nombre o cédula del usuario...">
                <button id="user-search-btn" class="btn btn-success"><i class="fas fa-search"></i></button>
            </div>
        `;
        addMessage(searchHtml, 'bot');

        // Añadir el listener al botón de búsqueda recién creado
        setTimeout(() => {
            document.getElementById('user-search-btn').addEventListener('click', executeUserSearch);
            document.getElementById('user-search-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') executeUserSearch();
            });
        }, 100);
    }

    async function executeUserSearch() {
        const searchInput = document.getElementById('user-search-input');
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) return;

        addMessage(`Buscando: "${searchTerm}"`, 'user');
        
        try {
            const response = await fetch(`/api/users?search=${encodeURIComponent(searchTerm)}&per_page=5`);
            if (!response.ok) throw new Error('Error en la búsqueda');
            
            const data = await response.json();
            
            if (data.users && data.users.length > 0) {
                let resultsHtml = 'He encontrado los siguientes usuarios:<ul class="chat-results-list">';
                data.users.forEach(user => {
                    resultsHtml += `
                        <li>
                            <strong>${user.nombre_completo}</strong><br>
                            <small>Cédula: ${user.cedula} | Rol: ${user.tipo_usuario}</small>
                        </li>
                    `;
                });
                resultsHtml += '</ul>Puedes ver más detalles en la <a href="/users">página de usuarios</a>.';
                addMessage(resultsHtml, 'bot');
            } else {
                addMessage('No se encontraron usuarios que coincidan con tu búsqueda.', 'bot');
            }

        } catch (error) {
            console.error('Error al buscar usuarios:', error);
            addMessage('Hubo un problema al realizar la búsqueda. Por favor, intenta de nuevo.', 'bot');
        }
    }

    async function showWelcomeMessage() {
        // Solicita el mensaje de bienvenida al backend para mantener la consistencia.
        try {
            const response = await fetch('/api/chatbot/response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'hola', type: 'admin' })
            });
            const data = await response.json();
            addMessage(data.text, 'bot');
        } catch (error) {
            addMessage('¡Hola, Admin! Bienvenido al asistente virtual.', 'bot');
        }
    }

    // Mensaje de bienvenida inicial
    setTimeout(showWelcomeMessage, 500);
});