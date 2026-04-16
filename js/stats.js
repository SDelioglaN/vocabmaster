// js/stats.js - Geleneksel ve Asenkron İstatistik Motoru

const Stats = {
    async init() {
        await this.render();
        const goalSelect = document.getElementById('dailyGoalSelect');
        if (goalSelect) {
            // Çift dinleyici (duplicate listener) oluşmasını engelleyen köklü çözüm
            const newSelect = goalSelect.cloneNode(true);
            goalSelect.parentNode.replaceChild(newSelect, goalSelect);
            newSelect.addEventListener('change', async (e) => {
                await Database.saveSetting('dailyGoal', parseInt(e.target.value));
                await this.render();
            });
        }
    },

    async render() {
        try {
            // Verileri doğrudan kaynağında (Source of Truth) asenkron olarak sorguluyoruz
            const logs = await Database._getAll('logs') || [];
            const progress = await Database._getAll('progress') || [];
            const dailyGoal = await Database.getSetting('dailyGoal', 10);

            const todayStr = new Date().toISOString().split('T')[0];
            const todayLog = logs.find(l => l.date === todayStr) || { wordsStudied: 0, xpEarned: 0 };
            
            // XP'yi RAM'de şişirmek yerine geçmiş kayıtlardan anlık dinamik hesaplıyoruz
            const totalXP = logs.reduce((sum, log) => sum + (log.xpEarned || 0), 0);
            const levelInfo = this.calculateLevel(totalXP);

            this.renderTodayCards(todayLog, totalXP, levelInfo);
            this.renderGoalRing(todayLog.wordsStudied, dailyGoal);
            this.renderWordStatus(progress);
        } catch (error) {
            console.error("İstatistikler yüklenirken vizyoner sistem hatası:", error);
        }
    },

    calculateLevel(xp) {
        let level = 1;
        let xpRequired = 100;
        let totalXpNeeded = 100;
        while (xp >= totalXpNeeded) {
            level++;
            xpRequired = level * 100;
            totalXpNeeded += xpRequired;
        }
        const xpForCurrentLevel = totalXpNeeded - xpRequired;
        const progressInLevel = xp - xpForCurrentLevel;
        const progressPercent = Math.round((progressInLevel / xpRequired) * 100);
        return { level, currentXP: progressInLevel, requiredXP: xpRequired, progressPercent };
    },

    renderTodayCards(todayLog, totalXP, levelInfo) {
        const container = document.getElementById('statsTodayCards');
        if (!container) return;
        container.innerHTML = `
            <div class="stat-card stat-card-xp">
                <div class="stat-card-icon"><i class="fas fa-star"></i></div>
                <div class="stat-card-info">
                    <span class="stat-card-value">${todayLog.xpEarned}</span>
                    <span class="stat-card-label">Bugün XP</span>
                </div>
            </div>
            <div class="stat-card stat-card-words">
                <div class="stat-card-icon"><i class="fas fa-book-reader"></i></div>
                <div class="stat-card-info">
                    <span class="stat-card-value">${todayLog.wordsStudied}</span>
                    <span class="stat-card-label">Kelime</span>
                </div>
            </div>
            <div class="stat-card stat-card-level">
                <div class="stat-card-icon"><i class="fas fa-trophy"></i></div>
                <div class="stat-card-info">
                    <span class="stat-card-value">Sv. ${levelInfo.level}</span>
                    <span class="stat-card-label">${totalXP} Toplam XP</span>
                </div>
            </div>
        `;
    },

    renderGoalRing(current, goal) {
        const container = document.getElementById('statsDailyGoal');
        if (!container) return;
        const percent = Math.min(100, Math.round((current / goal) * 100));
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (percent / 100) * circumference;
        const isCompleted = current >= goal;

        container.innerHTML = `
            <div class="goal-ring-wrapper">
                <svg class="goal-ring" viewBox="0 0 120 120">
                    <circle class="goal-ring-bg" cx="60" cy="60" r="54" />
                    <circle class="goal-ring-progress ${isCompleted ? 'completed' : ''}"
                        cx="60" cy="60" r="54" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
                </svg>
                <div class="goal-ring-text">
                    <span class="goal-current">${current}</span>
                    <span class="goal-divider">/</span>
                    <span class="goal-target">${goal}</span>
                </div>
                ${isCompleted ? '<div class="goal-complete-badge">🎉</div>' : ''}
            </div>
            <div class="goal-label">Günlük Hedef</div>
            <div class="goal-selector">
                <select id="dailyGoalSelect">
                    <option value="5" ${goal === 5 ? 'selected' : ''}>5 kelime</option>
                    <option value="10" ${goal === 10 ? 'selected' : ''}>10 kelime</option>
                    <option value="20" ${goal === 20 ? 'selected' : ''}>20 kelime</option>
                    <option value="50" ${goal === 50 ? 'selected' : ''}>50 kelime</option>
                </select>
            </div>
        `;
    },

    renderWordStatus(progress) {
        const container = document.getElementById('statsWordStatus');
        if (!container) return;
        
        const counts = { new: 0, learning: 0, review: 0, mastered: 0 };
        progress.forEach(p => {
            const status = p.status || 'new';
            if(counts[status] !== undefined) counts[status]++;
        });

        const total = counts.learning + counts.review + counts.mastered;
        if (total === 0) {
            container.innerHTML = '<h3 class="stats-section-title"><i class="fas fa-chart-pie"></i> Kelime Durumu</h3><div class="stats-empty"><p>Henüz kelime çalışılmadı</p></div>';
            return;
        }

        container.innerHTML = `
            <h3 class="stats-section-title"><i class="fas fa-chart-pie"></i> Kelime Durumu</h3>
            <div class="status-bar">
                ${counts.learning > 0 ? `<div class="status-bar-segment" style="width:${(counts.learning/total)*100}%;background:#f59e0b"></div>` : ''}
                ${counts.review > 0 ? `<div class="status-bar-segment" style="width:${(counts.review/total)*100}%;background:#3b82f6"></div>` : ''}
                ${counts.mastered > 0 ? `<div class="status-bar-segment" style="width:${(counts.mastered/total)*100}%;background:#10b981"></div>` : ''}
            </div>
            <div class="status-legend">
                <div class="status-legend-item"><span class="status-dot" style="background:#f59e0b"></span><span class="status-legend-label">📖 Öğreniliyor</span><span class="status-legend-count">${counts.learning}</span></div>
                <div class="status-legend-item"><span class="status-dot" style="background:#3b82f6"></span><span class="status-legend-label">🔄 Tekrar</span><span class="status-legend-count">${counts.review}</span></div>
                <div class="status-legend-item"><span class="status-dot" style="background:#10b981"></span><span class="status-legend-label">⭐ Ustalaşılan</span><span class="status-legend-count">${counts.mastered}</span></div>
            </div>
        `;
    }
};

window.Stats = Stats;
// Veritabanının hazır olmasını beklemek için başlatmayı gecikmeli tetikliyoruz
document.addEventListener('DOMContentLoaded', () => setTimeout(() => Stats.init(), 500));
