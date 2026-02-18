// speech.js - Text-to-Speech functionality using Web Speech API

const Speech = {
    synth: window.speechSynthesis,
    voices: [],
    currentVoice: null,
    rate: 1,
    pitch: 1,

    /**
     * Initialize speech synthesis and load voices
     */
    init() {
        // Get voices when they're loaded
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.loadVoices();
        }
        this.loadVoices();

        // Load settings
        const settings = Storage.getSettings();
        this.rate = settings.speechRate || 1;
    },

    /**
     * Load available voices
     */
    loadVoices() {
        this.voices = this.synth.getVoices();

        // Find English voices (prefer US, then UK)
        const englishVoices = this.voices.filter(v =>
            v.lang.startsWith('en')
        );

        // Priority: Google US > Microsoft US > any US > any UK > any English
        const preferredVoice =
            englishVoices.find(v => v.name.includes('Google') && v.lang === 'en-US') ||
            englishVoices.find(v => v.name.includes('Microsoft') && v.lang === 'en-US') ||
            englishVoices.find(v => v.lang === 'en-US') ||
            englishVoices.find(v => v.lang === 'en-GB') ||
            englishVoices[0];

        if (preferredVoice) {
            this.currentVoice = preferredVoice;
        }
    },

    /**
     * Speak the given text
     * @param {string} text - Text to speak
     * @param {Object} options - Optional settings (rate, pitch, voice)
     * @returns {Promise} Resolves when speaking is complete
     */
    speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            // Cancel any ongoing speech
            this.synth.cancel();

            if (!text) {
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);

            // Set voice
            if (options.voice) {
                utterance.voice = this.voices.find(v => v.name === options.voice) || this.currentVoice;
            } else {
                utterance.voice = this.currentVoice;
            }

            // Set rate (0.1 to 10, default 1)
            utterance.rate = options.rate || this.rate;

            // Set pitch (0 to 2, default 1)
            utterance.pitch = options.pitch || this.pitch;

            // Set language
            utterance.lang = 'en-US';

            // Event handlers
            utterance.onend = () => resolve();
            utterance.onerror = (e) => {
                console.warn('Speech synthesis error:', e);
                resolve(); // Don't reject - TTS failure shouldn't break the app
            };

            // Speak
            this.synth.speak(utterance);
        });
    },

    /**
     * Speak word with phonetic emphasis (slower for learning)
     * @param {string} word - Word to speak
     */
    speakWord(word) {
        return this.speak(word, { rate: 0.8 });
    },

    /**
     * Speak example sentence at normal speed
     * @param {string} sentence - Sentence to speak
     */
    speakSentence(sentence) {
        return this.speak(sentence, { rate: 0.9 });
    },

    /**
     * Stop speaking
     */
    stop() {
        this.synth.cancel();
    },

    /**
     * Check if speech synthesis is available
     * @returns {boolean}
     */
    isAvailable() {
        return 'speechSynthesis' in window;
    },

    /**
     * Get available English voices
     * @returns {Array} List of voice objects
     */
    getEnglishVoices() {
        return this.voices.filter(v => v.lang.startsWith('en'));
    },

    /**
     * Set speech rate
     * @param {number} rate - Rate between 0.5 and 2
     */
    setRate(rate) {
        this.rate = Math.max(0.5, Math.min(2, rate));
        Storage.updateSetting('speechRate', this.rate);
    },

    /**
     * Set current voice
     * @param {string} voiceName - Name of the voice to use
     */
    setVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
            this.currentVoice = voice;
            Storage.updateSetting('speechVoice', voiceName);
        }
    }
};

// Export Speech module
window.Speech = Speech;
