// js/importer.js - Oxford Listesi Ayrıştırma ve Toplu Yükleme (Bulk Import) Motoru

const Importer = {
    // Oxford seviyelerinin hiyerarşik ağırlığı (En düşük seviye her zaman kazanır)
    levelWeights: { 'a1': 1, 'a2': 2, 'b1': 3, 'b2': 4, 'c1': 5, 'c2': 6 },

    async processRawText(rawText) {
        console.log("Geleneksel Ayrıştırma (Parsing) Başladı...");
        const lines = rawText.split('\n');
        const uniqueWords = new Map();

        // Regex: Kelimeyi ve A1, B2 gibi CEFR seviyesini yakalar
        const regex = /^([a-zA-Z\-]+)\s+.*?\b([A-C][1-2])\b/i;

        lines.forEach(line => {
            const match = line.trim().match(regex);
            if (match) {
                const word = match[1].toLowerCase().trim();
                const level = match[2].toLowerCase();

                if (!uniqueWords.has(word)) {
                    uniqueWords.set(word, level);
                } else {
                    // Katı Kural: Bir kelime sadece bir seviyede olabilir. 
                    // En düşük seviyeyi koru (Temel anlam esastır).
                    const existingLevel = uniqueWords.get(word);
                    if (this.levelWeights[level] < this.levelWeights[existingLevel]) {
                        uniqueWords.set(word, level);
                    }
                }
            }
        });

        const totalWords = uniqueWords.size;
        console.log(`Filtreleme Tamamlandı. Benzersiz Kelime Sayısı: ${totalWords}`);
        
        await this.injectToDatabase(uniqueWords);
    },

    async injectToDatabase(uniqueWordsMap) {
        const tx = Database.db.transaction('words', 'readwrite');
        const store = tx.objectStore('words');
        
        let addedCount = 0;

        for (const [word, level] of uniqueWordsMap.entries()) {
            const wordData = {
                id: `oxford_${word}`,
                word: word,
                level: level,
                category: 'oxford',
                phonetic: '', 
                translation: 'Otomatik çekilecek...', // Tembel yükleme (Lazy Load) için işaret
                example: '',
                status: 'new'
            };
            
            store.put(wordData);
            addedCount++;
        }

        return new Promise((resolve) => {
            tx.oncomplete = () => {
                alert(`Vizyoner Yükleme Başarılı! Çakışmalar giderildi ve ${addedCount} benzersiz kelime veritabanına işlendi.`);
                location.reload();
                resolve();
            };
        });
    }
};

window.Importer = Importer;

// Mühendis Paneli Buton Tetikleyicisi
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const importBtn = document.getElementById('runBulkImportBtn');
        if (importBtn) {
            importBtn.addEventListener('click', async () => {
                const rawText = document.getElementById('bulkImportArea').value;
                if (!rawText.trim()) return alert("Lütfen PDF'ten kopyaladığınız metni girin.");
                
                importBtn.textContent = "İşleniyor... Lütfen bekleyin.";
                importBtn.disabled = true;
                
                if (typeof Importer !== 'undefined') {
                    await Importer.processRawText(rawText);
                } else {
                    alert("Kritik Hata: Importer modülü yüklenemedi.");
                    importBtn.textContent = "Verileri Ayrıştır ve Yükle";
                    importBtn.disabled = false;
                }
            });
        }
    }, 1000); // DOM'un tam oturması için tolerans
});
