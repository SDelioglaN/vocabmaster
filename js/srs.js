// js/srs.js - Geleneksel ve Asenkron Spaced Repetition (SRS) Motoru

const SRS_CONFIG = {
    MIN_EASE_FACTOR: 1.3,
    DEFAULT_EASE_FACTOR: 2.5,
    INTERVALS: { AGAIN: 1, HARD: 10, GOOD: 1440, EASY: 4320 }
};

const SRS = {
    // Klasik SM-2 algoritmasının modern ve izole edilmiş hali
    calculateNextReview(wordProgress, quality) {
        const now = Date.now();
        let { interval, repetition, easeFactor, status } = wordProgress;

        if (!status || status === 'new') {
            interval = 0; repetition = 0; easeFactor = SRS_CONFIG.DEFAULT_EASE_FACTOR;
        }

        if (quality < 3) {
            repetition = 0; interval = SRS_CONFIG.INTERVALS.HARD; status = 'learning';
        } else if (quality === 3) {
            if (repetition === 0) interval = SRS_CONFIG.INTERVALS.GOOD;
            else if (repetition === 1) interval = SRS_CONFIG.INTERVALS.GOOD * 3;
            else interval = Math.round(interval * easeFactor);
            repetition += 1; status = repetition >= 3 ? 'review' : 'learning';
        } else {
            if (repetition === 0) interval = SRS_CONFIG.INTERVALS.EASY;
            else interval = Math.round(interval * easeFactor * 1.3);
            repetition += 1; easeFactor += 0.15; status = repetition >= 2 ? 'review' : 'learning';
        }

        if (repetition >= 5 && interval >= 43200) status = 'mastered';
        
        easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        easeFactor = Math.max(SRS_CONFIG.MIN_EASE_FACTOR, easeFactor);

        const nextReview = now + (interval * 60 * 1000);

        return { interval, repetition, easeFactor, nextReview, lastReview: now, status };
    },

    // Yeni Asenkron Veritabanı Bağlantısı
    async getWordsToStudy(level = 'a1', count = 10) {
        const now = Date.now();
        // Verileri RAM'de tutmak yerine doğrudan DB'den çekiyoruz
        const allWords = await Database._getAll('words');
        const allProgress = await Database._getAll('progress');
        
        const dueWords = [];
        const newWords = [];
        const learningWords = [];

        // Hızlı arama için Map yapısı (O(1) Karmaşıklığı)
        const progressMap = new Map();
        allProgress.forEach(p => progressMap.set(p.id, p));

        // Sadece kullanıcının seviyesindeki kelimeler
        const levelWords = allWords.filter(w => w.level === level);

        levelWords.forEach(word => {
            const p = progressMap.get(word.id);
            if (!p || p.status === 'new') {
                newWords.push({ word, priority: 2 });
            } else if (p.nextReview && p.nextReview <= now) {
                dueWords.push({ word, priority: 1, overdue: now - p.nextReview });
            } else if (p.status === 'learning') {
                learningWords.push({ word, priority: 3 });
            }
        });

        // Vadesi geçenleri en başa alıyoruz
        dueWords.sort((a, b) => b.overdue - a.overdue);
        const combined = [...dueWords, ...newWords, ...learningWords];

        // Aynı önceliğe sahip olanları kendi içinde karıştır (Fisher-Yates)
        for (let i = combined.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            if (combined[i].priority === combined[j].priority) {
                [combined[i], combined[j]] = [combined[j], combined[i]];
            }
        }

        return combined.slice(0, count).map(item => item.word);
    },
    
    // XP ve İstatistiklerin DB'ye güvenli kaydı
    async saveReview(wordId, quality) {
        let progress = await Database.getProgress(wordId);
        const updated = this.calculateNextReview(progress, quality);
        
        // İlerlemeyi IndexedDB'ye yaz
        await Database.saveProgress(wordId, updated);
        
        // Günlük İstatistik güncellemesi (Spagetti koddan kurtarıldı)
        const today = new Date().toISOString().split('T')[0];
        let log = await Database._read('logs', today) || { date: today, wordsStudied: 0, xpEarned: 0 };
        
        log.wordsStudied += 1;
        // Geleneksel XP katsayıları
        log.xpEarned += (quality === 5 ? 10 : quality === 3 ? 5 : 2); 
        
        await Database._write('logs', log);
        
        return updated;
    }
};

window.SRS = SRS;
