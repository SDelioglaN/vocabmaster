// patterns.js - Logic for the new Patterns tab

const Patterns = {
    // State
    allPatterns: [],
    currentCategory: 'all',

    /**
     * Initialize patterns module
     */
    async init() {
        await this.loadPatterns();
        this.setupEventListeners();
        this.renderDailyPattern();
        this.renderPatterns();
    },

    /**
     * Load patterns from JSON
     */
    async loadPatterns() {
        try {
            console.log('Fetching patterns from data/patterns.json...');
            const response = await fetch('data/patterns.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.allPatterns = await response.json();
            console.log(`Loaded ${this.allPatterns.length} patterns.`);
        } catch (error) {
            console.error('Error loading patterns:', error);
            this.allPatterns = [];
            // Show error to user
            const container = document.getElementById('patternsList');
            if (container) {
                container.innerHTML = `
                    <div class="error-message" style="color: #ef4444; padding: 20px; text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 10px;"></i>
                        <p>Kalıplar yüklenirken bir hata oluştu.</p>
                        <p style="font-size: 0.8em; color: #666;">Hata detayı: ${error.message}</p>
                        <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px;">Sayfayı Yenile</button>
                    </div>
                `;
            }
        }
    },

    /**
     * Setup event listeners for filters
     */
    setupEventListeners() {
        const filterBtns = document.querySelectorAll('.pattern-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active button
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update category and re-render
                this.currentCategory = btn.dataset.category;
                this.renderPatterns();
            });
        });
    },

    /**
     * Get a random pattern for "Daily Pattern"
     * Uses the current date to select a consistent pattern for the day
     */
    getDailyPattern() {
        if (this.allPatterns.length === 0) return null;

        const today = new Date();
        // Create a seed from date (e.g., 20231027)
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

        // Simple pseudo-random index
        const index = seed % this.allPatterns.length;
        return this.allPatterns[index];
    },

    /**
     * Render the Daily Pattern card
     */
    renderDailyPattern() {
        const container = document.getElementById('dailyPatternContainer');
        if (!container) return;

        const pattern = this.getDailyPattern();
        if (!pattern) return;

        container.innerHTML = `
            <div class="daily-pattern-card">
                <div class="daily-label"><i class="fas fa-sun"></i> Günün Kalıbı</div>
                <h3 class="daily-pattern-text">${pattern.pattern}</h3>
                <p class="daily-pattern-tr">${pattern.pattern_tr}</p>
                <div class="daily-pattern-example">
                    <p>"${pattern.examples[0].en}"</p>
                    <p class="ex-tr">${pattern.examples[0].tr}</p>
                </div>
                <button class="daily-listen-btn" onclick="Speech.speak('${pattern.examples[0].en.replace(/'/g, "\\'")}')">
                    <i class="fas fa-volume-up"></i> Dinle
                </button>
            </div>
        `;
    },

    /**
     * Render the list of patterns based on category
     */
    renderPatterns() {
        const container = document.getElementById('patternsList');
        if (!container) return;

        let patternsToShow = this.allPatterns;

        if (this.currentCategory !== 'all') {
            patternsToShow = this.allPatterns.filter(p => p.category === this.currentCategory);
        }

        if (patternsToShow.length === 0) {
            container.innerHTML = '<div class="empty-patterns">Bu kategoride henüz kalıp yok.</div>';
            return;
        }

        container.innerHTML = patternsToShow.map(pattern => `
            <div class="pattern-item">
                <div class="pattern-header" onclick="Patterns.togglePattern('${pattern.id}')">
                    <div class="pattern-title">
                        <span class="pattern-text">${pattern.pattern}</span>
                        <span class="pattern-tr-preview">${pattern.pattern_tr}</span>
                    </div>
                    <i class="fas fa-chevron-down pattern-toggle-icon" id="icon-${pattern.id}"></i>
                </div>
                
                <div class="pattern-details" id="details-${pattern.id}">
                    <div class="pattern-info-block">
                        <span class="pattern-badge ${pattern.level}">${pattern.level.toUpperCase()}</span>
                        <p class="pattern-usage"><i class="fas fa-info-circle"></i> ${pattern.usage_note}</p>
                    </div>

                    <div class="pattern-examples">
                        <h4>Örnekler:</h4>
                        ${pattern.examples.map(ex => `
                            <div class="pattern-ex-item">
                                <div class="ex-content">
                                    <p class="ex-en">${ex.en}</p>
                                    <p class="ex-tr">${ex.tr}</p>
                                </div>
                                <button class="ex-play-btn" onclick="Speech.speak('${ex.en.replace(/'/g, "\\'")}')">
                                    <i class="fas fa-volume-up"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Toggle pattern details (Accordion)
     */
    togglePattern(id) {
        const details = document.getElementById(`details-${id}`);
        const icon = document.getElementById(`icon-${id}`);

        // Close others (optional - for better focus)
        // document.querySelectorAll('.pattern-details.show').forEach(el => {
        //     if(el.id !== `details-${id}`) el.classList.remove('show');
        // });

        details.classList.toggle('show');
        icon.classList.toggle('rotate');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Patterns.init();
});
