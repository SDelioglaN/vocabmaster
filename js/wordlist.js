// js/wordlist.js - Gerçek Seviye Senkronizasyonu ve Manuel Kontrol Modülü

const WordList = {
    filteredWords: [],

    async init() {
        await this.syncDatabase();
        this.setupEventListeners();
        await this.applyFilters();
    },

    async syncDatabase() {
        const existingWords = await Database._getAll('words');
        
        // Eğer kelime yoksa VEYA seviyeler hatalı (matematiksel) atandıysa gerçek dosyalarla onar
        if (existingWords.length === 0 || existingWords.some(w => w.id.includes('senses_') || w.id.includes('kitchen_'))) {
            console.log("Gerçek seviye dosyaları (A1-C1) IndexedDB'ye tohumlanıyor/onarılıyor...");
            
            const levels = ['a1', 'a2', 'b1', 'b2', 'c1'];
            let totalAdded = 0;

            for (const level of levels) {
                try {
                    const response = await fetch(`data/words-${level}.json`);
                    if (!response.ok) continue;
                    const words = await response.json();
                    
                    for (let w of words) {
                        const wordData = {
                            ...w,
                            id: `${level}_${w.id}`,
                            category: 'general', // Orijinal Oxford yapısında genel havuz
                            level: level
                        };
                        await Database._write('words', wordData);
                        totalAdded++;
                    }
                } catch (error) {
                    console.error(`${level} dosyası yüklenemedi:`, error);
                }
            }
            
            // Eğer sistemde eski hatalı ID'li (örn: senses_1) kelimeler varsa temizle
            const allCleanWords = await Database._getAll('words');
            for (let cw of allCleanWords) {
                if (cw.id.includes('senses_') || cw.id.includes('kitchen_') || cw.id.includes('home_')) {
                    const tx = Database.db.transaction('words', 'readwrite');
                    tx.objectStore('words').delete(cw.id);
                }
            }

            console.log(`Tohumlama tamamlandı. Toplam ${totalAdded} kelime gerçek seviyesiyle sisteme işlendi.`);
        }
    },

    setupEventListeners() {
        document.getElementById('wlCategorySelect')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('wlLevelSelect')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('wlSearchInput')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('searchNewWordBtn')?.addEventListener('click', () => this.searchApiWord());
        
        // Edit Modal Kapatma Event'i
        document.getElementById('closeEditModal')?.addEventListener('click', () => {
            document.getElementById('editWordModal').style.display = 'none';
        });
    },

    async applyFilters() {
        const category = document.getElementById('wlCategorySelect')?.value || 'all';
        const level = document.getElementById('wlLevelSelect')?.value || 'all';
        const search = document.getElementById('wlSearchInput')?.value.toLowerCase().trim() || '';

        const allWordsFromDB = await Database._getAll('words');

        this.filteredWords = allWordsFromDB.filter(w => {
            if (category !== 'all' && w.category !== category) return false;
            if (level !== 'all' && w.level !== level) return false;
            if (search && !w.word.toLowerCase().includes(search) && !w.translation.toLowerCase().includes(search)) return false;
            return true;
        });

        this.render();
    },

    render() {
        const container = document.getElementById('wordlistContainer');
        if (!container) return;

        const countEl = document.getElementById('wlWordCount');
        if (countEl) countEl.textContent = `${this.filteredWords.length} kelime bulundu`;

        if (this.filteredWords.length === 0) {
            container.innerHTML = `
                <div class="wl-empty">
                    <i class="fas fa-search"></i>
                    <h3>Kelime bulunamadı</h3>
                    <p>Filtreleri değiştirmeyi veya yeni kelime eklemeyi deneyin.</p>
                </div>
            `;
            return;
        }

        const levelColors = { 'a1': '#10b981', 'a2': '#3b82f6', 'b1': '#f59e0b', 'b2': '#ea580c', 'c1': '#ef4444', 'custom': '#8b5cf6' };

        let html = '<div class="wl-words-grid">';
        
        this.filteredWords.forEach(w => {
            const lvlColor = levelColors[w.level] || '#3b82f6';
            html += `
                <div class="wl-word-card" style="border-left: 4px solid ${lvlColor};">
                    <div class="wl-card-content">
                        <div class="wl-word-top">
                            <span class="wl-word-en">${w.word}</span>
                            <span class="wl-word-level" style="background: ${lvlColor}20; color: ${lvlColor}; border: 1px solid ${lvlColor};">${w.level.toUpperCase()}</span>
                        </div>
                        <span class="wl-word-tr">${w.translation}</span>
                        <span class="wl-word-phonetic">${w.phonetic || ''}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 5px; justify-content: center; padding-right: 10px;">
                        <button class="wl-speak-btn" onclick="event.stopPropagation(); WordList.speakWord('${w.word.replace(/'/g, "\\'")}')" style="position:relative; right:0; bottom:0; opacity:1; transform:none; margin-bottom:5px;">
                            <i class="fas fa-volume-up"></i>
                        </button>
                        <button onclick="event.stopPropagation(); WordList.openEditModal('${w.id}')" style="width:32px; height:32px; border-radius:50%; background:#374151; color:white; border:none; cursor:pointer;" title="Düzenle">
                            <i class="fas fa-pen"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';

        // Edit Modal HTML'ini sayfaya bir kez ekle
        if (!document.getElementById('editWordModal')) {
            const modalHtml = `
            <div id="editWordModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; align-items:center; justify-content:center;">
                <div style="background:#1f2937; padding:20px; border-radius:8px; width:90%; max-width:400px; border: 1px solid #374151;">
                    <h3 style="color:white; margin-bottom:15px; border-bottom:1px solid #374151; padding-bottom:10px;">Kelime Düzenle</h3>
                    <input type="hidden" id="editWordId">
                    <label style="color:#9ca3af; font-size:0.8rem;">İngilizce</label>
                    <input type="text" id="editWordEn" style="width:100%; padding:8px; margin-bottom:10px; background:#111827; border:1px solid #4b5563; color:white; border-radius:4px;">
                    <label style="color:#9ca3af; font-size:0.8rem;">Türkçe Anlamı</label>
                    <input type="text" id="editWordTr" style="width:100%; padding:8px; margin-bottom:10px; background:#111827; border:1px solid #4b5563; color:white; border-radius:4px;">
                    <label style="color:#9ca3af; font-size:0.8rem;">Seviye</label>
                    <select id="editWordLevel" style="width:100%; padding:8px; margin-bottom:20px; background:#111827; border:1px solid #4b5563; color:white; border-radius:4px;">
                        <option value="a1">A1</option><option value="a2">A2</option><option value="b1">B1</option>
                        <option value="b2">B2</option><option value="c1">C1</option><option value="custom">Custom</option>
                    </select>
                    <div style="display:flex; justify-content:space-between;">
                        <button onclick="WordList.deleteWord()" style="background:#ef4444; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer;">Sil</button>
                        <div>
                            <button id="closeEditModal" style="background:#4b5563; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; margin-right:5px;">İptal</button>
                            <button onclick="WordList.saveWordEdit()" style="background:#10b981; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer;">Kaydet</button>
                        </div>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            document.getElementById('closeEditModal').addEventListener('click', () => {
                document.getElementById('editWordModal').style.display = 'none';
            });
        }

        container.innerHTML = html;
    },

    async openEditModal(wordId) {
        const word = await Database._read('words', wordId);
        if (!word) return;
        
        document.getElementById('editWordId').value = word.id;
        document.getElementById('editWordEn').value = word.word;
        document.getElementById('editWordTr').value = word.translation;
        document.getElementById('editWordLevel').value = word.level;
        
        document.getElementById('editWordModal').style.display = 'flex';
    },

    async saveWordEdit() {
        const wordId = document.getElementById('editWordId').value;
        const wordData = await Database._read('words', wordId);
        
        if (wordData) {
            wordData.word = document.getElementById('editWordEn').value;
            wordData.translation = document.getElementById('editWordTr').value;
            wordData.level = document.getElementById('editWordLevel').value;
            
            await Database._write('words', wordData);
            document.getElementById('editWordModal').style.display = 'none';
            await this.applyFilters();
        }
    },

    async deleteWord() {
        const wordId = document.getElementById('editWordId').value;
        if (confirm("Bu kelimeyi tamamen silmek istediğinize emin misiniz? (Öğrenme geçmişi de silinecek)")) {
            const txWords = Database.db.transaction('words', 'readwrite');
            txWords.objectStore('words').delete(wordId);
            
            const txProg = Database.db.transaction('progress', 'readwrite');
            txProg.objectStore('progress').delete(wordId);
            
            document.getElementById('editWordModal').style.display = 'none';
            await this.applyFilters();
        }
    },

    async searchApiWord() {
        const word = document.getElementById('newWordInput').value.trim();
        if(!word) return;
        
        const btn = document.getElementById('searchNewWordBtn');
        btn.textContent = "Aranıyor..."; btn.disabled = true;

        if (typeof Dictionary !== 'undefined') {
            const data = await Dictionary.fetchWordData(word);
            if(data) {
                const preview = document.getElementById('apiResultPreview');
                preview.style.display = 'block';
                preview.innerHTML = `
                    <div style="background: #111827; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4 style="font-size: 1.2rem; color: #10b981;">${data.word} <small style="color:#9ca3af; font-weight:normal;">${data.phonetic}</small></h4>
                            <button onclick="WordList.speakWord('${data.word}')" style="background:none; border:none; color:#3b82f6; cursor:pointer;"><i class="fas fa-volume-up"></i></button>
                        </div>
                        <p style="margin: 10px 0; font-size: 0.9rem; font-style: italic; color: #d1d5db;">"${data.example}"</p>
                        <label style="display:block; font-size: 0.8rem; color:#9ca3af; margin-bottom:5px;">Türkçe Anlamı:</label>
                        <input type="text" id="customTrInput" placeholder="Buraya anlamını yazın..." style="width:100%; padding: 8px; background:#1f2937; border:1px solid #4b5563; color:white; border-radius:4px; margin-bottom:12px;">
                        <button id="finalAddBtn" style="width:100%; padding: 10px; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:700;">Listeme Kaydet</button>
                    </div>
                `;
                
                document.getElementById('finalAddBtn').onclick = async () => {
                    data.translation = document.getElementById('customTrInput').value.trim() || "Anlam eklenmedi";
                    await Dictionary.addNewWord(data);
                    preview.style.display = 'none';
                    document.getElementById('newWordInput').value = '';
                    await this.applyFilters(); 
                };
            } else {
                alert("Kelime sözlükte bulunamadı. Lütfen yazımı kontrol edin.");
            }
        }
        btn.textContent = "Sözlükte Ara"; btn.disabled = false;
    },

    speakWord(word) {
        if (typeof Speech !== 'undefined' && Speech.speakWord) Speech.speakWord(word);
    }
};

window.WordList = WordList;
