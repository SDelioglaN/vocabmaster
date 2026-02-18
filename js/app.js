// app.js - Main application logic

const App = {
    // State
    words: [],
    currentWords: [],
    currentIndex: 0,
    currentWord: null,
    isFlipped: false,
    mode: 'flashcard', // flashcard, quiz, matching
    quizOptions: [],
    quizCorrectIndex: -1,
    sessionStats: {
        correct: 0,
        incorrect: 0,
        xpEarned: 0
    },

    /**
     * Initialize the application
     */
    async init() {
        // Initialize storage
        Storage.init();

        // Initialize speech (only used when user clicks speaker icon, never auto-play)
        try { Speech.init(); } catch (e) { console.warn('TTS init skipped:', e); }

        // Check and update streak
        Storage.checkStreakStatus();

        // Load words
        await this.loadWords();

        // Apply level filter if set
        this.applyLevelFilter();

        // Setup event listeners
        this.setupEventListeners();

        // Update UI
        this.updateUI();

        // Start with flashcard mode
        this.startSession();
    },

    // All category IDs
    categories: ['senses', 'kitchen', 'home', 'family', 'work', 'shopping', 'travel', 'health', 'education', 'emotions', 'weather', 'hobbies', 'technology', 'clothing', 'city', 'sports', 'music', 'nature', 'food', 'finance', 'law', 'science', 'relationships', 'business', 'computer', 'daily', 'academic', 'animals', 'arts'],

    /**
     * Load words from JSON files (categories)
     */
    async loadWords() {
        const settings = Storage.getSettings();
        const category = settings.category || 'all';

        try {
            if (category === 'all') {
                // Load all categories
                await this.loadAllCategories();
            } else {
                // Load single category
                const response = await fetch(`data/categories/${category}.json`);
                this.words = await response.json();
                // Add category info to each word
                this.words = this.words.map(w => ({ ...w, category }));
            }
        } catch (error) {
            console.error('Error loading words:', error);
            this.words = [];
        }
    },

    /**
     * Load all categories and merge them
     */
    async loadAllCategories() {
        const allWords = [];

        for (const categoryId of this.categories) {
            try {
                const response = await fetch(`data/categories/${categoryId}.json`);
                const words = await response.json();
                // Add category info and create unique IDs
                words.forEach(w => {
                    allWords.push({
                        ...w,
                        id: `${categoryId}_${w.id}`,
                        category: categoryId
                    });
                });
            } catch (error) {
                console.error(`Error loading category ${categoryId}:`, error);
            }
        }

        this.words = allWords;
        console.log(`Loaded ${allWords.length} words from all categories`);
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Flashcard click to flip
        document.getElementById('flashcard').addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn') && !e.target.closest('.rating-btn')) {
                this.flipCard();
            }
        });

        // Speak button
        document.getElementById('speakBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.speakWord();
        });

        // Rating buttons
        document.getElementById('hardBtn').addEventListener('click', () => this.rateWord(1));
        document.getElementById('goodBtn').addEventListener('click', () => this.rateWord(3));
        document.getElementById('easyBtn').addEventListener('click', () => this.rateWord(5));

        // Mode buttons
        document.getElementById('flashcardModeBtn').addEventListener('click', () => this.setMode('flashcard'));
        document.getElementById('quizModeBtn').addEventListener('click', () => this.setMode('quiz'));
        document.getElementById('matchingModeBtn').addEventListener('click', () => this.setMode('matching'));

        // Category selector
        document.getElementById('categorySelect').addEventListener('change', (e) => this.changeCategory(e.target.value));

        // Level selector
        document.getElementById('levelSelect').addEventListener('change', (e) => this.changeLevel(e.target.value));

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());

        // Close modal
        document.querySelector('.close-modal').addEventListener('click', () => this.closeSettings());

        // Settings inputs
        document.getElementById('speechRate').addEventListener('input', (e) => {
            document.getElementById('rateValue').textContent = e.target.value + 'x';
            Speech.setRate(parseFloat(e.target.value));
        });

        // Quiz options
        document.querySelectorAll('.quiz-option').forEach((btn, index) => {
            btn.addEventListener('click', () => this.selectQuizOption(index));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    },

    /**
     * Start a new study session
     */
    startSession() {
        const progress = Storage.getProgress();
        const settings = Storage.getSettings();
        const category = settings.category || 'all';

        this.currentWords = SRS.getWordsToStudy(this.words, progress, category, 20);
        this.currentIndex = 0;
        this.sessionStats = { correct: 0, incorrect: 0, xpEarned: 0 };

        if (this.currentWords.length > 0) {
            this.showWord(this.currentWords[0]);
        } else {
            this.showEmptyState();
        }
    },

    /**
     * Show a word on the flashcard
     */
    showWord(word) {
        this.currentWord = word;
        this.isFlipped = false;

        const card = document.getElementById('flashcard');
        const front = document.getElementById('cardFront');
        const back = document.getElementById('cardBack');

        // Temporarily disable transition to prevent flash of back side
        card.style.transition = 'none';
        card.classList.remove('flipped');

        // Force reflow to apply the change immediately
        card.offsetHeight;

        // Re-enable transition
        card.style.transition = '';

        // Update front
        front.querySelector('.word').textContent = word.word;
        front.querySelector('.phonetic').textContent = word.phonetic;

        // Update back
        back.querySelector('.translation').textContent = word.translation;
        back.querySelector('.example').textContent = word.example;
        back.querySelector('.example-tr').textContent = word.exampleTr;

        // Hide rating buttons initially
        document.getElementById('ratingBtns').classList.remove('show');

        // Update progress indicator
        this.updateProgress();

        // If quiz mode, setup quiz; otherwise restore progress/stats
        if (this.mode === 'quiz') {
            this.setupQuiz(word);
        } else {
            // Restore all elements hidden during quiz mode
            const restoreElements = [
                '.progress-section',
                '.sidebar-stats',
                '.keyboard-hint'
            ];
            restoreElements.forEach(sel => {
                const el = document.querySelector(sel);
                if (el) el.style.display = '';
            });
            const quizArea = document.getElementById('quizArea');
            if (quizArea) quizArea.classList.remove('active');
        }
    },

    /**
     * Flip the flashcard
     */
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

    /**
     * Speak the current word
     */
    speakWord() {
        if (this.currentWord) {
            Speech.speakWord(this.currentWord.word);
        }
    },

    /**
     * Rate the current word and move to next
     */
    rateWord(quality) {
        if (!this.currentWord) return;

        const settings = Storage.getSettings();
        const category = this.currentWord.category || settings.category || 'all';
        const wordProgress = Storage.getWordProgress(this.currentWord.id, category);

        // Calculate new progress
        const newProgress = SRS.calculateNextReview(wordProgress, quality);

        // Get XP reward
        const xp = SRS.getXPReward(quality, wordProgress.status);
        Storage.addXP(xp);
        this.sessionStats.xpEarned += xp;

        // Save progress
        Storage.saveWordProgress(this.currentWord.id, category, newProgress);

        // Update streak
        Storage.updateStreak();

        // Update stats
        if (quality >= 3) {
            this.sessionStats.correct++;
            if (wordProgress.status === 'new') {
                Storage.incrementWordsLearned();
            }
        } else {
            this.sessionStats.incorrect++;
        }

        // Track daily activity (wrapped in try-catch to not block word progression)
        try {
            Storage.updateDailyLog({
                wordsStudied: 1,
                xpEarned: xp,
                correctAnswers: quality >= 3 ? 1 : 0,
                totalAnswers: 1
            });
        } catch (e) {
            console.warn('Daily log update failed:', e);
        }

        // Show XP animation
        this.showXPPopup(xp);

        // Move to next word
        this.nextWord();

        // Update UI
        this.updateUI();
    },

    /**
     * Move to next word
     */
    nextWord() {
        this.currentIndex++;

        if (this.currentIndex < this.currentWords.length) {
            this.showWord(this.currentWords[this.currentIndex]);
        } else {
            this.showSessionComplete();
        }
    },

    /**
     * Setup quiz mode for a word
     */
    setupQuiz(word) {
        // Get 3 random wrong answers
        const wrongAnswers = this.words
            .filter(w => w.id !== word.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        // Combine with correct answer and shuffle
        this.quizOptions = [...wrongAnswers, word].sort(() => Math.random() - 0.5);
        this.quizCorrectIndex = this.quizOptions.findIndex(w => w.id === word.id);

        // Update quiz UI
        const quizArea = document.getElementById('quizArea');
        const optionBtns = quizArea.querySelectorAll('.quiz-option');

        optionBtns.forEach((btn, index) => {
            const answerText = btn.querySelector('.quiz-answer-text');
            if (answerText) {
                answerText.textContent = this.quizOptions[index].translation;
            } else {
                btn.textContent = this.quizOptions[index].translation;
            }
            btn.classList.remove('correct', 'incorrect', 'disabled');
            btn.style.animation = `quizOptionIn 0.3s ease ${index * 0.08}s both`;
        });

        // Show quiz area, hide overlapping elements
        quizArea.classList.add('active');
        document.getElementById('cardBack').style.display = 'none';

        // Hide all elements that overlap with quiz
        const hideElements = [
            '.progress-section',
            '.sidebar-stats',
            '.keyboard-hint',
            '#ratingBtns'
        ];
        hideElements.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.display = 'none';
        });
    },

    /**
     * Handle quiz option selection
     */
    selectQuizOption(index) {
        const optionBtns = document.querySelectorAll('.quiz-option');

        // Disable all buttons
        optionBtns.forEach(btn => btn.classList.add('disabled'));

        // Show correct/incorrect
        if (index === this.quizCorrectIndex) {
            optionBtns[index].classList.add('correct');
            this.rateWord(5); // Easy for correct quiz answer
        } else {
            optionBtns[index].classList.add('incorrect');
            optionBtns[this.quizCorrectIndex].classList.add('correct');
            Storage.recordQuizAnswer(false);

            // Wait and then rate as hard
            setTimeout(() => {
                this.rateWord(1);
            }, 1500);
        }

        Storage.recordQuizAnswer(index === this.quizCorrectIndex);
    },

    /**
     * Set study mode
     */
    setMode(mode) {
        this.mode = mode;

        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${mode}ModeBtn`).classList.add('active');

        // Toggle quiz/flashcard/matching specific elements
        const quizArea = document.getElementById('quizArea');
        const cardBack = document.getElementById('cardBack');
        const ratingBtns = document.getElementById('ratingBtns');
        const flashcardContainer = document.querySelector('.flashcard-container');
        const progressSection = document.querySelector('.progress-section');
        const sidebarStats = document.querySelector('.sidebar-stats');
        const matchingContainer = document.getElementById('matchingGameContainer');

        if (mode === 'matching') {
            // Hide flashcard/quiz elements
            if (flashcardContainer) flashcardContainer.style.display = 'none';
            if (ratingBtns) ratingBtns.style.display = 'none';
            if (progressSection) progressSection.style.display = 'none';
            if (sidebarStats) sidebarStats.style.display = 'none';
            if (quizArea) quizArea.classList.remove('active');
            // Show matching game
            if (matchingContainer) matchingContainer.style.display = 'block';
        } else if (mode === 'quiz') {
            // Hide matching
            if (matchingContainer) matchingContainer.style.display = 'none';
            // Show flashcard elements
            if (flashcardContainer) flashcardContainer.style.display = '';
            if (ratingBtns) ratingBtns.style.display = '';
            if (progressSection) progressSection.style.display = '';
            if (sidebarStats) sidebarStats.style.display = '';
            quizArea.classList.add('active');
            cardBack.style.display = 'none';
            ratingBtns.classList.remove('show');
            if (this.currentWord) {
                this.setupQuiz(this.currentWord);
            }
        } else {
            // Flashcard mode
            // Hide matching
            if (matchingContainer) matchingContainer.style.display = 'none';
            // Show flashcard elements
            if (flashcardContainer) flashcardContainer.style.display = '';
            if (ratingBtns) ratingBtns.style.display = '';
            if (progressSection) progressSection.style.display = '';
            if (sidebarStats) sidebarStats.style.display = '';
            quizArea.classList.remove('active');
            cardBack.style.display = '';
            this.isFlipped = false;
            document.getElementById('flashcard').classList.remove('flipped');
        }
    },

    /**
     * Change vocabulary category
     */
    async changeCategory(category) {
        Storage.updateSetting('category', category);
        await this.loadWords();
        this.applyLevelFilter();
        this.startSession();
        this.updateUI();
    },

    /**
     * Change vocabulary level
     */
    async changeLevel(level) {
        Storage.updateSetting('level', level);
        await this.loadWords(); // Reload all words first
        this.applyLevelFilter();
        this.startSession();
        this.updateUI();
    },

    /**
     * Apply level filter to loaded words
     */
    applyLevelFilter() {
        const settings = Storage.getSettings();
        const level = settings.level || 'all';

        if (level === 'all') {
            // No filtering needed
            return;
        }

        // Filter words by their actual level field from JSON data
        this.words = this.words.filter(w => {
            if (w.level) {
                return w.level === level;
            }
            return true; // Keep words without level field
        });

        console.log(`Level ${level}: ${this.words.length} words selected`);
    },

    /**
     * Update all UI elements
     */
    updateUI() {
        // Update streak
        const streak = Storage.getStreak();
        document.getElementById('streakCount').textContent = streak.current;

        // Update XP and level
        const stats = Storage.getStats();
        const levelInfo = Storage.calculateLevel(stats.totalXP);
        document.getElementById('xpCount').textContent = stats.totalXP;
        document.getElementById('userLevel').textContent = `Seviye ${levelInfo.level}`;
        document.getElementById('levelProgress').style.width = `${levelInfo.progressPercent}%`;

        // Update category selector
        const settings = Storage.getSettings();
        document.getElementById('categorySelect').value = settings.category || 'all';

        // Update level selector
        document.getElementById('levelSelect').value = settings.level || 'all';

        // Update speech rate
        document.getElementById('speechRate').value = settings.speechRate || 1;
        document.getElementById('rateValue').textContent = (settings.speechRate || 1) + 'x';

        // Update study summary
        const summary = SRS.getStudySummary(Storage.getProgress(), settings.category || 'all');
        document.getElementById('dueCount').textContent = summary.due;
        document.getElementById('learningCount').textContent = summary.learning;
        document.getElementById('masteredCount').textContent = summary.mastered;
    },

    /**
     * Update progress indicator
     */
    updateProgress() {
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('sessionProgress');

        const current = this.currentIndex + 1;
        const total = this.currentWords.length;
        const percent = (current / total) * 100;

        progressText.textContent = `${current} / ${total}`;
        progressBar.style.width = `${percent}%`;
    },

    /**
     * Show XP popup animation
     */
    showXPPopup(xp) {
        const popup = document.createElement('div');
        popup.className = 'xp-popup';
        popup.textContent = `+${xp} XP`;
        document.body.appendChild(popup);

        // Animate and remove
        setTimeout(() => popup.classList.add('show'), 10);
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 300);
        }, 1000);
    },

    /**
     * Show session complete screen
     */
    showSessionComplete() {
        const card = document.getElementById('flashcard');

        // Reset flip state to prevent mirrored content
        card.classList.remove('flipped');
        this.isFlipped = false;

        card.innerHTML = `
            <div class="session-complete">
                <div class="complete-icon">🎉</div>
                <h2>Tebrikler!</h2>
                <p>Bu oturumu tamamladın</p>
                <div class="session-stats">
                    <div class="stat">
                        <span class="stat-value">${this.sessionStats.correct}</span>
                        <span class="stat-label">Doğru</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${this.sessionStats.incorrect}</span>
                        <span class="stat-label">Yanlış</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">+${this.sessionStats.xpEarned}</span>
                        <span class="stat-label">XP</span>
                    </div>
                </div>
                <button class="restart-btn" onclick="App.restart()">
                    <i class="fas fa-redo"></i> Yeni Oturum
                </button>
            </div>
        `;

        document.getElementById('ratingBtns').classList.remove('show');
        document.getElementById('quizArea').classList.remove('active');
    },

    /**
     * Show empty state when no words to study
     */
    showEmptyState() {
        const card = document.getElementById('flashcard');

        // Reset flip state to prevent mirrored content
        card.classList.remove('flipped');
        this.isFlipped = false;

        card.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h2>Harika!</h2>
                <p>Şu an çalışılacak kelime yok.</p>
                <p class="sub">Daha sonra tekrar gel veya seviye değiştir.</p>
            </div>
        `;
    },

    /**
     * Restart session
     */
    restart() {
        const flashcard = document.getElementById('flashcard');

        // Reset flip state
        flashcard.classList.remove('flipped');
        this.isFlipped = false;

        // Rebuild card HTML with quiz area
        flashcard.innerHTML = `
            <div class="card-inner">
                <div class="card-front" id="cardFront">
                    <div class="word-container">
                        <h1 class="word"></h1>
                        <p class="phonetic"></p>
                    </div>
                    <button class="action-btn" id="speakBtn" title="Dinle">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    <p class="flip-hint">Çevirmek için tıkla</p>
                </div>
                <div class="card-back" id="cardBack">
                    <h2 class="translation"></h2>
                    <div class="example-container">
                        <p class="example"></p>
                        <p class="example-tr"></p>
                    </div>
                </div>
            </div>
            <div class="quiz-area" id="quizArea">
                <button class="quiz-option"></button>
                <button class="quiz-option"></button>
                <button class="quiz-option"></button>
                <button class="quiz-option"></button>
            </div>
        `;

        // Re-setup event listeners for new elements
        flashcard.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn') && !e.target.closest('.rating-btn') && !e.target.closest('.quiz-option') && !e.target.closest('.restart-btn')) {
                this.flipCard();
            }
        });

        document.getElementById('speakBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.speakWord();
        });

        // Re-setup quiz option listeners
        document.querySelectorAll('.quiz-option').forEach((btn, index) => {
            btn.addEventListener('click', () => this.selectQuizOption(index));
        });

        // Start new session
        this.startSession();
    },

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        switch (e.key) {
            case ' ':
            case 'Enter':
                if (this.mode === 'flashcard') {
                    this.flipCard();
                }
                break;
            case '1':
                if (this.isFlipped) this.rateWord(1);
                break;
            case '2':
                if (this.isFlipped) this.rateWord(3);
                break;
            case '3':
                if (this.isFlipped) this.rateWord(5);
                break;
            case 's':
                this.speakWord();
                break;
        }
    },

    /**
     * Open settings modal
     */
    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
    },

    /**
     * Close settings modal
     */
    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
