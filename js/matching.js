// js/matching.js - Asenkron ve Vizyoner Eşleştirme Motoru

const MatchingGame = {
    cards: [], flippedCards: [], matchedPairs: 0, totalPairs: 6,
    moves: 0, timer: null, seconds: 0, isLocked: false, gameActive: false,

    init() {
        document.getElementById('matchingStartBtn')?.addEventListener('click', () => this.startGame());
        document.getElementById('matchingRestartBtn')?.addEventListener('click', () => this.startGame());
    },

    async startGame() {
        this.flippedCards = []; this.matchedPairs = 0; this.moves = 0;
        this.seconds = 0; this.isLocked = false; this.gameActive = true;
        this.updateStats();
        this.startTimer();

        // Geleneksel RAM şişirmesi yok. Verileri doğrudan vizyoner veritabanından (IndexedDB) çekiyoruz.
        const level = await Database.getSetting('level', 'all');
        const category = await Database.getSetting('category', 'all');
        const allWords = await Database._getAll('words') || [];

        let pool = allWords;
        if (level !== 'all') pool = pool.filter(w => w.level === level);
        if (category !== 'all') pool = pool.filter(w => w.category === category);

        if (pool.length < this.totalPairs) {
            this.showNotEnoughWords();
            return;
        }

        // Fisher-Yates Karıştırma Algoritması ile 6 rastgele kelime seç
        const shuffledPool = pool.sort(() => 0.5 - Math.random());
        const selectedWords = shuffledPool.slice(0, this.totalPairs);

        // Kartları oluştur (İngilizce ve Türkçe çiftler)
        this.cards = [];
        selectedWords.forEach(word => {
            this.cards.push({ id: word.id, text: word.word, type: 'en', matchId: word.id });
            this.cards.push({ id: word.id + '_tr', text: word.translation, type: 'tr', matchId: word.id });
        });

        this.cards.sort(() => 0.5 - Math.random());
        this.renderBoard();
        
        const overlay = document.getElementById('matchingOverlay');
        if (overlay) overlay.style.display = 'none';
    },

    renderBoard() {
        const board = document.getElementById('matchingBoard');
        if (!board) return;
        board.innerHTML = '';
        board.style.display = 'grid';

        this.cards.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'matching-card';
            cardEl.dataset.index = index;
            cardEl.dataset.matchId = card.matchId;

            cardEl.innerHTML = `
                <div class="matching-card-inner">
                    <div class="matching-card-front"><i class="fas fa-question"></i></div>
                    <div class="matching-card-back">${card.text}</div>
                </div>
            `;
            cardEl.addEventListener('click', () => this.flipCard(index));
            board.appendChild(cardEl);
        });
    },

    flipCard(index) {
        if (!this.gameActive || this.isLocked) return;
        const cardEl = document.querySelector(`.matching-card[data-index="${index}"]`);
        if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;

        cardEl.classList.add('flipped');
        this.flippedCards.push({ index, element: cardEl, matchId: this.cards[index].matchId });

        if (this.flippedCards.length === 2) {
            this.moves++;
            const movesEl = document.getElementById('matchingMoves');
            if (movesEl) movesEl.textContent = this.moves;
            this.checkMatch();
        }
    },

    checkMatch() {
        this.isLocked = true;
        const [card1, card2] = this.flippedCards;

        if (card1.matchId === card2.matchId) {
            setTimeout(() => {
                card1.element.classList.add('matched');
                card2.element.classList.add('matched');
                this.matchedPairs++;
                this.flippedCards = [];
                this.isLocked = false;

                if (this.matchedPairs === this.totalPairs) this.endGame();
            }, 500);
        } else {
            setTimeout(() => {
                card1.element.classList.remove('flipped');
                card2.element.classList.remove('flipped');
                this.flippedCards = [];
                this.isLocked = false;
            }, 1000);
        }
    },

    startTimer() {
        clearInterval(this.timer);
        const timerEl = document.getElementById('matchingTimer');
        if(timerEl) timerEl.textContent = '0:00';
        this.timer = setInterval(() => {
            this.seconds++;
            const mins = Math.floor(this.seconds / 60);
            const secs = this.seconds % 60;
            if(timerEl) timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }, 1000);
    },

    async endGame() {
        this.gameActive = false;
        clearInterval(this.timer);

        // Performansa göre geleneksel XP ve Yıldız hesaplama
        const perfectMoves = this.totalPairs;
        let starCount = 1, xpReward = 5;
        if (this.moves <= perfectMoves + 2) { starCount = 3; xpReward = 15; }
        else if (this.moves <= perfectMoves * 2) { starCount = 2; xpReward = 10; }

        // Ölü Storage yapısı yerine IndexedDB'ye güvenli asenkron kayıt
        try {
            const today = new Date().toISOString().split('T')[0];
            let log = await Database._read('logs', today) || { date: today, wordsStudied: 0, xpEarned: 0 };
            log.xpEarned += xpReward;
            await Database._write('logs', log);

            // Global UI güncellemesini tetikle
            if (typeof App !== 'undefined' && App.updateUI) await App.updateUI();
            if (typeof App !== 'undefined' && App.showXPPopup) App.showXPPopup(xpReward);
        } catch (e) {
            console.error("Vizyoner veritabanı XP kaydı başarısız:", e);
        }

        this.showOverlay(starCount, xpReward);
    },

    showOverlay(stars, xp) {
        const overlay = document.getElementById('matchingOverlay');
        if (!overlay) return;
        
        let starsHtml = '';
        for (let i = 0; i < 3; i++) {
            starsHtml += `<i class="fas fa-star matching-star ${i < stars ? 'active' : ''}"></i>`;
        }
        
        overlay.innerHTML = `
            <div class="matching-result">
                <h2>Harika!</h2>
                <div class="matching-stars">${starsHtml}</div>
                <div class="matching-stats">
                    <p>Süre: ${Math.floor(this.seconds/60)}:${(this.seconds%60).toString().padStart(2,'0')}</p>
                    <p>Hamle: ${this.moves}</p>
                    <p>Kazanılan: +${xp} XP</p>
                </div>
                <button class="action-btn" id="overlayRestartBtn" style="margin-top: 20px;"><i class="fas fa-redo"></i> Tekrar Oyna</button>
            </div>
        `;
        overlay.style.display = 'flex';
        document.getElementById('overlayRestartBtn')?.addEventListener('click', () => this.startGame());
    },

    updateStats() {
        const movesEl = document.getElementById('matchingMoves');
        if(movesEl) movesEl.textContent = this.moves;
    },

    showNotEnoughWords() {
        const board = document.getElementById('matchingBoard');
        if (board) board.innerHTML = `<div class="matching-no-words"><i class="fas fa-exclamation-circle"></i><p>Yeterli kelime bulunamadı. Lütfen ayarlar'dan filtreleri genişletin.</p></div>`;
        const overlay = document.getElementById('matchingOverlay');
        if (overlay) overlay.style.display = 'none';
    }
};

window.MatchingGame = MatchingGame;
document.addEventListener('DOMContentLoaded', () => MatchingGame.init());
