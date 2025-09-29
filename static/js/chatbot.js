/**
 * ChatbotWidget
 * Clase genérica para crear y gestionar un widget de chatbot interactivo.
 *
 * @param {object} config - Objeto de configuración.
 * @param {string} config.chatbotSelector - Selector CSS para el contenedor principal del widget.
 * @param {string} config.chatbotType - El tipo de chatbot ('admin', 'reception', 'doctor').
 * @param {string[]} config.suggestions - Array de strings con las sugerencias iniciales.
 * @param {object} config.actionHandlers - Objeto donde las claves son nombres de acciones y los valores son las funciones que las manejan.
 */
class ChatbotWidget {
    constructor(config) {
        this.config = config;
        this.elements = {};
        this.bookingState = {}; // Para flujos de varios pasos como el agendamiento

        this.initDOMElements();
        if (this.elements.widget) {
            this.initEventListeners();
            this.showWelcomeMessage();
        } else {
            console.error(`Chatbot no encontrado con el selector: ${this.config.chatbotSelector}`);
        }
    }

    initDOMElements() {
        const widget = document.querySelector(this.config.chatbotSelector);
        if (!widget) return;

        this.elements = {
            widget: widget,
            fab: document.querySelector('.chatbot-fab'), // Búsqueda más genérica por clase
            closeBtn: widget.querySelector('.chat-close-btn'),
            messagesContainer: widget.querySelector('.chat-messages'),
            input: widget.querySelector('.chat-input-field'),
            sendBtn: widget.querySelector('.chat-send-btn'),
            suggestionsContainer: widget.querySelector('.chat-suggestions'),
        };
    }

    initEventListeners() {
        this.elements.fab.addEventListener('click', () => this.toggleWidget());
        this.elements.closeBtn.addEventListener('click', () => this.toggleWidget(false));
        this.elements.sendBtn.addEventListener('click', () => this.handleUserInput());
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserInput();
        });

        this.elements.input.addEventListener('focus', () => this.renderSuggestions(this.config.suggestions));
        this.elements.input.addEventListener('input', () => this.filterSuggestions());

        document.addEventListener('click', (e) => {
            if (!this.elements.widget.contains(e.target)) {
                this.clearSuggestions();
            }
        });

        this.elements.messagesContainer.addEventListener('scroll', () => this.clearSuggestions());
    }

    toggleWidget(forceOpen = null) {
        const isOpen = this.elements.widget.classList.toggle('open', forceOpen);
        if (isOpen) {
            this.elements.input.focus();
        } else {
            this.clearSuggestions();
        }
    }

    async handleUserInput() {
        const userText = this.elements.input.value.trim();
        if (userText === '') return;

        this.addMessage(userText, 'user');
        this.clearSuggestions();
        this.elements.input.value = '';

        const loadingMessageId = this.addMessage('<div class="spinner-border spinner-border-sm" role="status"></div>', 'bot-loading');

        try {
            const response = await fetch('/api/chatbot/response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText, type: this.config.chatbotType })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            this.removeMessage(loadingMessageId);
            this.addMessage(data.text, 'bot');

            if (data.action && this.config.actionHandlers[data.action]) {
                // Pasamos 'this' para que los manejadores puedan acceder a los métodos del chatbot
                this.config.actionHandlersdata.action;
            }
        } catch (error) {
            this.removeMessage(loadingMessageId);
            this.addMessage('Lo siento, tengo problemas para conectarme. Inténtalo de nuevo.', 'bot');
            console.error("Chatbot fetch error:", error);
        }
    }

    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        const messageId = `msg-${Date.now()}-${Math.random()}`;
        messageDiv.id = messageId;
        messageDiv.className = `message ${type}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = text;

        messageDiv.appendChild(contentDiv);
        this.elements.messagesContainer.appendChild(messageDiv);
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;

        return messageId;
    }

    removeMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            messageElement.remove();
        }
    }

    renderSuggestions(suggestions) {
        this.elements.suggestionsContainer.innerHTML = '';
        if (suggestions.length === 0) {
            this.clearSuggestions();
            return;
        }

        this.elements.suggestionsContainer.style.display = 'block';
        suggestions.forEach(suggestionText => {
            const suggestionBtn = document.createElement('button');
            suggestionBtn.className = 'suggestion-item';
            suggestionBtn.textContent = suggestionText;
            suggestionBtn.onclick = () => {
                this.elements.input.value = suggestionText;
                this.handleUserInput();
            };
            this.elements.suggestionsContainer.appendChild(suggestionBtn);
        });
    }

    filterSuggestions() {
        const inputText = this.elements.input.value.toLowerCase();
        if (inputText.length > 0) {
            const filtered = this.config.suggestions.filter(s => s.toLowerCase().includes(inputText));
            this.renderSuggestions(filtered);
        } else {
            this.renderSuggestions(this.config.suggestions);
        }
    }

    clearSuggestions() {
        this.elements.suggestionsContainer.innerHTML = '';
        this.elements.suggestionsContainer.style.display = 'none';
    }

    async showWelcomeMessage() {
        try {
            const response = await fetch('/api/chatbot/response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'hola', type: this.config.chatbotType })
            });
            const data = await response.json();
            this.addMessage(data.text, 'bot');
        } catch (error) {
            this.addMessage('¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?', 'bot');
        }
    }

    // Método para enviar datos al backend para acciones específicas
    async sendAction(actionType, payload) {
        const loadingId = this.addMessage('<div class="spinner-border spinner-border-sm" role="status"></div>', 'bot-loading');
        try {
            const response = await fetch('/api/chatbot/response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: 'accion_interna', // Mensaje genérico para acciones
                    type: actionType,
                    data: payload
                })
            });
            const result = await response.json();
            this.removeMessage(loadingId);
            this.addMessage(result.text, 'bot');
        } catch (error) {
            this.removeMessage(loadingId);
            this.addMessage(`❌ Error al procesar la acción.`, 'bot');
            console.error(`Error en sendAction (${actionType}):`, error);
        }
    }
}

/**
 * Función de ayuda para inicializar un chatbot.
 * @param {object} config - La configuración para el constructor de ChatbotWidget.
 */
function initializeChatbot(config) {
    document.addEventListener('DOMContentLoaded', () => {
        new ChatbotWidget(config);
    });
}


/**
 * Ejemplo de cómo se usaría en una página HTML:
 * 
 * <div id="admin-chat" class="chat-widget"> ... </div>
 * <button id="admin-chat-fab" class="chatbot-fab"> ... </button>
 * 
 * <script src="/static/js/chatbot.js"></script>
 * <script>
 *     const adminConfig = {
 *         chatbotSelector: '#admin-chat',
 *         chatbotType: 'admin',
 *         suggestions: ['Crear usuario', 'Buscar médico'],
 *         actionHandlers: {
 *             render_user_search: (chatbotInstance, data) => {
 *                 // Lógica para renderizar la búsqueda de usuario
 *                 console.log('Renderizando búsqueda de usuario...');
 *                 chatbotInstance.addMessage('Componente de búsqueda aquí', 'bot');
 *             }
 *         }
 *     };
 *     initializeChatbot(adminConfig);
 * </script>
 */