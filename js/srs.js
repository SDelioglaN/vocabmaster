// srs.js - Spaced Repetition System (SM-2 inspired algorithm)

/**
 * SM-2 Algorithm Implementation
 * 
 * Quality ratings:
 * 0 - Complete blackout
 * 1 - Wrong, but recognized
 * 2 - Wrong, easy to recall
 * 3 - Correct with difficulty
 * 4 - Correct with hesitation
 * 5 - Perfect response
 * 
 * Simplified to 3 buttons: Hard (1), Good (3), Easy (5)
 */

const SRS_CONFIG = {
    MIN_EASE_FACTOR: 1.3,
    DEFAULT_EASE_FACTOR: 2.5,
    INTERVALS: {
        // Initial intervals in minutes
        AGAIN: 1,           // 1 minute
        HARD: 10,           // 10 minutes
        GOOD: 1440,         // 1 day (1440 minutes)
        EASY: 4320          // 3 days
    }
};

/**
 * Calculate the next review interval based on user response
 * @param {Object} wordProgress - Current progress data for the word
 * @param {number} quality - User's response quality (1=Hard, 3=Good, 5=Easy)
 * @returns {Object} Updated progress data
 */
function calculateNextReview(wordProgress, quality) {
    const now = Date.now();
    let { interval, repetition, easeFactor, status } = wordProgress;

    // Initialize if new word
    if (status === 'new') {
        interval = 0;
        repetition = 0;
        easeFactor = SRS_CONFIG.DEFAULT_EASE_FACTOR;
    }

    // Map simplified quality to intervals
    if (quality < 3) {
        // Hard - reset or short interval
        repetition = 0;
        interval = SRS_CONFIG.INTERVALS.HARD;
        status = 'learning';
    } else if (quality === 3) {
        // Good - standard progression
        if (repetition === 0) {
            interval = SRS_CONFIG.INTERVALS.GOOD; // 1 day
        } else if (repetition === 1) {
            interval = SRS_CONFIG.INTERVALS.GOOD * 3; // 3 days
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetition += 1;
        status = repetition >= 3 ? 'review' : 'learning';
    } else {
        // Easy - fast progression
        if (repetition === 0) {
            interval = SRS_CONFIG.INTERVALS.EASY; // 3 days
        } else {
            interval = Math.round(interval * easeFactor * 1.3);
        }
        repetition += 1;
        easeFactor += 0.15;
        status = repetition >= 2 ? 'review' : 'learning';
    }

    // Check if word is mastered (reviewed successfully 5+ times with long interval)
    if (repetition >= 5 && interval >= 43200) { // 30 days
        status = 'mastered';
    }

    // Update ease factor based on quality
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    easeFactor = Math.max(SRS_CONFIG.MIN_EASE_FACTOR, easeFactor);

    // Calculate next review time
    const nextReview = now + (interval * 60 * 1000); // Convert minutes to milliseconds

    return {
        interval,
        repetition,
        easeFactor,
        nextReview,
        lastReview: now,
        status
    };
}

/**
 * Get XP reward based on response quality
 * @param {number} quality - User's response quality
 * @param {string} status - Word's current status
 * @returns {number} XP earned
 */
function getXPReward(quality, status) {
    const baseXP = {
        1: 2,   // Hard
        3: 5,   // Good
        5: 10   // Easy
    };

    const statusMultiplier = {
        'new': 1.5,
        'learning': 1,
        'review': 0.8,
        'mastered': 0.5
    };

    return Math.round(baseXP[quality] * (statusMultiplier[status] || 1));
}

/**
 * Get words to study based on SRS algorithm
 * @param {Array} allWords - All words in the current level
 * @param {Object} progress - Progress data for all words
 * @param {string} level - Current level (a1, a2, etc.)
 * @param {number} count - Number of words to return
 * @returns {Array} Words to study
 */
function getWordsToStudy(allWords, progress, level, count = 10) {
    const now = Date.now();
    const wordsToStudy = [];

    // Priority 1: Words due for review
    const dueWords = [];
    // Priority 2: New words
    const newWords = [];
    // Priority 3: Learning words
    const learningWords = [];

    allWords.forEach(word => {
        const key = `${level}_${word.id}`;
        const wordProgress = progress[key];

        if (!wordProgress || wordProgress.status === 'new') {
            newWords.push({ word, priority: 2 });
        } else if (wordProgress.nextReview && wordProgress.nextReview <= now) {
            dueWords.push({
                word,
                priority: 1,
                overdue: now - wordProgress.nextReview
            });
        } else if (wordProgress.status === 'learning') {
            learningWords.push({ word, priority: 3 });
        }
    });

    // Sort due words by how overdue they are
    dueWords.sort((a, b) => b.overdue - a.overdue);

    // Combine in priority order
    const combined = [...dueWords, ...newWords, ...learningWords];

    // Shuffle within same priority to add variety
    for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        if (combined[i].priority === combined[j].priority) {
            [combined[i], combined[j]] = [combined[j], combined[i]];
        }
    }

    return combined.slice(0, count).map(item => item.word);
}

/**
 * Get study session summary
 * @param {Object} progress - Progress data
 * @param {string} level - Current level
 * @returns {Object} Summary stats
 */
function getStudySummary(progress, level) {
    let newCount = 0;
    let learningCount = 0;
    let reviewCount = 0;
    let masteredCount = 0;
    let dueCount = 0;

    const now = Date.now();

    Object.keys(progress).forEach(key => {
        if (key.startsWith(level + '_')) {
            const data = progress[key];
            switch (data.status) {
                case 'new': newCount++; break;
                case 'learning': learningCount++; break;
                case 'review': reviewCount++; break;
                case 'mastered': masteredCount++; break;
            }
            if (data.nextReview && data.nextReview <= now) {
                dueCount++;
            }
        }
    });

    return {
        new: newCount,
        learning: learningCount,
        review: reviewCount,
        mastered: masteredCount,
        due: dueCount,
        total: newCount + learningCount + reviewCount + masteredCount
    };
}

/**
 * Format interval for display
 * @param {number} minutes - Interval in minutes
 * @returns {string} Human-readable interval
 */
function formatInterval(minutes) {
    if (minutes < 60) {
        return `${minutes} dakika`;
    } else if (minutes < 1440) {
        const hours = Math.round(minutes / 60);
        return `${hours} saat`;
    } else if (minutes < 43200) {
        const days = Math.round(minutes / 1440);
        return `${days} gün`;
    } else {
        const months = Math.round(minutes / 43200);
        return `${months} ay`;
    }
}

// Export SRS functions
window.SRS = {
    calculateNextReview,
    getXPReward,
    getWordsToStudy,
    getStudySummary,
    formatInterval
};
