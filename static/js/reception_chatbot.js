document.addEventListener('DOMContentLoaded', () => {
    const fab = document.getElementById('chatbot-fab');
    const widget = document.getElementById('chat-widget');
    const closeBtn = document.getElementById('chat-close-btn');
    const messagesContainer = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('chat-send-btn');
    const suggestionsContainer = document.getElementById('chat-suggestions');

    const suggestions = [
        '¿Cómo registro un nuevo paciente?',
        'Quiero agendar una nueva cita',
        '¿Dónde veo las citas de hoy?',
        'Consultar el horario de un médico',
        'Buscar a un médico en el directorio',
        'Necesito ayuda',
        'Gracias'
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

    // Cerrar sugerencias al hacer scroll
    messagesContainer.addEventListener('scroll', clearSuggestions);

    async function handleUserInput() {
        const userText = input.value.trim();
        if (userText === '') return;

        addMessage(userText, 'user');
        clearSuggestions();
        input.value = '';

        // Muestra un indicador de carga
        const loadingMessageId = addMessage('<div class="spinner-border spinner-border-sm" role="status"></div>', 'bot-loading');

        try {
            // Llama al endpoint del backend para obtener la respuesta
            const response = await fetch('/api/chatbot/response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText, type: 'reception' })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            // Remueve el mensaje de carga
            removeMessage(loadingMessageId);
            
            // Muestra la respuesta recibida
            addMessage(data.text, 'bot');
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
        contentDiv.innerHTML = text; // Usamos innerHTML para renderizar los enlaces

        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);

        // Scroll hasta el final
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

    // Mensaje de bienvenida inicial
    function showWelcomeMessage() {
        const welcomeText = `
            ¡Bienvenido/a al asistente de recepción!
            <br><br>
            Puedes preguntarme sobre:
            <ul>
                <li><i class="fas fa-user-plus fa-fw"></i> Registrar un paciente</li>
                <li><i class="fas fa-calendar-plus fa-fw"></i> Agendar una cita</li>
                <li><i class="fas fa-clock fa-fw"></i> Ver horarios de médicos</li>
                <li><i class="fas fa-address-book fa-fw"></i> Buscar en el directorio médico</li>
            </ul>
        `;
        addMessage(welcomeText, 'bot');
    }

    // Mostrar mensaje de bienvenida después de un breve delay
    setTimeout(showWelcomeMessage, 300);
});