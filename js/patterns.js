// js/patterns.js - Vizyoner ve İzole Kalıplar Motoru

const Patterns = {
    allPatterns: [],
    currentCategory: 'all',

    async init() {
        await this.loadPatterns();
        this.setupEventListeners();
        this.renderPatterns();
    },

    async loadPatterns() {
        try {
            // Geleneksel optimizasyon: Veri zaten RAM'deyse tekrar fetch atarak cihazı yorma
            if (this.allPatterns.length > 0) return;

            const response = await fetch('data/patterns.json');
            if (!response.ok) throw new Error("Kalıp veri kaynağına ulaşılamadı.");
            
            this.allPatterns = await response.json();
            console.log(`${this.allPatterns.length} kalıp güvenle yüklendi.`);
        } catch (error) {
            console.error("Kalıp Yükleme Hatası:", error);
            this.allPatterns = [];
            const container = document.getElementById('patternsList');
            if (container) {
                container.innerHTML = `
                    <div class="error-message" style="color: #ef4444; padding: 20px; text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 10px;"></i>
                        <p>Kalıplar yüklenirken bir hata oluşti. Lütfen bağlantınızı kontrol edin.</p>
                    </div>`;
            }
        }
    },

    setupEventListeners() {
        document.getElementById('patternCategory')?.addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
            this.renderPatterns();
        });
    },

    renderPatterns() {
        const container = document.getElementById('patternsList');
        if (!container) return;

        let filtered = this.allPatterns;
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(p => p.category === this.currentCategory);
        }

        if (filtered.length === 0) {
            container.innerHTML = `<div class="stats-empty"><p>Bu kategoride kalıp bulunamadı.</p></div>`;
            return;
        }

        container.innerHTML = filtered.map(pattern => `
            <div class="pattern-card">
                <div class="pattern-header" onclick="Patterns.togglePattern('${pattern.id}')">
                    <div class="pattern-title-group">
                        <span class="pattern-level" style="background: ${this.getLevelColor(pattern.level)}">${pattern.level.toUpperCase()}</span>
                        <h3 class="pattern-title">${pattern.pattern}</h3>
                    </div>
                    <i class="fas fa-chevron-down pattern-icon" id="icon-${pattern.id}"></i>
                </div>
                <div class="pattern-details" id="details-${pattern.id}">
                    <p class="pattern-tr-desc">${pattern.pattern_tr}</p>
                    <p class="pattern-note"><strong>Not:</strong> ${pattern.usage_note}</p>
                    <div class="pattern-examples">
                        <h4>Örnekler:</h4>
                        ${pattern.examples.map(ex => `
                            <div class="pattern-ex-item">
                                <div class="ex-content">
                                    <p class="ex-en">${ex.en}</p>
                                    <p class="ex-tr">${ex.tr}</p>
                                </div>
                                <button class="ex-play-btn" onclick="Speech.speakSentence('${ex.en.replace(/'/g, "\\'")}')">
                                    <i class="fas fa-volume-up"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    },

    getLevelColor(level) {
        const colors = { 'a1': '#047857', 'a2': '#b45309', 'b1': '#c2410c', 'b2': '#b91c1c', 'c1': '#4338ca' };
        return colors[level] || '#0ea5e9';
    },

    togglePattern(id) {
        const details = document.getElementById(`details-${id}`);
        const icon = document.getElementById(`icon-${id}`);
        if(details) details.classList.toggle('show');
        if(icon) icon.classList.toggle('rotate');
    }
};

window.Patterns = Patterns;
// Uygulamanın ana veritabanı yükünü atlatması için kalıpları gecikmeli başlatıyoruz
document.addEventListener('DOMContentLoaded', () => setTimeout(() => Patterns.init(), 800));
