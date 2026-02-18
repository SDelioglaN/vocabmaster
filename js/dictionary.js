// dictionary.js - Dictionary tab with Free Dictionary API + Turkish↔English Search

const Dictionary = {
    /**
     * Initialize dictionary
     */
    init() {
        this.setupEventListeners();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search button
        document.getElementById('dictSearchBtn')?.addEventListener('click', () => this.search());

        // Enter key for search
        document.getElementById('dictSearchInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.search();
        });
    },

    // ─────────────────────────────────────────────────
    // LANGUAGE DETECTION
    // ─────────────────────────────────────────────────

    /**
     * Detect if input is Turkish or English
     * Uses Turkish-specific characters + regex heuristic
     */
    detectLanguage(text) {
        const turkishChars = /[çÇşŞğĞıİöÖüÜ]/;
        if (turkishChars.test(text)) return 'tr';

        // Additional heuristic: if it contains only ASCII and common English patterns
        // treat as English
        return 'en';
    },

    // ─────────────────────────────────────────────────
    // MAIN SEARCH (entry point)
    // ─────────────────────────────────────────────────

    /**
     * Search word - auto-detects language and routes accordingly
     */
    async search() {
        const input = document.getElementById('dictSearchInput');
        const word = input?.value.trim();

        if (!word) return;

        const container = document.getElementById('dictResultContainer');
        container.innerHTML = `
            <div class="dict-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Aranıyor...</p>
            </div>
        `;

        const lang = this.detectLanguage(word);

        if (lang === 'tr') {
            // ── TURKISH INPUT → find English translations ──
            await this.searchTurkishWord(word);
        } else {
            // ── ENGLISH INPUT → existing flow ──
            await this.searchEnglishWord(word.toLowerCase());
        }
    },

    // ─────────────────────────────────────────────────
    // TURKISH → ENGLISH SEARCH
    // ─────────────────────────────────────────────────

    /**
     * Search for English translations of a Turkish word
     * 3-layer approach: Local DB → MyMemory API → DictionaryAPI enrichment
     */
    async searchTurkishWord(turkishWord) {
        const container = document.getElementById('dictResultContainer');
        const searchTerm = turkishWord.toLowerCase().trim();

        // Collect all English matches
        let englishWords = [];

        // LAYER 1: Search local word databases
        const localResults = this.searchLocalTurkish(searchTerm);
        englishWords.push(...localResults);

        // LAYER 2: MyMemory API translation (tr→en)
        try {
            const apiResults = await this.getEnglishFromAPI(searchTerm);
            for (const word of apiResults) {
                if (!englishWords.find(w => w.word.toLowerCase() === word.toLowerCase())) {
                    englishWords.push({ word: word, source: 'api' });
                }
            }
        } catch (e) {
            console.warn('MyMemory TR→EN failed:', e);
        }

        // If no results at all, show error
        if (englishWords.length === 0) {
            container.innerHTML = `
                <div class="dict-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Sonuç bulunamadı</h3>
                    <p>"${turkishWord}" için İngilizce karşılık bulunamadı.</p>
                    <p class="dict-hint">Farklı bir kelime deneyin</p>
                </div>
            `;
            return;
        }

        // LAYER 3: Enrich each English word with DictionaryAPI details
        const enrichedResults = [];
        for (const item of englishWords.slice(0, 8)) { // Max 8 words
            const enriched = await this.enrichWithDictionaryAPI(item.word);
            enrichedResults.push({
                ...item,
                ...enriched
            });
        }

        // Collect extra synonyms from enriched results
        const extraSynonyms = [];
        for (const result of enrichedResults) {
            if (result.synonyms) {
                for (const syn of result.synonyms) {
                    const synLower = syn.toLowerCase();
                    if (!englishWords.find(w => w.word.toLowerCase() === synLower) &&
                        !extraSynonyms.find(s => s.toLowerCase() === synLower)) {
                        extraSynonyms.push(syn);
                    }
                }
            }
        }

        // Render the results
        this.renderTurkishSearchResult(turkishWord, enrichedResults, extraSynonyms);
    },

    /**
     * Search all local word databases for Turkish translation matches
     * Searches App.words (categories) and WordList.allWords (levels)
     */
    searchLocalTurkish(searchTerm) {
        const results = [];
        const seen = new Set();

        // Helper: check if translation matches search term
        const matchesTranslation = (translation, term) => {
            if (!translation) return false;
            const trLower = translation.toLowerCase();
            // Split by common delimiters in translation field (e.g. "iş / çalışmak", "sevmek / aşk")
            const parts = trLower.split(/[\/,;|]/).map(p => p.trim());

            // Check each part: exact match or starts with the term
            for (const part of parts) {
                if (part === term) return true; // exact match
                // Also check if the part starts with the search term (for partial matches like "yemek" matching "yemek (fiil)")
                const cleanPart = part.replace(/\s*\(.*?\)\s*/g, '').trim();
                if (cleanPart === term) return true;
            }

            // Fallback: check if any part contains the term
            return parts.some(p => p.includes(term));
        };

        // Search App.words (category words)
        if (window.App && App.words && Array.isArray(App.words)) {
            for (const w of App.words) {
                if (w.word && w.translation && matchesTranslation(w.translation, searchTerm)) {
                    const key = w.word.toLowerCase();
                    if (!seen.has(key)) {
                        seen.add(key);
                        results.push({
                            word: w.word,
                            translation: w.translation,
                            phonetic: w.phonetic || '',
                            example: w.example || '',
                            exampleTr: w.exampleTr || '',
                            level: w.level || '',
                            source: 'local'
                        });
                    }
                }
            }
        }

        // Search WordList.allWords (level words)
        if (window.WordList && WordList.allWords && Array.isArray(WordList.allWords)) {
            for (const w of WordList.allWords) {
                if (w.word && w.translation && matchesTranslation(w.translation, searchTerm)) {
                    const key = w.word.toLowerCase();
                    if (!seen.has(key)) {
                        seen.add(key);
                        results.push({
                            word: w.word,
                            translation: w.translation,
                            phonetic: w.phonetic || '',
                            example: w.example || '',
                            exampleTr: w.exampleTr || '',
                            level: w.level || '',
                            source: 'local'
                        });
                    }
                }
            }
        }

        // Sort: exact matches first, then partial matches
        results.sort((a, b) => {
            const aExact = a.translation.toLowerCase().split(/[\/,;|]/).some(p => p.trim() === searchTerm);
            const bExact = b.translation.toLowerCase().split(/[\/,;|]/).some(p => p.trim() === searchTerm);
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return 0;
        });

        return results;
    },

    /**
     * Get English translations from MyMemory API (Turkish → English)
     */
    async getEnglishFromAPI(turkishWord) {
        const results = [];

        try {
            const response = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(turkishWord)}&langpair=tr|en`
            );
            const data = await response.json();

            if (data.responseStatus === 200 && data.responseData?.translatedText) {
                const translated = data.responseData.translatedText.trim();
                // Only add if it's actually different from the input (not returning Turkish)
                if (translated.toLowerCase() !== turkishWord.toLowerCase() && translated.length > 0) {
                    // The API might return a phrase; split it and also keep the full phrase
                    results.push(translated.toLowerCase());
                }
            }

            // Also check translation matches (alternative translations)
            if (data.matches && Array.isArray(data.matches)) {
                for (const match of data.matches.slice(0, 5)) {
                    if (match.translation) {
                        const tr = match.translation.trim().toLowerCase();
                        if (tr !== turkishWord.toLowerCase() && tr.length > 0 && tr.length < 30 && !results.includes(tr)) {
                            results.push(tr);
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('MyMemory TR→EN error:', err);
        }

        return results;
    },

    /**
     * Enrich an English word with data from Free Dictionary API
     * Returns phonetic, definition, audio, synonyms
     */
    async enrichWithDictionaryAPI(word) {
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            if (!response.ok) return {};

            const data = await response.json();
            const entry = data[0];
            if (!entry) return {};

            const allSynonyms = [];
            const meanings = entry.meanings || [];

            // Collect data from all meanings
            const definitions = [];
            for (const m of meanings) {
                if (m.synonyms) allSynonyms.push(...m.synonyms);
                for (const d of (m.definitions || []).slice(0, 2)) {
                    definitions.push({
                        definition: d.definition,
                        example: d.example || '',
                        pos: this.translatePOS(m.partOfSpeech)
                    });
                    if (d.synonyms) allSynonyms.push(...d.synonyms);
                }
            }

            return {
                phonetic: entry.phonetics?.find(p => p.text)?.text || entry.phonetic || '',
                audio: entry.phonetics?.find(p => p.audio && p.audio.length > 0)?.audio || '',
                definitions: definitions.slice(0, 3),
                synonyms: [...new Set(allSynonyms)].slice(0, 6)
            };
        } catch (e) {
            return {};
        }
    },

    /**
     * Render Turkish search results as rich cards
     */
    renderTurkishSearchResult(turkishWord, results, extraSynonyms) {
        const container = document.getElementById('dictResultContainer');

        let html = `
            <div class="dict-result">
                <div class="dict-result-header" style="border-bottom: 2px solid rgba(139,92,246,0.3); padding-bottom: 16px; margin-bottom: 16px;">
                    <div class="dict-word-info">
                        <h2 style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #f59e0b;">🇹🇷</span> ${turkishWord}
                            <span style="font-size: 0.5em; color: #9ca3af; font-weight: 400;">→ İngilizce</span>
                        </h2>
                        <span class="dict-phonetic" style="color: #a78bfa;">
                            <i class="fas fa-search"></i> ${results.length} sonuç bulundu
                        </span>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${results.map((r, index) => `
                        <div style="background: linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.06)); border-radius: 14px; padding: 18px; border-left: 4px solid ${r.source === 'local' ? '#10b981' : '#3b82f6'}; transition: transform 0.2s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
                            
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
                                <span style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-size: 0.75rem; padding: 2px 8px; border-radius: 999px; font-weight: 700;">${index + 1}</span>
                                <strong style="color: #e2e8f0; font-size: 1.25rem;">${r.word}</strong>
                                ${r.phonetic ? `<span style="color: #9ca3af; font-size: 0.85rem;">${r.phonetic}</span>` : ''}
                                ${r.audio ? `<button class="dict-play-btn" onclick="Dictionary.playAudio('${r.audio}')" style="padding: 4px 10px; font-size: 0.75rem;"><i class="fas fa-volume-up"></i></button>` : ''}
                                ${r.level ? `<span style="background: rgba(245,158,11,0.15); color: #f59e0b; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase;">${r.level}</span>` : ''}
                                ${r.source === 'local' ? `<span style="background: rgba(16,185,129,0.15); color: #10b981; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px;">📚 Yerel</span>` : ''}
                            </div>

                            ${r.translation ? `
                            <div style="color: #10b981; font-weight: 600; margin-bottom: 8px; font-size: 1rem;">
                                🇹🇷 ${r.translation}
                            </div>
                            ` : ''}

                            ${r.definitions && r.definitions.length > 0 ? `
                            <div style="margin-bottom: 8px;">
                                ${r.definitions.map(d => `
                                    <div style="margin-bottom: 6px;">
                                        ${d.pos ? `<span class="dict-pos-tag" style="font-size: 0.65rem; padding: 1px 6px;">${d.pos}</span>` : ''}
                                        <p style="color: #cbd5e1; font-size: 0.88rem; margin: 4px 0 0 0;">${d.definition}</p>
                                        ${d.example ? `<p style="color: #94a3b8; font-size: 0.82rem; font-style: italic; margin: 2px 0 0 12px;">"${d.example}"</p>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                            ` : ''}

                            ${r.example ? `
                            <div style="background: rgba(0,0,0,0.15); border-radius: 8px; padding: 10px; margin-top: 6px;">
                                <p style="color: #e2e8f0; font-size: 0.85rem; margin: 0;">📝 ${r.example}</p>
                                ${r.exampleTr ? `<p style="color: #9ca3af; font-size: 0.8rem; margin: 4px 0 0 0;">→ ${r.exampleTr}</p>` : ''}
                            </div>
                            ` : ''}

                            ${r.synonyms && r.synonyms.length > 0 ? `
                            <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                                <span style="color: #9ca3af; font-size: 0.75rem;"><i class="fas fa-equals"></i> Benzer:</span>
                                ${r.synonyms.map(s => `<span style="background: rgba(139,92,246,0.15); color: #a78bfa; font-size: 0.75rem; padding: 2px 8px; border-radius: 999px; cursor: pointer;" onclick="document.getElementById('dictSearchInput').value='${s}'; Dictionary.search();">${s}</span>`).join('')}
                            </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>

                ${extraSynonyms.length > 0 ? `
                <div style="margin-top: 20px; padding: 16px; background: rgba(139,92,246,0.06); border-radius: 12px; border: 1px dashed rgba(139,92,246,0.3);">
                    <h4 style="color: #a78bfa; font-size: 0.85rem; margin: 0 0 10px 0;">
                        <i class="fas fa-lightbulb"></i> İlgili Diğer Kelimeler
                    </h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${extraSynonyms.slice(0, 10).map(s => `
                            <span style="background: rgba(59,130,246,0.12); color: #60a5fa; font-size: 0.8rem; padding: 4px 12px; border-radius: 999px; cursor: pointer; transition: all 0.2s;" 
                                  onclick="document.getElementById('dictSearchInput').value='${s}'; Dictionary.search();"
                                  onmouseover="this.style.background='rgba(59,130,246,0.25)'"
                                  onmouseout="this.style.background='rgba(59,130,246,0.12)'">${s}</span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        container.innerHTML = html;
    },

    // ─────────────────────────────────────────────────
    // ENGLISH → TURKISH SEARCH (existing flow)
    // ─────────────────────────────────────────────────

    /**
     * Search English word (original flow)
     */
    async searchEnglishWord(word) {
        const container = document.getElementById('dictResultContainer');

        // Strategy 1: Try Free Dictionary API (works great for single words)
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

            if (response.ok) {
                const data = await response.json();
                await this.renderResult(data[0]);
                return;
            }
        } catch (e) {
            // API failed, continue to fallback
        }

        // Strategy 2: Fallback — use translation API + word breakdown
        try {
            await this.renderTranslationResult(word);
        } catch (error) {
            container.innerHTML = `
                <div class="dict-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Sonuç bulunamadı</h3>
                    <p>"${word}" için sonuç bulunamadı.</p>
                    <p class="dict-hint">Farklı bir kelime veya ifade deneyin</p>
                </div>
            `;
        }
    },

    /**
     * Render translation-based result (for phrases and words not in dictionary)
     */
    async renderTranslationResult(phrase) {
        const container = document.getElementById('dictResultContainer');

        // Get Turkish translation of the full phrase
        let turkishTranslation = null;
        try {
            const response = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(phrase)}&langpair=en|tr`
            );
            const data = await response.json();
            if (data.responseStatus === 200 && data.responseData?.translatedText) {
                const translated = data.responseData.translatedText;
                if (translated.toLowerCase() !== phrase.toLowerCase()) {
                    turkishTranslation = translated;
                }
            }
        } catch (e) {
            console.warn('Translation failed:', e);
        }

        // Split phrase into individual words and look up each
        const words = phrase.split(/\s+/).filter(w => w.length > 2);
        let wordBreakdowns = [];

        for (const w of words.slice(0, 4)) {
            try {
                const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
                if (resp.ok) {
                    const data = await resp.json();
                    const entry = data[0];
                    const meaning = entry.meanings?.[0];
                    const definition = meaning?.definitions?.[0]?.definition || '';
                    const pos = meaning?.partOfSpeech || '';
                    wordBreakdowns.push({
                        word: entry.word,
                        phonetic: entry.phonetics?.find(p => p.text)?.text || '',
                        pos: this.translatePOS(pos),
                        definition: definition,
                        audio: entry.phonetics?.find(p => p.audio)?.audio || ''
                    });
                }
            } catch (e) {
                // Skip this word
            }
        }

        // Also get Turkish translation for each individual word
        for (const wb of wordBreakdowns) {
            try {
                const resp = await fetch(
                    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(wb.word)}&langpair=en|tr`
                );
                const data = await resp.json();
                if (data.responseStatus === 200 && data.responseData?.translatedText) {
                    const tr = data.responseData.translatedText;
                    if (tr.toLowerCase() !== wb.word.toLowerCase()) {
                        wb.turkish = tr;
                    }
                }
            } catch (e) { /* skip */ }
        }

        // Build the HTML
        let html = `
            <div class="dict-result">
                <div class="dict-result-header">
                    <div class="dict-word-info">
                        <h2>${phrase}</h2>
                        <span class="dict-phonetic" style="color: #a78bfa;">🔄 Çeviri Modu</span>
                    </div>
                </div>

                ${turkishTranslation ? `
                <div class="dict-turkish-translation" style="margin: 16px 0; padding: 16px; background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.1)); border-radius: 12px; border-left: 4px solid #10b981;">
                    <span class="dict-tr-label" style="font-size: 0.85rem; color: #9ca3af;"><i class="fas fa-language"></i> Türkçe Çeviri:</span>
                    <div style="font-size: 1.4rem; font-weight: 700; color: #10b981; margin-top: 4px;">${turkishTranslation}</div>
                </div>
                ` : ''}

                ${wordBreakdowns.length > 0 ? `
                <div style="margin-top: 20px;">
                    <h3 style="color: #a78bfa; font-size: 0.95rem; margin-bottom: 12px;">
                        <i class="fas fa-puzzle-piece"></i> Kelime Kelime Açıklama
                    </h3>
                    ${wordBreakdowns.map(wb => `
                        <div style="background: rgba(139,92,246,0.08); border-radius: 10px; padding: 14px; margin-bottom: 10px; border-left: 3px solid #8b5cf6;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                                <strong style="color: #e2e8f0; font-size: 1.1rem;">${wb.word}</strong>
                                ${wb.phonetic ? `<span style="color: #9ca3af; font-size: 0.85rem;">${wb.phonetic}</span>` : ''}
                                ${wb.pos ? `<span class="dict-pos-tag" style="font-size: 0.7rem; padding: 2px 8px;">${wb.pos}</span>` : ''}
                                ${wb.audio ? `<button class="dict-play-btn" onclick="Dictionary.playAudio('${wb.audio}')" style="padding: 4px 8px; font-size: 0.7rem;"><i class="fas fa-volume-up"></i></button>` : ''}
                            </div>
                            ${wb.turkish ? `<div style="color: #10b981; font-weight: 600; margin-bottom: 4px;">🇹🇷 ${wb.turkish}</div>` : ''}
                            ${wb.definition ? `<p style="color: #cbd5e1; font-size: 0.9rem; margin: 0;">${wb.definition}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                ${!turkishTranslation && wordBreakdowns.length === 0 ? `
                <div class="dict-error" style="margin-top: 16px;">
                    <p>Bu ifade için sonuç bulunamadı.</p>
                </div>
                ` : ''}
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Render API search result
     */
    async renderResult(data) {
        const container = document.getElementById('dictResultContainer');

        // Get phonetic audio
        const audioUrl = data.phonetics?.find(p => p.audio)?.audio || '';
        const phonetic = data.phonetics?.find(p => p.text)?.text || data.phonetic || '';

        // Get meanings
        const meanings = data.meanings || [];

        // Get Turkish translation
        const turkishTranslation = await this.getTurkishTranslation(data.word);

        let html = `
            <div class="dict-result">
                <div class="dict-result-header">
                    <div class="dict-word-info">
                        <h2>${data.word}</h2>
                        <span class="dict-phonetic">${phonetic}</span>
                    </div>
                    ${audioUrl ? `
                        <button class="dict-play-btn" onclick="Dictionary.playAudio('${audioUrl}')">
                            <i class="fas fa-volume-up"></i> Dinle
                        </button>
                    ` : ''}
                </div>

                ${turkishTranslation ? `
                <div class="dict-turkish-translation">
                    <span class="dict-tr-label"><i class="fas fa-language"></i> Türkçe:</span>
                    <span class="dict-tr-value">${turkishTranslation}</span>
                </div>
                ` : ''}
                
                <div class="dict-meanings">
                    ${meanings.map(m => `
                        <div class="dict-meaning-block">
                            <span class="dict-pos-tag">${this.translatePOS(m.partOfSpeech)}</span>
                            <ol class="dict-def-list">
                                ${m.definitions.slice(0, 3).map(d => `
                                    <li>
                                        <p class="dict-definition">${d.definition}</p>
                                        ${d.example ? `<p class="dict-example-text">"${d.example}"</p>` : ''}
                                    </li>
                                `).join('')}
                            </ol>
                            ${m.synonyms?.length ? `
                                <div class="dict-synonyms-box">
                                    <strong><i class="fas fa-equals"></i> Eşanlamlılar:</strong>
                                    <span>${m.synonyms.slice(0, 5).join(', ')}</span>
                                </div>
                            ` : ''}
                            ${m.antonyms?.length ? `
                                <div class="dict-antonyms-box">
                                    <strong><i class="fas fa-not-equal"></i> Zıt anlamlılar:</strong>
                                    <span>${m.antonyms.slice(0, 5).join(', ')}</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    // ─────────────────────────────────────────────────
    // SHARED UTILITIES
    // ─────────────────────────────────────────────────

    /**
     * Get Turkish translation - first from local DB, then from API
     */
    async getTurkishTranslation(word) {
        // 1. Check local word database
        if (window.App && App.words) {
            const localMatch = App.words.find(w =>
                w.word && w.word.toLowerCase() === word.toLowerCase()
            );
            if (localMatch && localMatch.translation) {
                return localMatch.translation;
            }
        }

        // 2. Fallback to MyMemory Translation API
        try {
            const response = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|tr`
            );
            const data = await response.json();
            if (data.responseStatus === 200 && data.responseData?.translatedText) {
                const translated = data.responseData.translatedText;
                if (translated.toLowerCase() !== word.toLowerCase()) {
                    return translated;
                }
            }
        } catch (err) {
            console.warn('Translation API error:', err);
        }

        return null;
    },

    /**
     * Translate part of speech to Turkish
     */
    translatePOS(pos) {
        const translations = {
            'noun': 'İsim',
            'verb': 'Fiil',
            'adjective': 'Sıfat',
            'adverb': 'Zarf',
            'pronoun': 'Zamir',
            'preposition': 'Edat',
            'conjunction': 'Bağlaç',
            'interjection': 'Ünlem',
            'determiner': 'Belirteç',
            'exclamation': 'Ünlem'
        };
        return translations[pos] || pos;
    },

    /**
     * Play audio from URL
     */
    playAudio(url) {
        const audio = new Audio(url);
        audio.play();
    }
};

// Tab Navigation Handler
const TabNavigation = {
    init() {
        document.querySelectorAll('.main-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
    },

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${tabName}Tab`)?.classList.add('active');

        // Initialize stats dashboard when switching to stats tab
        if (tabName === 'stats' && window.Stats) {
            Stats.init();
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    TabNavigation.init();
    Dictionary.init();
});
