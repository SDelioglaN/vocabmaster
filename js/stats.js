// stats.js - Statistics Dashboard Module

const Stats = {
    initialized: false,

    /**
     * Initialize the stats dashboard
     */
    init() {
        if (this.initialized) {
            this.refresh();
            return;
        }
        this.initialized = true;
        this.render();

        // Daily goal select listener
        const goalSelect = document.getElementById('dailyGoalSelect');
        if (goalSelect) {
            goalSelect.addEventListener('change', (e) => {
                Storage.setDailyGoal(parseInt(e.target.value));
                this.refresh();
            });
        }
    },

    /**
     * Full render of the stats dashboard
     */
    render() {
        this.renderStreakWidget();
        this.renderDailyGoal();
        this.renderTodayStats();
        this.renderWeeklyActivity();
        this.renderWordStatus();
        this.renderCategoryBreakdown();
    },

    /**
     * Refresh all dashboard data
     */
    refresh() {
        this.render();
    },

    /**
     * Render the streak fire widget
     */
    renderStreakWidget() {
        const streak = Storage.checkStreakStatus();
        const container = document.getElementById('statsStreakWidget');
        if (!container) return;

        const isActive = streak.current > 0;
        container.innerHTML = `
            <div class="streak-fire ${isActive ? 'active' : ''}">
                <div class="fire-icon">🔥</div>
                <div class="streak-number">${streak.current}</div>
                <div class="streak-label">Günlük Seri</div>
            </div>
            <div class="streak-details">
                <div class="streak-detail-item">
                    <span class="streak-detail-value">${streak.longest}</span>
                    <span class="streak-detail-label">En Uzun Seri</span>
                </div>
                <div class="streak-detail-item">
                    <span class="streak-detail-value">${streak.current > 0 ? '✅' : '❌'}</span>
                    <span class="streak-detail-label">Bugün</span>
                </div>
            </div>
        `;
    },

    /**
     * Render the daily goal progress ring
     */
    renderDailyGoal() {
        const goalProgress = Storage.getDailyGoalProgress();
        const container = document.getElementById('statsDailyGoal');
        if (!container) return;

        const circumference = 2 * Math.PI * 54; // radius = 54
        const offset = circumference - (goalProgress.percent / 100) * circumference;
        const currentGoal = Storage.getDailyGoal();

        container.innerHTML = `
            <div class="goal-ring-wrapper">
                <svg class="goal-ring" viewBox="0 0 120 120">
                    <circle class="goal-ring-bg" cx="60" cy="60" r="54" />
                    <circle class="goal-ring-progress ${goalProgress.completed ? 'completed' : ''}"
                        cx="60" cy="60" r="54"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${offset}" />
                </svg>
                <div class="goal-ring-text">
                    <span class="goal-current">${goalProgress.current}</span>
                    <span class="goal-divider">/</span>
                    <span class="goal-target">${goalProgress.goal}</span>
                </div>
                ${goalProgress.completed ? '<div class="goal-complete-badge">🎉</div>' : ''}
            </div>
            <div class="goal-label">Günlük Hedef</div>
            <div class="goal-selector">
                <select id="dailyGoalSelect">
                    <option value="5" ${currentGoal === 5 ? 'selected' : ''}>5 kelime</option>
                    <option value="10" ${currentGoal === 10 ? 'selected' : ''}>10 kelime</option>
                    <option value="15" ${currentGoal === 15 ? 'selected' : ''}>15 kelime</option>
                    <option value="20" ${currentGoal === 20 ? 'selected' : ''}>20 kelime</option>
                    <option value="30" ${currentGoal === 30 ? 'selected' : ''}>30 kelime</option>
                    <option value="50" ${currentGoal === 50 ? 'selected' : ''}>50 kelime</option>
                </select>
            </div>
        `;

        // Re-attach listener after render
        const goalSelect = document.getElementById('dailyGoalSelect');
        if (goalSelect) {
            goalSelect.addEventListener('change', (e) => {
                Storage.setDailyGoal(parseInt(e.target.value));
                this.refresh();
            });
        }
    },

    /**
     * Render today's summary stats cards
     */
    renderTodayStats() {
        const today = Storage.getTodayLog();
        const stats = Storage.getStats();
        const levelInfo = Storage.calculateLevel(stats.totalXP);
        const accuracy = today.totalAnswers > 0
            ? Math.round((today.correctAnswers / today.totalAnswers) * 100)
            : 0;

        const container = document.getElementById('statsTodayCards');
        if (!container) return;

        container.innerHTML = `
            <div class="stat-card stat-card-xp">
                <div class="stat-card-icon"><i class="fas fa-star"></i></div>
                <div class="stat-card-info">
                    <span class="stat-card-value">${today.xpEarned}</span>
                    <span class="stat-card-label">Bugün XP</span>
                </div>
            </div>
            <div class="stat-card stat-card-words">
                <div class="stat-card-icon"><i class="fas fa-book-reader"></i></div>
                <div class="stat-card-info">
                    <span class="stat-card-value">${today.wordsStudied}</span>
                    <span class="stat-card-label">Kelime</span>
                </div>
            </div>
            <div class="stat-card stat-card-accuracy">
                <div class="stat-card-icon"><i class="fas fa-bullseye"></i></div>
                <div class="stat-card-info">
                    <span class="stat-card-value">${accuracy}%</span>
                    <span class="stat-card-label">Doğruluk</span>
                </div>
            </div>
            <div class="stat-card stat-card-level">
                <div class="stat-card-icon"><i class="fas fa-trophy"></i></div>
                <div class="stat-card-info">
                    <span class="stat-card-value">Sv. ${levelInfo.level}</span>
                    <span class="stat-card-label">${stats.totalXP} XP</span>
                </div>
            </div>
        `;
    },

    /**
     * Render weekly activity heatmap
     */
    renderWeeklyActivity() {
        const weekly = Storage.getWeeklyLogs();
        const container = document.getElementById('statsWeeklyActivity');
        if (!container) return;

        const maxWords = Math.max(...weekly.map(d => d.wordsStudied), 1);

        let html = '<h3 class="stats-section-title"><i class="fas fa-calendar-week"></i> Haftalık Aktivite</h3>';
        html += '<div class="weekly-grid">';

        weekly.forEach(day => {
            const intensity = day.wordsStudied > 0
                ? Math.max(0.2, day.wordsStudied / maxWords)
                : 0;
            const levelClass = intensity === 0 ? 'level-0'
                : intensity < 0.33 ? 'level-1'
                    : intensity < 0.66 ? 'level-2'
                        : 'level-3';

            html += `
                <div class="weekly-day ${day.isToday ? 'today' : ''} ${levelClass}"
                     title="${day.date}: ${day.wordsStudied} kelime, ${day.xpEarned} XP">
                    <div class="weekly-day-name">${day.dayName}</div>
                    <div class="weekly-day-cell"></div>
                    <div class="weekly-day-count">${day.wordsStudied}</div>
                </div>
            `;
        });

        html += '</div>';

        // Weekly summary
        const totalWords = weekly.reduce((sum, d) => sum + d.wordsStudied, 0);
        const totalXP = weekly.reduce((sum, d) => sum + d.xpEarned, 0);
        const activeDays = weekly.filter(d => d.wordsStudied > 0).length;

        html += `
            <div class="weekly-summary">
                <div class="weekly-summary-item">
                    <span class="weekly-summary-value">${totalWords}</span>
                    <span class="weekly-summary-label">kelime</span>
                </div>
                <div class="weekly-summary-item">
                    <span class="weekly-summary-value">${totalXP}</span>
                    <span class="weekly-summary-label">XP</span>
                </div>
                <div class="weekly-summary-item">
                    <span class="weekly-summary-value">${activeDays}/7</span>
                    <span class="weekly-summary-label">aktif gün</span>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Render word status distribution (donut-style bar)
     */
    renderWordStatus() {
        const counts = Storage.getWordStatusCounts();
        const container = document.getElementById('statsWordStatus');
        if (!container) return;

        const total = counts.new + counts.learning + counts.review + counts.mastered;

        const items = [
            { label: 'Öğreniliyor', count: counts.learning, color: '#f59e0b', icon: '📖' },
            { label: 'Tekrar', count: counts.review, color: '#3b82f6', icon: '🔄' },
            { label: 'Ustalaşılan', count: counts.mastered, color: '#10b981', icon: '⭐' },
        ];

        let html = '<h3 class="stats-section-title"><i class="fas fa-chart-pie"></i> Kelime Durumu</h3>';

        if (total === 0) {
            html += '<div class="stats-empty"><p>Henüz kelime çalışılmadı</p></div>';
        } else {
            // Stacked progress bar
            html += '<div class="status-bar">';
            items.forEach(item => {
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                if (pct > 0) {
                    html += `<div class="status-bar-segment" style="width:${pct}%;background:${item.color}" title="${item.label}: ${item.count}"></div>`;
                }
            });
            html += '</div>';

            // Legend
            html += '<div class="status-legend">';
            items.forEach(item => {
                html += `
                    <div class="status-legend-item">
                        <span class="status-dot" style="background:${item.color}"></span>
                        <span class="status-legend-label">${item.icon} ${item.label}</span>
                        <span class="status-legend-count">${item.count}</span>
                    </div>
                `;
            });
            html += '</div>';

            html += `<div class="status-total">Toplam: <strong>${total}</strong> kelime çalışıldı</div>`;
        }

        container.innerHTML = html;
    },

    /**
     * Render category breakdown bars
     */
    renderCategoryBreakdown() {
        const categories = Storage.getCategoryBreakdown();
        const container = document.getElementById('statsCategoryBreakdown');
        if (!container) return;

        const categoryNames = {
            senses: '👁️ Duyular',
            kitchen: '🍽️ Mutfak',
            home: '🏠 Ev',
            family: '👨‍👩‍👧‍👦 Aile',
            work: '💼 İş',
            shopping: '🛒 Alışveriş',
            travel: '✈️ Seyahat',
            health: '🏥 Sağlık',
            education: '🎓 Eğitim',
            emotions: '🎭 Duygular',
            weather: '⛅ Hava',
            hobbies: '🎮 Hobiler',
            technology: '💻 Teknoloji',
            clothing: '👗 Giyim',
            city: '🏙️ Şehir'
        };

        let html = '<h3 class="stats-section-title"><i class="fas fa-layer-group"></i> Kategori Dağılımı</h3>';

        const entries = Object.entries(categories);
        if (entries.length === 0) {
            html += '<div class="stats-empty"><p>Henüz kategori verisi yok</p></div>';
        } else {
            const maxTotal = Math.max(...entries.map(([, v]) => v.total), 1);

            html += '<div class="category-bars">';
            entries.forEach(([catId, data]) => {
                const name = categoryNames[catId] || catId;
                const pct = (data.total / maxTotal) * 100;
                const masteredPct = data.total > 0 ? (data.mastered / data.total) * 100 : 0;

                html += `
                    <div class="category-bar-item">
                        <div class="category-bar-label">${name}</div>
                        <div class="category-bar-track">
                            <div class="category-bar-fill" style="width:${pct}%">
                                <div class="category-bar-mastered" style="width:${masteredPct}%"></div>
                            </div>
                        </div>
                        <div class="category-bar-count">${data.total}</div>
                    </div>
                `;
            });
            html += '</div>';

            html += `
                <div class="category-legend">
                    <span><span class="status-dot" style="background:var(--primary)"></span> Çalışılan</span>
                    <span><span class="status-dot" style="background:#10b981"></span> Ustalaşılan</span>
                </div>
            `;
        }

        container.innerHTML = html;
    }
};

// Export
window.Stats = Stats;
