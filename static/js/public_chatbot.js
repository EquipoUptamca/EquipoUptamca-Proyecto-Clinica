/**
 * Clase para gestionar el chatbot de la página pública (index.html).
 * No requiere autenticación y utiliza un endpoint diferente.
 */
class PublicChatbot {
    constructor() {
        this.elements = {};
        this.isOpen = false;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.widgetStartX = 0;
        this.widgetStartY = 0;

        this.initDOMElements();
        if (this.elements.fab) {
            this.initEventListeners();
            this.showWelcomeMessageWithDelay();
        }
    }

    initDOMElements() {
        this.elements = {
            fab: document.getElementById('public-chatbot-fab'),
            widget: document.getElementById('public-chat-widget'),
            header: document.getElementById('public-chat-widget').querySelector('.chat-header'),
            closeBtn: document.getElementById('chat-close-btn'),
            messagesContainer: document.getElementById('chat-messages'),
            input: document.getElementById('chat-input-field'),
            sendBtn: document.getElementById('chat-send-btn'),
            suggestionsContainer: document.getElementById('chat-suggestions'),
        };
    }

    initEventListeners() {
        this.elements.fab.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleWidget();
        });
        this.elements.closeBtn.addEventListener('click', () => this.toggleWidget(false));
        this.elements.sendBtn.addEventListener('click', () => this.handleUserInput());
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserInput();
        });
        document.addEventListener('click', (e) => {
            if (!this.elements.widget.contains(e.target) && !this.elements.fab.contains(e.target)) {
                if (this.isOpen) {
                    this.toggleWidget(false);
                }
            }
        });
        this.elements.widget.addEventListener('click', (e) => {
            // Detener la propagación para que el clic dentro del widget no cierre el modal
            e.stopPropagation();
        });

        // Eventos para arrastrar el widget
        this.elements.header.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        this.elements.header.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.drag(e), { passive: false });
        document.addEventListener('touchend', () => this.stopDrag());
    }

    toggleWidget(forceOpen = null) {
        this.isOpen = forceOpen !== null ? forceOpen : !this.isOpen;
        this.elements.widget.classList.toggle('open', this.isOpen);
        this.elements.fab.classList.toggle('open', this.isOpen);
        if (this.isOpen) {
            this.elements.input.focus();
        }
    }

    startDrag(e) {
        if (e.target.closest('.chat-close-btn')) return; // No arrastrar si se hace clic en el botón de cerrar
        
        e.preventDefault();
        this.isDragging = true;
        this.elements.widget.classList.add('dragging');

        const event = e.touches ? e.touches[0] : e;
        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;

        const widgetRect = this.elements.widget.getBoundingClientRect();
        this.widgetStartX = widgetRect.left;
        this.widgetStartY = widgetRect.top;

        // Si el widget se posiciona con 'right' y 'bottom', lo convertimos a 'left' y 'top'
        if (this.elements.widget.style.right) {
            this.elements.widget.style.left = `${this.widgetStartX}px`;
            this.elements.widget.style.top = `${this.widgetStartY}px`;
            this.elements.widget.style.right = '';
            this.elements.widget.style.bottom = '';
            this.elements.widget.style.transform = ''; // Reset transform
        }
    }

    drag(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        const event = e.touches ? e.touches[0] : e;

        const deltaX = event.clientX - this.dragStartX;
        const deltaY = event.clientY - this.dragStartY;

        let newX = this.widgetStartX + deltaX;
        let newY = this.widgetStartY + deltaY;

        // Limitar el movimiento a la ventana visible
        const widgetRect = this.elements.widget.getBoundingClientRect();
        newX = Math.max(0, Math.min(newX, window.innerWidth - widgetRect.width));
        newY = Math.max(0, Math.min(newY, window.innerHeight - widgetRect.height));

        this.elements.widget.style.left = `${newX}px`;
        this.elements.widget.style.top = `${newY}px`;
    }

    stopDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.elements.widget.classList.remove('dragging');
        // Guardar la posición final si se quisiera (opcional)
        // localStorage.setItem('chatbotPos', JSON.stringify({ left: this.elements.widget.style.left, top: this.elements.widget.style.top }));
    }

    async handleUserInput() {
        const userText = this.elements.input.value.trim();
        if (userText === '') return;

        this.addMessage(userText, 'user');
        this.elements.input.value = '';
        this.clearSuggestions();

        const loadingId = this.addMessage('<div class="typing-indicator"><span></span><span></span><span></span></div>', 'bot-loading');

        try {
            const response = await fetch('/api/public-chatbot/response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            this.removeMessage(loadingId);
            this.addMessage(data.text, 'bot');

            if (data.suggestions) {
                this.renderSuggestions(data.suggestions);
            }

        } catch (error) {
            this.removeMessage(loadingId);
            this.addMessage('Lo siento, tengo problemas para conectarme. Inténtalo de nuevo.', 'bot');
            console.error("Public chatbot fetch error:", error);
        }
    }

    addMessage(text, type) {
        const messageId = `msg-${Date.now()}-${Math.random()}`;
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `<div class="message-content">${text}</div>`;
        this.elements.messagesContainer.appendChild(messageDiv);
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
        return messageId;
    }

    removeMessage(id) {
        const msg = document.getElementById(id);
        if (msg) msg.remove();
    }

    renderSuggestions(suggestions) {
        this.elements.suggestionsContainer.innerHTML = '';
        suggestions.forEach(suggestionText => {
            const btn = document.createElement('button');
            btn.textContent = suggestionText;
            btn.className = 'suggestion-btn'; // Añadimos una clase para identificarlo
            btn.onclick = () => {
                this.elements.input.value = suggestionText;
                this.handleUserInput();
            };
            this.elements.suggestionsContainer.appendChild(btn);
        });
    }

    clearSuggestions() {
        this.elements.suggestionsContainer.innerHTML = '';
    }

    async showWelcomeMessageWithDelay() {
        setTimeout(() => {
            const loadingId = this.addMessage('<div class="typing-indicator"><span></span><span></span><span></span></div>', 'bot-loading');
            
            setTimeout(async () => {
                this.removeMessage(loadingId);
                const response = await fetch('/api/public-chatbot/response', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'hola' })
                });
                const data = await response.json();
                this.addMessage(data.text, 'bot');
                if (data.suggestions) {
                    this.renderSuggestions(data.suggestions);
                }
            }
        , 1200); // Simula el tiempo de "escritura"
        }, 800); // Retraso inicial antes de mostrar que está escribiendo
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PublicChatbot();
});