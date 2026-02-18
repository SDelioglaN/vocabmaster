// chatbot.js - AI English Learning Assistant powered by Gemini

const Chatbot = {
    API_KEY: 'AIzaSyCeVYCibF5AJJOwvKh7gu7_1Sqliub1_uw',
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    isOpen: false,
    messages: [],
    isLoading: false,

    SYSTEM_PROMPT: `Sen VocabMaster uygulamasının yapay zeka İngilizce öğrenme asistanısın. Adın "VocabAI".

Görevlerin:
- Kullanıcıya İngilizce kelime ve deyim açıklamak
- İngilizce-Türkçe çeviri yapmak
- Gramer hatalarını düzeltmek ve açıklamak
- İngilizce cümle örnekleri vermek
- İngilizce pratik yapmaya yardımcı olmak
- Kelime kullanım önerileri sunmak

Kurallar:
- Kullanıcı Türkçe yazarsa Türkçe cevap ver
- Kullanıcı İngilizce yazarsa İngilizce cevap ver ama Türkçe açıklama da ekle
- Cevapları kısa ve öz tut, uzun paragraflar yazma
- Örnekler verirken emoji kullan
- Her zaman arkadaşça ve motive edici ol
- Kelime öğretirken fonetik yazımı da ver
- Gramer açıklarken basit Türkçe kullan`,

    /**
     * Initialize chatbot
     */
    init() {
        this.createUI();
        this.setupEventListeners();
        this.loadHistory();
    },

    /**
     * Create chatbot UI elements
     */
    createUI() {
        // Floating button
        const fab = document.createElement('div');
        fab.id = 'chatbot-fab';
        fab.innerHTML = '<i class="fas fa-robot"></i>';
        fab.title = 'AI Asistan';
        document.body.appendChild(fab);

        // Chat panel
        const panel = document.createElement('div');
        panel.id = 'chatbot-panel';
        panel.innerHTML = `
            <div class="chatbot-header">
                <div class="chatbot-header-info">
                    <div class="chatbot-avatar"><i class="fas fa-robot"></i></div>
                    <div>
                        <h3>VocabAI</h3>
                        <span class="chatbot-status">İngilizce Öğrenme Asistanı</span>
                    </div>
                </div>
                <div class="chatbot-header-actions">
                    <button id="chatbot-clear" title="Sohbeti Temizle"><i class="fas fa-trash"></i></button>
                    <button id="chatbot-close" title="Kapat"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div class="chatbot-messages" id="chatbot-messages">
                <div class="chatbot-welcome">
                    <div class="chatbot-welcome-icon"><i class="fas fa-robot"></i></div>
                    <h3>Merhaba! Ben VocabAI 🤖</h3>
                    <p>İngilizce öğrenme asistanınım. Bana her şeyi sorabilirsin!</p>
                    <div class="chatbot-suggestions">
                        <button class="chatbot-suggestion" data-text="'get' fiilinin farklı kullanımları neler?">"get" fiili kullanımları</button>
                        <button class="chatbot-suggestion" data-text="expense tracking ne demek?">Bir deyim çevir</button>
                        <button class="chatbot-suggestion" data-text="I goed to school yesterday - bu cümle doğru mu?">Gramer kontrolü</button>
                        <button class="chatbot-suggestion" data-text="Bana B2 seviyesinde 5 kelime öğret">Kelime öğret</button>
                    </div>
                </div>
            </div>
            <div class="chatbot-input-area">
                <input type="text" id="chatbot-input" placeholder="Mesajını yaz..." autocomplete="off">
                <button id="chatbot-send"><i class="fas fa-paper-plane"></i></button>
            </div>
        `;
        document.body.appendChild(panel);
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle chat
        document.getElementById('chatbot-fab').addEventListener('click', () => this.toggle());
        document.getElementById('chatbot-close').addEventListener('click', () => this.close());

        // Send message
        document.getElementById('chatbot-send').addEventListener('click', () => this.sendMessage());
        document.getElementById('chatbot-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Clear chat
        document.getElementById('chatbot-clear').addEventListener('click', () => this.clearChat());

        // Suggestion buttons
        document.querySelectorAll('.chatbot-suggestion').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('chatbot-input').value = btn.dataset.text;
                this.sendMessage();
            });
        });
    },

    /**
     * Toggle chat panel
     */
    toggle() {
        this.isOpen = !this.isOpen;
        document.getElementById('chatbot-panel').classList.toggle('open', this.isOpen);
        document.getElementById('chatbot-fab').classList.toggle('active', this.isOpen);
        if (this.isOpen) {
            document.getElementById('chatbot-input').focus();
        }
    },

    /**
     * Close chat panel
     */
    close() {
        this.isOpen = false;
        document.getElementById('chatbot-panel').classList.remove('open');
        document.getElementById('chatbot-fab').classList.remove('active');
    },

    /**
     * Send message to Gemini API
     */
    async sendMessage() {
        const input = document.getElementById('chatbot-input');
        const text = input.value.trim();
        if (!text || this.isLoading) return;

        input.value = '';

        // Add user message
        this.addMessage('user', text);

        // Show loading
        this.isLoading = true;
        const loadingId = this.showLoading();

        try {
            // Build conversation history for context
            const contents = [];

            // Add system prompt as first user message
            contents.push({
                role: 'user',
                parts: [{ text: this.SYSTEM_PROMPT + '\n\nKullanıcı mesajı: ' + (this.messages.length > 2 ? this.messages[this.messages.length - 3]?.text || '' : '') }]
            });
            contents.push({
                role: 'model',
                parts: [{ text: 'Anladım, VocabAI olarak İngilizce öğrenme asistanı olarak hazırım!' }]
            });

            // Add recent conversation history (last 6 messages for context)
            const recentMessages = this.messages.slice(-6);
            for (const msg of recentMessages) {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                });
            }

            // API call
            const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.8,
                        topK: 40,
                        maxOutputTokens: 1024
                    }
                })
            });

            const data = await response.json();

            // Remove loading
            this.removeLoading(loadingId);

            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                const reply = data.candidates[0].content.parts[0].text;
                this.addMessage('bot', reply);
            } else if (data.error) {
                this.addMessage('bot', `⚠️ Hata: ${data.error.message || 'Bilinmeyen hata'}`);
            } else {
                this.addMessage('bot', '⚠️ Yanıt alınamadı, tekrar dene.');
            }

        } catch (error) {
            this.removeLoading(loadingId);
            this.addMessage('bot', '⚠️ Bağlantı hatası. İnternet bağlantını kontrol et.');
            console.error('Chatbot error:', error);
        }

        this.isLoading = false;
        this.saveHistory();
    },

    /**
     * Add message to chat
     */
    addMessage(role, text) {
        this.messages.push({ role, text, time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) });

        const container = document.getElementById('chatbot-messages');

        // Hide welcome message
        const welcome = container.querySelector('.chatbot-welcome');
        if (welcome) welcome.style.display = 'none';

        const msgEl = document.createElement('div');
        msgEl.className = `chatbot-msg chatbot-msg-${role}`;

        // Format bot text with markdown-like styling
        let formattedText = text;
        if (role === 'bot') {
            formattedText = this.formatBotText(text);
        }

        msgEl.innerHTML = `
            <div class="chatbot-msg-content">
                ${role === 'bot' ? '<div class="chatbot-msg-avatar"><i class="fas fa-robot"></i></div>' : ''}
                <div class="chatbot-msg-bubble">
                    <div class="chatbot-msg-text">${formattedText}</div>
                    <span class="chatbot-msg-time">${this.messages[this.messages.length - 1].time}</span>
                </div>
            </div>
        `;

        container.appendChild(msgEl);
        container.scrollTop = container.scrollHeight;
    },

    /**
     * Format bot text with simple markdown
     */
    formatBotText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    },

    /**
     * Show loading indicator
     */
    showLoading() {
        const container = document.getElementById('chatbot-messages');
        const id = 'loading-' + Date.now();
        const loadingEl = document.createElement('div');
        loadingEl.id = id;
        loadingEl.className = 'chatbot-msg chatbot-msg-bot';
        loadingEl.innerHTML = `
            <div class="chatbot-msg-content">
                <div class="chatbot-msg-avatar"><i class="fas fa-robot"></i></div>
                <div class="chatbot-msg-bubble chatbot-typing">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        container.appendChild(loadingEl);
        container.scrollTop = container.scrollHeight;
        return id;
    },

    /**
     * Remove loading indicator
     */
    removeLoading(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    },

    /**
     * Clear chat history
     */
    clearChat() {
        this.messages = [];
        const container = document.getElementById('chatbot-messages');
        container.innerHTML = `
            <div class="chatbot-welcome">
                <div class="chatbot-welcome-icon"><i class="fas fa-robot"></i></div>
                <h3>Merhaba! Ben VocabAI 🤖</h3>
                <p>İngilizce öğrenme asistanınım. Bana her şeyi sorabilirsin!</p>
                <div class="chatbot-suggestions">
                    <button class="chatbot-suggestion" data-text="'get' fiilinin farklı kullanımları neler?">"get" fiili kullanımları</button>
                    <button class="chatbot-suggestion" data-text="expense tracking ne demek?">Bir deyim çevir</button>
                    <button class="chatbot-suggestion" data-text="I goed to school yesterday - bu cümle doğru mu?">Gramer kontrolü</button>
                    <button class="chatbot-suggestion" data-text="Bana B2 seviyesinde 5 kelime öğret">Kelime öğret</button>
                </div>
            </div>
        `;
        // Re-attach suggestion listeners
        container.querySelectorAll('.chatbot-suggestion').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('chatbot-input').value = btn.dataset.text;
                this.sendMessage();
            });
        });
        localStorage.removeItem('vocabmaster_chat_history');
    },

    /**
     * Save chat history to localStorage
     */
    saveHistory() {
        const recent = this.messages.slice(-20); // Keep last 20 messages
        localStorage.setItem('vocabmaster_chat_history', JSON.stringify(recent));
    },

    /**
     * Load chat history from localStorage
     */
    loadHistory() {
        try {
            const saved = localStorage.getItem('vocabmaster_chat_history');
            if (saved) {
                const messages = JSON.parse(saved);
                messages.forEach(msg => this.addMessage(msg.role, msg.text));
            }
        } catch (e) {
            console.warn('Failed to load chat history:', e);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => Chatbot.init(), 500);
});
