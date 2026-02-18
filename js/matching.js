// matching.js - Eşleştirme Oyunu (Matching Game) logic

const MatchingGame = {
    // State
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 6,
    moves: 0,
    timer: null,
    seconds: 0,
    isLocked: false,
    gameActive: false,
    selectedWords: [],

    /**
     * Initialize the matching game
     */
    init() {
        this.setupEventListeners();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const startBtn = document.getElementById('matchingStartBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }

        const restartBtn = document.getElementById('matchingRestartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.startGame());
        }
    },

    /**
     * Start a new matching game
     */
    startGame() {
        // Reset state
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.seconds = 0;
        this.isLocked = false;
        this.gameActive = true;

        // Get words from App
        const words = this.getGameWords();
        if (words.length < this.totalPairs) {
            this.showNotEnoughWords();
            return;
        }

        this.selectedWords = words.slice(0, this.totalPairs);

        // Create card pairs (English + Turkish)
        this.cards = [];
        this.selectedWords.forEach((word, index) => {
            // English card
            this.cards.push({
                id: index,
                pairId: index,
                text: word.word,
                type: 'english',
                matched: false,
                wordData: word
            });
            // Turkish card
            this.cards.push({
                id: index + this.totalPairs,
                pairId: index,
                text: word.translation,
                type: 'turkish',
                matched: false,
                wordData: word
            });
        });

        // Shuffle cards
        this.shuffleCards();

        // Render game board
        this.renderBoard();

        // Start timer
        this.startTimer();

        // Update UI
        this.updateStats();

        // Hide result, show board
        const result = document.getElementById('matchingResult');
        if (result) result.style.display = 'none';

        const board = document.getElementById('matchingBoard');
        if (board) board.style.display = 'grid';

        const startBtn = document.getElementById('matchingStartBtn');
        if (startBtn) startBtn.style.display = 'none';

        const gameStats = document.getElementById('matchingGameStats');
        if (gameStats) gameStats.style.display = 'flex';
    },

    /**
     * Get words for the game from App's loaded words
     */
    getGameWords() {
        if (!App || !App.words || App.words.length === 0) {
            return [];
        }
        // Shuffle and pick words
        const shuffled = [...App.words].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, this.totalPairs);
    },

    /**
     * Shuffle cards using Fisher-Yates algorithm
     */
    shuffleCards() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    },

    /**
     * Render the game board
     */
    renderBoard() {
        const board = document.getElementById('matchingBoard');
        if (!board) return;

        board.innerHTML = '';

        this.cards.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = `matching-card ${card.type}`;
            cardEl.dataset.index = index;
            cardEl.innerHTML = `
                <div class="matching-card-inner">
                    <div class="matching-card-front">
                        <i class="fas ${card.type === 'english' ? 'fa-flag-usa' : 'fa-moon'}"></i>
                    </div>
                    <div class="matching-card-back">
                        <span class="matching-card-label">${card.type === 'english' ? 'EN' : 'TR'}</span>
                        <span class="matching-card-text">${card.text}</span>
                    </div>
                </div>
            `;

            cardEl.addEventListener('click', () => this.selectCard(index, cardEl));
            board.appendChild(cardEl);
        });
    },

    /**
     * Handle card selection
     */
    selectCard(index, element) {
        // Guards
        if (this.isLocked) return;
        if (!this.gameActive) return;
        if (this.cards[index].matched) return;
        if (this.flippedCards.length >= 2) return;
        if (this.flippedCards.some(fc => fc.index === index)) return;

        // Flip card
        element.classList.add('flipped');
        this.flippedCards.push({ index, element });

        // Check if two cards are flipped
        if (this.flippedCards.length === 2) {
            this.moves++;
            this.updateStats();
            this.checkMatch();
        }
    },

    /**
     * Check if two flipped cards match
     */
    checkMatch() {
        this.isLocked = true;

        const [first, second] = this.flippedCards;
        const card1 = this.cards[first.index];
        const card2 = this.cards[second.index];

        // Cards match if they have the same pairId but different types
        const isMatch = card1.pairId === card2.pairId && card1.type !== card2.type;

        if (isMatch) {
            // Match found!
            card1.matched = true;
            card2.matched = true;
            this.matchedPairs++;

            // Animate match
            setTimeout(() => {
                first.element.classList.add('matched');
                second.element.classList.add('matched');

                // Add sparkle effect
                this.addSparkle(first.element);
                this.addSparkle(second.element);

                this.flippedCards = [];
                this.isLocked = false;

                // Check if game is complete
                if (this.matchedPairs === this.totalPairs) {
                    this.endGame();
                }
            }, 400);
        } else {
            // No match - shake and flip back
            setTimeout(() => {
                first.element.classList.add('shake');
                second.element.classList.add('shake');

                setTimeout(() => {
                    first.element.classList.remove('flipped', 'shake');
                    second.element.classList.remove('flipped', 'shake');
                    this.flippedCards = [];
                    this.isLocked = false;
                }, 600);
            }, 800);
        }
    },

    /**
     * Add sparkle effect to matched card
     */
    addSparkle(element) {
        const sparkle = document.createElement('div');
        sparkle.className = 'matching-sparkle';
        sparkle.innerHTML = '✨';
        element.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 800);
    },

    /**
     * Start the timer
     */
    startTimer() {
        this.stopTimer();
        this.seconds = 0;
        this.timer = setInterval(() => {
            this.seconds++;
            this.updateTimerDisplay();
        }, 1000);
    },

    /**
     * Stop the timer
     */
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    /**
     * Update timer display
     */
    updateTimerDisplay() {
        const timerEl = document.getElementById('matchingTimer');
        if (timerEl) {
            const mins = Math.floor(this.seconds / 60);
            const secs = this.seconds % 60;
            timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    },

    /**
     * Update move counter and pairs display
     */
    updateStats() {
        const movesEl = document.getElementById('matchingMoves');
        if (movesEl) {
            movesEl.textContent = this.moves;
        }

        const pairsEl = document.getElementById('matchingPairs');
        if (pairsEl) {
            pairsEl.textContent = `${this.matchedPairs}/${this.totalPairs}`;
        }
    },

    /**
     * End the game
     */
    endGame() {
        this.gameActive = false;
        this.stopTimer();

        // Calculate XP based on performance
        const xp = this.calculateXP();

        // Add XP
        Storage.addXP(xp);
        Storage.updateStreak();

        // Show result
        this.showResult(xp);

        // Update main UI
        App.updateUI();
    },

    /**
     * Calculate XP reward based on moves and time
     */
    calculateXP() {
        const perfectMoves = this.totalPairs; // Minimum possible moves
        const moveRatio = perfectMoves / Math.max(this.moves, perfectMoves);
        const timeBonus = Math.max(0, 60 - this.seconds) / 60; // Bonus for finishing under 60s

        // Base XP: 50, scaled by performance
        let xp = Math.round(50 * moveRatio + 20 * timeBonus);

        // Minimum 10 XP
        return Math.max(10, xp);
    },

    /**
     * Show game result
     */
    showResult(xp) {
        const result = document.getElementById('matchingResult');
        if (!result) return;

        const stars = this.getStarRating();
        const mins = Math.floor(this.seconds / 60);
        const secs = this.seconds % 60;
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

        result.innerHTML = `
            <div class="matching-result-content">
                <div class="matching-result-icon">🎉</div>
                <h3>Tebrikler!</h3>
                <div class="matching-stars">
                    ${stars}
                </div>
                <div class="matching-result-stats">
                    <div class="matching-result-stat">
                        <i class="fas fa-hand-pointer"></i>
                        <span>${this.moves} Hamle</span>
                    </div>
                    <div class="matching-result-stat">
                        <i class="fas fa-clock"></i>
                        <span>${timeStr}</span>
                    </div>
                    <div class="matching-result-stat xp-earned">
                        <i class="fas fa-star"></i>
                        <span>+${xp} XP</span>
                    </div>
                </div>
                <div class="matching-result-words">
                    <h4>Eşleştirdiğin Kelimeler:</h4>
                    <div class="matched-word-list">
                        ${this.selectedWords.map(w => `
                            <div class="matched-word-item">
                                <span class="mw-en">${w.word}</span>
                                <i class="fas fa-arrows-alt-h"></i>
                                <span class="mw-tr">${w.translation}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <button class="matching-play-again-btn" onclick="MatchingGame.startGame()">
                    <i class="fas fa-redo"></i> Tekrar Oyna
                </button>
            </div>
        `;

        result.style.display = 'block';

        const board = document.getElementById('matchingBoard');
        if (board) board.style.display = 'none';
    },

    /**
     * Get star rating HTML based on performance
     */
    getStarRating() {
        const perfectMoves = this.totalPairs;
        let starCount;

        if (this.moves <= perfectMoves + 2) {
            starCount = 3; // Perfect or near-perfect
        } else if (this.moves <= perfectMoves * 2) {
            starCount = 2; // Good
        } else {
            starCount = 1; // Completed
        }

        let starsHtml = '';
        for (let i = 0; i < 3; i++) {
            if (i < starCount) {
                starsHtml += '<i class="fas fa-star matching-star active"></i>';
            } else {
                starsHtml += '<i class="fas fa-star matching-star"></i>';
            }
        }
        return starsHtml;
    },

    /**
     * Show message when not enough words
     */
    showNotEnoughWords() {
        const board = document.getElementById('matchingBoard');
        if (board) {
            board.innerHTML = `
                <div class="matching-no-words">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Yeterli kelime bulunamadı. Lütfen kategori veya seviye değiştirin.</p>
                </div>
            `;
            board.style.display = 'flex';
        }
    }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    MatchingGame.init();
});
