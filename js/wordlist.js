// wordlist.js - Word List tab functionality

const WordList = {
    allWords: [],
    filteredWords: [],

    /**
     * Initialize word list
     */
    async init() {
        await this.loadAllWords();
        this.setupEventListeners();
        this.render();
    },

    /**
     * Load all words from categories
     */
    async loadAllWords() {
        const categories = ['senses', 'kitchen', 'home', 'family', 'work', 'shopping', 'travel', 'health', 'education', 'emotions', 'weather', 'hobbies', 'technology', 'clothing', 'city', 'sports', 'music', 'nature', 'food', 'finance', 'law', 'science', 'relationships', 'business', 'computer', 'daily', 'academic', 'animals', 'arts'];

        for (const categoryId of categories) {
            try {
                const response = await fetch(`data/categories/${categoryId}.json`);
                const words = await response.json();
                words.forEach((w, index) => {
                    // Assign level based on position
                    let level = 'a1';
                    const pos = index / words.length;
                    if (pos >= 0.8) level = 'c1';
                    else if (pos >= 0.6) level = 'b2';
                    else if (pos >= 0.4) level = 'b1';
                    else if (pos >= 0.2) level = 'a2';

                    this.allWords.push({
                        ...w,
                        id: `${categoryId}_${w.id}`,
                        category: categoryId,
                        level: level
                    });
                });
            } catch (error) {
                console.error(`Error loading category ${categoryId}:`, error);
            }
        }

        this.filteredWords = [...this.allWords];
        console.log(`WordList: Loaded ${this.allWords.length} words`);
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Category filter
        document.getElementById('wlCategorySelect')?.addEventListener('change', () => this.applyFilters());

        // Level filter
        document.getElementById('wlLevelSelect')?.addEventListener('change', () => this.applyFilters());

        // Search input
        document.getElementById('wlSearchInput')?.addEventListener('input', () => this.applyFilters());
    },

    /**
     * Apply all filters
     */
    applyFilters() {
        const category = document.getElementById('wlCategorySelect')?.value || 'all';
        const level = document.getElementById('wlLevelSelect')?.value || 'all';
        const search = document.getElementById('wlSearchInput')?.value.toLowerCase().trim() || '';

        this.filteredWords = this.allWords.filter(w => {
            // Category filter
            if (category !== 'all' && w.category !== category) return false;

            // Level filter
            if (level !== 'all' && w.level !== level) return false;

            // Search filter
            if (search && !w.word.toLowerCase().includes(search) && !w.translation.toLowerCase().includes(search)) {
                return false;
            }

            return true;
        });

        this.render();
    },

    /**
     * Render word list
     */
    render() {
        const container = document.getElementById('wordlistContainer');
        if (!container) return;

        // Update count
        const countEl = document.getElementById('wlWordCount');
        if (countEl) {
            countEl.textContent = `${this.filteredWords.length} kelime`;
        }

        if (this.filteredWords.length === 0) {
            container.innerHTML = `
                <div class="wl-empty">
                    <i class="fas fa-search"></i>
                    <h3>Kelime bulunamadı</h3>
                    <p>Filtreleri değiştirmeyi deneyin</p>
                </div>
            `;
            return;
        }

        // Group by category
        const grouped = {};
        this.filteredWords.forEach(w => {
            if (!grouped[w.category]) grouped[w.category] = [];
            grouped[w.category].push(w);
        });

        const categoryNames = {
            senses: '👁️ Duyular & İnsani Durumlar',
            kitchen: '🍽️ Mutfak & Yemek',
            home: '🏠 Ev & Mobilya',
            family: '👨‍👩‍👧‍👦 Aile & İlişkiler',
            work: '💼 İş & Kariyer',
            shopping: '🛒 Alışveriş & Para',
            travel: '✈️ Seyahat & Ulaşım',
            health: '🏥 Sağlık & Vücut',
            education: '🎓 Eğitim & Okul',
            emotions: '🎭 Duygular & Kişilik',
            weather: '⛅ Hava & Doğa',
            hobbies: '🎮 Hobiler & Eğlence',
            technology: '💻 Teknoloji & İnternet',
            clothing: '👗 Giyim & Moda',
            city: '🏙️ Şehir & Mekanlar',
            sports: '🏅 Spor & Fitness',
            music: '🎵 Müzik & Sesler',
            nature: '🌿 Doğa & Çevre',
            food: '🍕 Yiyecek & İçecek',
            finance: '💰 Finans & Ekonomi',
            law: '⚖️ Hukuk & Adalet',
            science: '🔬 Bilim & Laboratuvar',
            relationships: '🤝 İlişkiler & Sosyal',
            business: '📊 İş İngilizcesi',
            computer: '🖥️ Bilgisayar & Yazılım',
            daily: '💬 Günlük Konuşma',
            academic: '📚 Akademik Kelimeler',
            animals: '🐾 Hayvanlar',
            arts: '🎨 Sanat & Kültür'
        };

        // Category accent colors (dark blue, green, red tones)
        const categoryColors = {
            senses: '#0e7490', kitchen: '#b45309', home: '#047857',
            family: '#be123c', work: '#1d4ed8', shopping: '#c2410c',
            travel: '#0d9488', health: '#dc2626', education: '#4338ca',
            emotions: '#be123c', weather: '#0e7490', hobbies: '#059669',
            technology: '#1d4ed8', clothing: '#be123c', city: '#4338ca',
            sports: '#047857', music: '#b45309', nature: '#059669',
            food: '#c2410c', finance: '#b45309', law: '#b91c1c',
            science: '#0d9488', relationships: '#be123c',
            business: '#1d4ed8', computer: '#0e7490', daily: '#059669',
            academic: '#4338ca', animals: '#047857', arts: '#b45309'
        };

        const levelColors = {
            'a1': '#047857',
            'a2': '#b45309',
            'b1': '#c2410c',
            'b2': '#b91c1c',
            'c1': '#4338ca'
        };

        let html = '';

        for (const [cat, words] of Object.entries(grouped)) {
            const catColor = categoryColors[cat] || '#0ea5e9';
            html += `
                <div class="wl-category">
                    <div class="wl-category-header" style="border-left-color: ${catColor}; background: ${catColor}12;">
                        <h3>${categoryNames[cat] || cat}</h3>
                        <span class="wl-category-count">${words.length} kelime</span>
                    </div>
                    <div class="wl-words-grid">
                        ${words.map(w => `
                            <div class="wl-word-card" style="--card-accent: ${catColor};" onclick="WordList.speakWord('${w.word.replace(/'/g, "\\'")}')">
                                <div class="wl-card-content">
                                    <div class="wl-word-top">
                                        <span class="wl-word-en">${w.word}</span>
                                        <span class="wl-word-level" style="background: ${levelColors[w.level]}">${w.level.toUpperCase()}</span>
                                    </div>
                                    <span class="wl-word-tr">${w.translation}</span>
                                    <span class="wl-word-phonetic">${w.phonetic || ''}</span>
                                </div>
                                <button class="wl-speak-btn" onclick="event.stopPropagation(); WordList.speakWord('${w.word.replace(/'/g, "\\'")}')" title="Dinle">
                                    <i class="fas fa-volume-up"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    },

    /**
     * Speak a word
     */
    speakWord(word) {
        if (typeof Speech !== 'undefined' && Speech.speakWord) {
            Speech.speakWord(word);
        } else {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            speechSynthesis.speak(utterance);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => WordList.init(), 300);
});
