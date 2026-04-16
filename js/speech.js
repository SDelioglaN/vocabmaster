// js/speech.js - Vizyoner ve Asenkron Ses Motoru

const Speech = {
    synth: window.speechSynthesis,
    voices: [],
    currentVoice: null,
    rate: 1,
    pitch: 1,

    async init() {
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.loadVoices();
        }
        this.loadVoices();

        // Ölen Storage yerine, vizyoner Database'den asenkron okuma
        try {
            this.rate = await Database.getSetting('speechRate', 1);
        } catch (e) {
            console.warn("Ses ayarı okunamadı, geleneksel varsayılan kullanılıyor.");
            this.rate = 1;
        }
    },

    loadVoices() {
        this.voices = this.synth.getVoices();
        const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
        
        this.currentVoice = 
            englishVoices.find(v => v.name.includes('Google') && v.lang === 'en-US') ||
            englishVoices.find(v => v.name.includes('Microsoft') && v.lang === 'en-US') ||
            englishVoices.find(v => v.lang === 'en-US') ||
            englishVoices.find(v => v.lang.startsWith('en')) ||
            this.voices[0];
    },

    speak(text, options = {}) {
        if (!this.synth) return;
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        if (this.currentVoice) utterance.voice = this.currentVoice;
        
        utterance.rate = options.rate || this.rate;
        utterance.pitch = options.pitch || this.pitch;
        
        this.synth.speak(utterance);
    },

    speakWord(word) {
        return this.speak(word, { rate: 0.8 });
    },

    speakSentence(sentence) {
        return this.speak(sentence, { rate: 0.9 });
    },

    stop() {
        this.synth.cancel();
    },

    isAvailable() {
        return 'speechSynthesis' in window;
    },

    getEnglishVoices() {
        return this.voices.filter(v => v.lang.startsWith('en'));
    },

    async setRate(rate) {
        this.rate = Math.max(0.5, Math.min(2, rate));
        // Senkron Storage yerine asenkron Database kaydı
        await Database.saveSetting('speechRate', this.rate);
    },

    setVoice(voiceURI) {
        const voice = this.voices.find(v => v.voiceURI === voiceURI);
        if (voice) this.currentVoice = voice;
    }
};

window.Speech = Speech;
