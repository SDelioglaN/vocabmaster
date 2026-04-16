// js/dictionary.js - Vizyoner ve Asenkron Sözlük API Modülü

const Dictionary = {
    apiUrl: 'https://api.dictionaryapi.dev/api/v2/entries/en/',

    async fetchWordData(word) {
        try {
            const response = await fetch(`${this.apiUrl}${word.toLowerCase().trim()}`);
            if (!response.ok) throw new Error("Kelime bulunamadı.");
            
            const data = await response.json();
            return this.parseResult(data[0]);
        } catch (error) {
            console.error("Sözlük API Hatası:", error);
            return null;
        }
    },

    parseResult(apiData) {
        // Geleneksel veri temizleme: Karmaşık API yapısını sadeleştiriyoruz
        const meaning = apiData.meanings[0];
        const definition = meaning ? meaning.definitions[0] : null;
        
        return {
            word: apiData.word,
            phonetic: apiData.phonetic || (apiData.phonetics[0] ? apiData.phonetics[0].text : ''),
            audio: apiData.phonetics.find(p => p.audio)?.audio || '',
            example: definition ? (definition.example || "No example found.") : "",
            level: "custom", // Kullanıcının eklediği kelimeler her zaman 'custom' etiketini alır
            category: "custom", // Kategoriyi de filtreler için custom yap
            status: "new"
        };
    },

    async addNewWord(wordData) {
        // Kelimeyi IndexedDB'ye kalıcı olarak kaydet
        const id = `custom_${Date.now()}`;
        const finalData = { ...wordData, id };
        await Database._write('words', finalData);
        console.log(`Update: "${wordData.word}" başarıyla veritabanına işlendi.`);
        return finalData;
    }
};

window.Dictionary = Dictionary;
