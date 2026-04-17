// js/app.js - Vizyoner ve Asenkron Ana Uygulama Mantığı (Database Entegreli)

const App = {
    // State
    currentWords: [],
    currentIndex: 0,
    currentWord: null,
    isFlipped: false,
    mode: 'flashcard', 
    quizOptions: [],
    quizCorrectIndex: -1,
    sessionStats: { correct: 0, incorrect: 0, xpEarned: 0 },

    async init() {
        try {
            // 1. Veritabanını kesin olarak başlat
            await Database.init();
            
            // 2. Tohumlama (Seeding) işleminin bittiğinden emin ol
            if (typeof WordList !== 'undefined' && WordList.init) {
                await WordList.init();
            }

            // Geleneksel olay dinleyicilerini kur
            this.setupEventListeners();
            
            // Arayüzü güncelle
            await this.updateUI();

            // Öğrenme oturumunu başlat
            await this.startSession();
            
        } catch (error) {
            console.error("Kritik Başlatma Hatası:", error);
            alert("Sistem başlatılamadı. Lütfen sayfayı yenileyin.");
        }
    },

    setupEventListeners() {
        document.getElementById('flashcard')?.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn') && !e.target.closest('.rating-btn')) {
                this.flipCard();
            }
        });

        // Asenkron Değerlendirme Butonları
        document.getElementById('hardBtn')?.addEventListener('click', () => this.rateWord(1));
        document.getElementById('goodBtn')?.addEventListener('click', () => this.rateWord(3));
        document.getElementById('easyBtn')?.addEventListener('click', () => this.rateWord(5));

        // Mod Değiştiriciler
        document.getElementById('flashcardModeBtn')?.addEventListener('click', () => this.setMode('flashcard'));
        document.getElementById('quizModeBtn')?.addEventListener('click', () => this.setMode('quiz'));
        document.getElementById('matchingModeBtn')?.addEventListener('click', () => this.setMode('matching'));

        // Filtreler (Asenkron)
        document.getElementById('categorySelect')?.addEventListener('change', async (e) => {
            await Database.saveSetting('category', e.target.value);
            await this.startSession();
            await this.updateUI();
        });

        document.getElementById('levelSelect')?.addEventListener('change', async (e) => {
            await Database.saveSetting('level', e.target.value);
            await this.startSession();
            await this.updateUI();
        });

        // Ayarlar Modalı
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            document.getElementById('settingsModal').classList.add('active');
        });
        
        document.querySelector('.close-modal')?.addEventListener('click', () => {
            document.getElementById('settingsModal').classList.remove('active');
        });

        // Veri Dışa/İçe Aktar (Statik DOM Bağlantıları)
        document.getElementById('exportBtn')?.addEventListener('click', () => Database.exportData());
        document.getElementById('importBtn')?.addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => Database.importData(ev.target.result);
            reader.readAsText(file);
        });

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Ana Sekme Navigasyonu
        document.querySelectorAll('.main-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                if (!targetTab) return;

                // Tüm sekme butonlarından active sınıfını kaldır
                document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Tüm panellerden active kaldır, hedefi göster
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                const targetPanel = document.getElementById(targetTab + 'Tab');
                if (targetPanel) targetPanel.classList.add('active');

                // İlk açılışta modülleri tetikle
                if (targetTab === 'stats' && typeof Stats !== 'undefined') Stats.render();
                if (targetTab === 'patterns' && typeof Patterns !== 'undefined') Patterns.init();
                if (targetTab === 'wordlist' && typeof WordList !== 'undefined') WordList.applyFilters();
                if (targetTab === 'dictionary' && typeof Dictionary !== 'undefined') Dictionary.init();
            });
        });
    },

    async startSession() {
        const level = await Database.getSetting('level', 'a1');
        
        // RAM'deki şişkin diziler yerine doğrudan veritabanı motorundan veri çekiyoruz
        this.currentWords = await SRS.getWordsToStudy(level, 20);
        this.currentIndex = 0;
        this.sessionStats = { correct: 0, incorrect: 0, xpEarned: 0 };

        if (this.currentWords.length > 0) {
            this.showWord(this.currentWords[0]);
        } else {
            this.showEmptyState();
        }
    },

    showWord(word) {
        this.currentWord = word;
        this.isFlipped = false;

        const card = document.getElementById('flashcard');
        const front = document.getElementById('cardFront');
        const back = document.getElementById('cardBack');

        card.style.transition = 'none';
        card.classList.remove('flipped');
        card.offsetHeight; // Reflow
        card.style.transition = '';

        front.querySelector('.word').textContent = word.word;
        
        back.querySelector('.translation').textContent = word.translation;

        document.getElementById('ratingBtns').classList.remove('show');
        this.updateProgress();

        if (this.mode === 'quiz') {
            this.setupQuiz(word);
        } else {
            document.querySelectorAll('.progress-section, .sidebar-stats, .keyboard-hint').forEach(el => el.style.display = '');
            document.getElementById('quizArea')?.classList.remove('active');
        }
    },

    flipCard() {
        if (this.mode !== 'flashcard') return;
        const card = document.getElementById('flashcard');
        this.isFlipped = !this.isFlipped;
        
        if (this.isFlipped) {
            card.classList.add('flipped');
            document.getElementById('ratingBtns').classList.add('show');
        } else {
            card.classList.remove('flipped');
            document.getElementById('ratingBtns').classList.remove('show');
        }
    },

    async rateWord(quality) {
        if (!this.currentWord || this.isProcessing) return;
        this.isProcessing = true; // Double-click koruması

        try {
            // SRS motoru ve veritabanı işlemlerini bekliyoruz
            const updatedProgress = await SRS.saveReview(this.currentWord.id, quality);
            
            // İstatistikleri güncelle
            const xp = (quality === 5 ? 10 : quality === 3 ? 5 : 2);
            this.sessionStats.xpEarned += xp;
            if (quality >= 3) this.sessionStats.correct++;
            else this.sessionStats.incorrect++;

            this.showXPPopup(xp);
            
            this.currentIndex++;
            if (this.currentIndex < this.currentWords.length) {
                this.showWord(this.currentWords[this.currentIndex]);
            } else {
                this.showSessionComplete();
            }
            
            await this.updateUI();
        } catch (error) {
            console.error("Puanlama hatası:", error);
        } finally {
            this.isProcessing = false;
        }
    },

    async setupQuiz(word) {
        // Asenkron veri çekimi (Tüm kelimelerden rastgele yanlış cevap bulmak için)
        const allWords = await Database._getAll('words');
        const levelWords = allWords.filter(w => w.level === word.level && w.id !== word.id);
        
        const wrongAnswers = levelWords.sort(() => Math.random() - 0.5).slice(0, 3);
        
        this.quizOptions = [...wrongAnswers, word].sort(() => Math.random() - 0.5);
        this.quizCorrectIndex = this.quizOptions.findIndex(w => w.id === word.id);

        const quizArea = document.getElementById('quizArea');
        const optionBtns = quizArea.querySelectorAll('.quiz-option');

        optionBtns.forEach((btn, index) => {
            const opt = this.quizOptions[index];
            const answerText = btn.querySelector('.quiz-answer-text');
            if (answerText) answerText.textContent = opt.translation;
            else btn.textContent = opt.translation;
            
            btn.classList.remove('correct', 'incorrect', 'disabled');
            btn.style.animation = `quizOptionIn 0.3s ease ${index * 0.08}s both`;
            
            // Eski event listener'ları temizle ve yenisini ekle
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => this.selectQuizOption(index));
        });

        quizArea.classList.add('active');
        document.getElementById('cardBack').style.display = 'none';
        document.querySelectorAll('.progress-section, .sidebar-stats, .keyboard-hint, #ratingBtns').forEach(el => el.style.display = 'none');
    },

    async selectQuizOption(index) {
        const optionBtns = document.querySelectorAll('.quiz-option');
        optionBtns.forEach(btn => btn.classList.add('disabled'));

        if (index === this.quizCorrectIndex) {
            optionBtns[index].classList.add('correct');
            await this.rateWord(5);
        } else {
            optionBtns[index].classList.add('incorrect');
            optionBtns[this.quizCorrectIndex].classList.add('correct');
            
            setTimeout(async () => {
                await this.rateWord(1);
            }, 1500);
        }
    },

    setMode(mode) {
        this.mode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${mode}ModeBtn`)?.classList.add('active');

        const quizArea = document.getElementById('quizArea');
        const cardBack = document.getElementById('cardBack');
        const ratingBtns = document.getElementById('ratingBtns');
        const matchingContainer = document.getElementById('matchingGameContainer');

        if (mode === 'matching') {
            document.querySelector('.flashcard-container').style.display = 'none';
            if (matchingContainer) matchingContainer.style.display = 'block';
        } else if (mode === 'quiz') {
            if (matchingContainer) matchingContainer.style.display = 'none';
            document.querySelector('.flashcard-container').style.display = '';
            quizArea.classList.add('active');
            cardBack.style.display = 'none';
            if (this.currentWord) this.setupQuiz(this.currentWord);
        } else {
            if (matchingContainer) matchingContainer.style.display = 'none';
            document.querySelector('.flashcard-container').style.display = '';
            quizArea.classList.remove('active');
            cardBack.style.display = '';
            this.isFlipped = false;
            document.getElementById('flashcard').classList.remove('flipped');
        }
    },

    async updateUI() {
        const level = await Database.getSetting('level', 'all');
        const category = await Database.getSetting('category', 'all');
        
        const catSelect = document.getElementById('categorySelect');
        const lvlSelect = document.getElementById('levelSelect');
        if (catSelect) catSelect.value = category;
        if (lvlSelect) lvlSelect.value = level;
    },

    updateProgress() {
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('sessionProgress');
        const current = this.currentIndex + 1;
        const total = this.currentWords.length;
        if(progressText) progressText.textContent = `${current} / ${total}`;
        if(progressBar) progressBar.style.width = `${(current / total) * 100}%`;
    },

    showXPPopup(xp) {
        const popup = document.createElement('div');
        popup.className = 'xp-popup';
        popup.textContent = `+${xp} XP`;
        document.body.appendChild(popup);
        setTimeout(() => popup.classList.add('show'), 10);
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 300);
        }, 1000);
    },

    showSessionComplete() {
        const card = document.getElementById('flashcard');
        card.classList.remove('flipped');
        this.isFlipped = false;

        card.innerHTML = `
            <div class="session-complete">
                <div class="complete-icon">🎉</div>
                <h2>Tebrikler!</h2>
                <div class="session-stats">
                    <div class="stat"><span class="stat-value">${this.sessionStats.correct}</span><span class="stat-label">Doğru</span></div>
                    <div class="stat"><span class="stat-value">${this.sessionStats.incorrect}</span><span class="stat-label">Yanlış</span></div>
                    <div class="stat"><span class="stat-value">+${this.sessionStats.xpEarned}</span><span class="stat-label">XP</span></div>
                </div>
                <button class="restart-btn" onclick="App.restart()">Yeni Oturum</button>
            </div>
        `;
        document.getElementById('ratingBtns')?.classList.remove('show');
        document.getElementById('quizArea')?.classList.remove('active');
    },

    showEmptyState() {
        const card = document.getElementById('flashcard');
        card.classList.remove('flipped');
        this.isFlipped = false;
        card.innerHTML = `<div class="empty-state"><h2>Harika!</h2><p>Şu an çalışılacak kelime yok.</p></div>`;
    },

    async restart() {
        location.reload(); // En güvenli ve geleneksel sıfırlama yöntemi
    },

    handleKeyboard(e) {
        if (this.mode !== 'flashcard' || !this.isFlipped) {
            if (e.key === ' ' || e.key === 'Enter') this.flipCard();
            return;
        }
        switch (e.key) {
            case '1': this.rateWord(1); break;
            case '2': this.rateWord(3); break;
            case '3': this.rateWord(5); break;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
