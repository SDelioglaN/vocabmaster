// js/database.js - Vizyoner ve Geleneksel IndexedDB Mimarisi

const DB_NAME = 'VocabMasterDB';
const DB_VERSION = 1;

const Database = {
    db: null,

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("Veritabanı hatası: Sisteme şüpheyle yaklaşın.", event);
                reject("Veritabanı başlatılamadı.");
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("Geleneksel veritabanı (IndexedDB) başarıyla bağlandı.");
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Kelime havuzu deposu (Offline-First)
                if (!db.objectStoreNames.contains('words')) {
                    db.createObjectStore('words', { keyPath: 'id' });
                }
                
                // SRS ilerleme deposu
                if (!db.objectStoreNames.contains('progress')) {
                    db.createObjectStore('progress', { keyPath: 'id' });
                }

                // Kullanıcı ayarları
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Günlük İstatistikler
                if (!db.objectStoreNames.contains('logs')) {
                    db.createObjectStore('logs', { keyPath: 'date' });
                }
            };
        });
    },

    // --- TEMEL VERİ İŞLEMLERİ ---

    async saveSetting(key, value) {
        return this._write('settings', { key, value });
    },

    async getSetting(key, defaultValue = null) {
        const data = await this._read('settings', key);
        return data ? data.value : defaultValue;
    },

    async saveProgress(wordId, progressData) {
        return this._write('progress', { id: wordId, ...progressData });
    },

    async getProgress(wordId) {
        const data = await this._read('progress', wordId);
        return data || { status: 'new', interval: 0, repetition: 0, easeFactor: 2.5 };
    },

    // --- CİHAZLAR ARASI VERİ TRANSFERİ (YEDEKLEME) ---

    async exportData() {
        const progress = await this._getAll('progress');
        const settings = await this._getAll('settings');
        const logs = await this._getAll('logs');
        
        const backup = {
            timestamp: new Date().toISOString(),
            data: { progress, settings, logs }
        };

        const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vocabmaster_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    async importData(jsonData) {
        try {
            const parsed = JSON.parse(jsonData);
            if (!parsed.data) throw new Error("Geçersiz yedek dosyası.");

            const { progress, settings, logs } = parsed.data;
            
            for (let p of progress) await this._write('progress', p);
            for (let s of settings) await this._write('settings', s);
            for (let l of logs) await this._write('logs', l);

            alert("Veriler başarıyla içe aktarıldı. Gerçek bir update tamamlandı.");
            location.reload();
        } catch (error) {
            alert("İçe aktarma başarısız oldu: " + error.message);
        }
    },

    // --- YARDIMCI GELENEKSEL FONKSİYONLAR ---

    _write(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(false);
        });
    },

    _read(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(null);
        });
    },

    _getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject([]);
        });
    }
};

window.Database = Database;
