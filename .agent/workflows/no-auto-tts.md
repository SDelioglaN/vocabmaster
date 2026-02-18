---
description: VocabMaster - No auto-play TTS rule
---
# VocabMaster TTS Kuralı

**KESİNLİKLE otomatik ses çalma/okuma yapılmaz.**

- Sesli okuma (TTS) SADECE kullanıcı hoparlör 🔊 ikonuna/butonuna tıkladığında çalışır
- Kelime gösterildiğinde, kart çevrildiğinde, quiz açıldığında vs. OTOMATİK ses çalmaz
- `Speech.speakWord()` veya `Speech.speak()` SADECE kullanıcı etkileşimi (click event) sonucunda çağrılır
- Hiçbir `showWord()`, `nextWord()`, `flipCard()` gibi fonksiyonda otomatik TTS çağrısı olmaz
- TTS hatası uygulamayı kesmemeli — her zaman try-catch ve resolve ile sarılmalı
