// storage.js - LocalStorage management for vocabulary app

const STORAGE_KEYS = {
    PROGRESS: 'vocab_progress',
    SETTINGS: 'vocab_settings',
    STREAK: 'vocab_streak',
    STATS: 'vocab_stats',
    DAILY_LOG: 'vocab_daily_log'
};

// Default settings
const DEFAULT_SETTINGS = {
    level: 'a1',
    speechRate: 1,
    speechVoice: 'en-US',
    dailyGoal: 10,
    soundEnabled: true
};

// Initialize storage with defaults if empty
function initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROGRESS)) {
        localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify({}));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STREAK)) {
        localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify({
            current: 0,
            lastDate: null,
            longest: 0
        }));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STATS)) {
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify({
            totalXP: 0,
            wordsLearned: 0,
            quizzesTaken: 0,
            correctAnswers: 0,
            totalAnswers: 0
        }));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DAILY_LOG)) {
        localStorage.setItem(STORAGE_KEYS.DAILY_LOG, JSON.stringify({}));
    }
}

// Settings functions
function getSettings() {
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return settings ? JSON.parse(settings) : DEFAULT_SETTINGS;
}

function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

function updateSetting(key, value) {
    const settings = getSettings();
    settings[key] = value;
    saveSettings(settings);
}

// Progress functions (SRS data for each word)
function getProgress() {
    const progress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    return progress ? JSON.parse(progress) : {};
}

function saveProgress(progress) {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
}

function getWordProgress(wordId, level) {
    const progress = getProgress();
    const key = `${level}_${wordId}`;
    return progress[key] || {
        interval: 0,
        repetition: 0,
        easeFactor: 2.5,
        nextReview: null,
        lastReview: null,
        status: 'new' // new, learning, review, mastered
    };
}

function saveWordProgress(wordId, level, data) {
    const progress = getProgress();
    const key = `${level}_${wordId}`;
    progress[key] = data;
    saveProgress(progress);
}

// Streak functions
function getStreak() {
    const streak = localStorage.getItem(STORAGE_KEYS.STREAK);
    return streak ? JSON.parse(streak) : { current: 0, lastDate: null, longest: 0 };
}

function updateStreak() {
    const streak = getStreak();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (streak.lastDate === today) {
        // Already updated today
        return streak;
    } else if (streak.lastDate === yesterday) {
        // Continuing streak
        streak.current += 1;
        streak.lastDate = today;
        if (streak.current > streak.longest) {
            streak.longest = streak.current;
        }
    } else {
        // Streak broken, start new
        streak.current = 1;
        streak.lastDate = today;
    }

    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
    return streak;
}

function checkStreakStatus() {
    const streak = getStreak();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (streak.lastDate !== today && streak.lastDate !== yesterday) {
        // Streak is broken
        streak.current = 0;
        localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
    }

    return streak;
}

// Stats functions
function getStats() {
    const stats = localStorage.getItem(STORAGE_KEYS.STATS);
    return stats ? JSON.parse(stats) : {
        totalXP: 0,
        wordsLearned: 0,
        quizzesTaken: 0,
        correctAnswers: 0,
        totalAnswers: 0
    };
}

function addXP(amount) {
    const stats = getStats();
    stats.totalXP += amount;
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    return stats.totalXP;
}

function incrementWordsLearned() {
    const stats = getStats();
    stats.wordsLearned += 1;
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
}

function recordQuizAnswer(isCorrect) {
    const stats = getStats();
    stats.totalAnswers += 1;
    if (isCorrect) {
        stats.correctAnswers += 1;
    }
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
}

function incrementQuizzesTaken() {
    const stats = getStats();
    stats.quizzesTaken += 1;
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
}

function getAccuracy() {
    const stats = getStats();
    if (stats.totalAnswers === 0) return 0;
    return Math.round((stats.correctAnswers / stats.totalAnswers) * 100);
}

// Calculate user level based on XP
function calculateLevel(xp) {
    // Each level requires more XP: level * 100 XP
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

    return {
        level,
        currentXP: progressInLevel,
        requiredXP: xpRequired,
        progressPercent
    };
}

// Get words due for review
function getWordsDueForReview(level) {
    const progress = getProgress();
    const now = Date.now();
    const dueWords = [];

    Object.keys(progress).forEach(key => {
        if (key.startsWith(level + '_')) {
            const wordData = progress[key];
            if (wordData.nextReview && wordData.nextReview <= now) {
                dueWords.push({
                    wordId: parseInt(key.split('_')[1]),
                    ...wordData
                });
            }
        }
    });

    return dueWords;
}

// ===== DAILY LOG FUNCTIONS =====

function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDailyLogs() {
    const logs = localStorage.getItem(STORAGE_KEYS.DAILY_LOG);
    return logs ? JSON.parse(logs) : {};
}

function getDailyLog(dateKey) {
    const logs = getDailyLogs();
    return logs[dateKey] || {
        wordsStudied: 0,
        quizzesDone: 0,
        xpEarned: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        matchingGames: 0,
        timeStarted: null
    };
}

function getTodayLog() {
    return getDailyLog(getTodayKey());
}

function updateDailyLog(updates) {
    const logs = getDailyLogs();
    const todayKey = getTodayKey();
    const today = logs[todayKey] || {
        wordsStudied: 0,
        quizzesDone: 0,
        xpEarned: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        matchingGames: 0,
        timeStarted: null
    };

    if (!today.timeStarted) {
        today.timeStarted = Date.now();
    }

    // Increment values
    Object.keys(updates).forEach(key => {
        if (typeof updates[key] === 'number') {
            today[key] = (today[key] || 0) + updates[key];
        }
    });

    logs[todayKey] = today;
    localStorage.setItem(STORAGE_KEYS.DAILY_LOG, JSON.stringify(logs));
    return today;
}

function getWeeklyLogs() {
    const logs = getDailyLogs();
    const result = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        result.push({
            date: key,
            dayName: dayNames[d.getDay()],
            isToday: i === 0,
            ...logs[key] || { wordsStudied: 0, quizzesDone: 0, xpEarned: 0, correctAnswers: 0, totalAnswers: 0, matchingGames: 0 }
        });
    }
    return result;
}

function getMonthlyLogs() {
    const logs = getDailyLogs();
    const result = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        result.push({
            date: key,
            day: d.getDate(),
            isToday: i === 0,
            ...logs[key] || { wordsStudied: 0, quizzesDone: 0, xpEarned: 0, correctAnswers: 0, totalAnswers: 0, matchingGames: 0 }
        });
    }
    return result;
}

function getDailyGoal() {
    const settings = getSettings();
    return settings.dailyGoal || 10;
}

function setDailyGoal(count) {
    updateSetting('dailyGoal', count);
}

function getDailyGoalProgress() {
    const goal = getDailyGoal();
    const today = getTodayLog();
    const current = today.wordsStudied;
    const percent = Math.min(100, Math.round((current / goal) * 100));
    return { current, goal, percent, completed: current >= goal };
}

// Get category-level breakdown from progress
function getCategoryBreakdown() {
    const progress = getProgress();
    const categories = {};

    Object.keys(progress).forEach(key => {
        // Keys are formatted as "category_wordId" or "level_wordId"
        const parts = key.split('_');
        const category = parts[0];
        if (!categories[category]) {
            categories[category] = { total: 0, mastered: 0, learning: 0, review: 0, new: 0 };
        }
        categories[category].total++;
        const status = progress[key].status || 'new';
        categories[category][status] = (categories[category][status] || 0) + 1;
    });

    return categories;
}

// Get overall word status counts
function getWordStatusCounts() {
    const progress = getProgress();
    const counts = { new: 0, learning: 0, review: 0, mastered: 0 };

    Object.values(progress).forEach(data => {
        const status = data.status || 'new';
        counts[status] = (counts[status] || 0) + 1;
    });

    return counts;
}

// Export functions
window.Storage = {
    init: initStorage,
    getSettings,
    saveSettings,
    updateSetting,
    getProgress,
    getWordProgress,
    saveWordProgress,
    getStreak,
    updateStreak,
    checkStreakStatus,
    getStats,
    addXP,
    incrementWordsLearned,
    recordQuizAnswer,
    incrementQuizzesTaken,
    getAccuracy,
    calculateLevel,
    getWordsDueForReview,
    // New daily log functions
    getTodayKey,
    getDailyLog,
    getTodayLog,
    updateDailyLog,
    getWeeklyLogs,
    getMonthlyLogs,
    getDailyGoal,
    setDailyGoal,
    getDailyGoalProgress,
    getCategoryBreakdown,
    getWordStatusCounts
};
