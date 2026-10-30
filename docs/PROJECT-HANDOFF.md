# ConvertorXP — Proje Devir ve Geliştirme Raporu

Devir tarihi: **30 Ekim 2026**. Sürüm: **0.5.0**.

Bu belge `docs/ROADMAP.md` ile birlikte okunmalıdır.

---

## 1. Neler Yapıldı ve Tamamlandı? (Sürüm 0.5.0)

Codex'ten devralınan Aşama 1'in açık kalan tüm işleri kapatılmış, yeni sistem yetenekleri eklenmiş ve doğrulanmıştır:

### A. Aşama 1 Açık Kabul Testleri Kapatıldı
1. **Görsel PDF Kartları Sıralama:**
   - Sorunun kök nedeni: `dragenter` dinleyicisinin sayfa içi kart sürüklemelerinde de tam ekran bırakma katmanını (`#dropOverlay`) açarak kartların üzerine binmesi ve bırakma olayını yutmasıydı.
   - Çözüm: `hasFiles(ev)` denetimi eklendi; overlay yalnızca dışarıdan (Gezgin vb.) dosya gelirken tetiklenir.
   - Kartlara fare konumuna göre dinamik `.drop-before` / `.drop-after` yerleşim çizgileri ve `user-select: none` eklendi.
2. **Farklı Kaydet Uçtan Uca Doğrulandı:**
   - `playwright` tabanlı yeni E2E test paketi (`tests/e2e/stage1.e2e.mjs`) yazıldı.
   - Geliştirme ve paketlenmiş uygulamada yerel diyaloglar test sürecinde taklit edilerek oluşturulan PDF'ler diske yazıldı; `pdf-lib` ile sayfa sayısı, sayfa boyutları (96 DPI görsel boyutu) ve sürüklenen sıra birebir doğrulandı.
   - Kaydetmeden vazgeçme (cancel) durumunda dosya oluşmadığı teyit edildi.
   - Kaynak DOCX ve PNG dosyalarının SHA-256 hash bütünlüğü doğrulandı.

### B. Gelişmiş Sürükle-Bırak Entegrasyonu
1. **Konuma Bırakma:**
   - Dışarıdan veya masaüstünden bırakılan dosyaların `(clientX, clientY)` koordinatları ızgara hücresine dönüştürülür (`cellAt`).
   - `cellsFrom` algoritması ile boş hücreler sırayla doldurularak dosya simgeleri kullanıcının fareyi bıraktığı noktaya yerleştirilir (Birim testi: `tests/files.test.mjs`).
2. **Uygulamadan Dışarıya Sürükleme:**
   - Kullanıcı dosya simgesini masaüstü penceresinin dışına doğru sürüklediğinde `onDragOut` tetiklenir.
   - Electron ana sürecinde `webContents.startDrag` işletim sistemine devredilir.
   - **Kritik Güvenlik Kuralı:** Kaynak dosyanın Windows Gezgini tarafından taşınma/silinme riskine karşı `drag-staging` dizininde NTFS hardlink (veya fallback kopya) oluşturularak sürüklenir. Kaynak dosya kesinlikle zarar görmez.

### C. XP Görev Çubuğu Köşesi (Tray) & Balon Bildirimi
1. "Yerel çalışma" metni görev çubuğundan kaldırıldı. Başlat menüsü altında `ConvertorXP v0.5.0` yer aldı.
2. **Aktif İş Göstergesi (`#trayJobs`):** İşlem sürerken dönen XP dişli simgesi ve aktif iş sayısı rozeti görünür; tıklandığında İşlem Geçmişi penceresi açılır.
3. **XP Balon Bildirimi (`#trayBalloon`):** İşlem bittiğinde sarı XP balonu ses/animasyon ile çıkar, çıktı adını bildirir, tek tıkla "Aç" ve "Klasörde göster" eylemlerini sunar. 7 saniye sonra veya çarpı ile kapanır.
4. **XP Dil Seçici (`#trayLang` & `#langMenu`):** Klasik mavi `EN` / `TR` kutucuğu. Tıklandığında XP tarzı yukarı açılan menüyle dil anında değiştirilir.

### D. TR / EN Uluslararasılaşma Altyapısı (`i18n.js`)
- Varsayılan dil: **İngilizce (`en`)**. Kullanıcı Türkçe seçerse `localStorage` üzerinde kalıcı olur.
- Statik HTML `data-i18n` öznitelikleriyle ve dinamik Javascript metinleri `t(key, vars)` fonksiyonuyla yönetilir.
- `dict.tr` ve `dict.en` simetrisi birim testinde doğrulanmıştır.

---

## 2. Doğrulama Durumu ve Test Sonuçları

| Kontrol | Sonuç | Kapsam |
|---|---|---|
| `npm run check` | **Geçti** | 8 Renderer JS modülü sözdizimi |
| `npm run check:native` | **Geçti** | Native ESM/CJS sözdizimi |
| `npm test` | **21 geçti, 0 hata** | Format keşfi, Office TXT, Tesseract OCR, cellsFrom, i18n simetrisi |
| `npm run test:desktop` | **7 geçti, 0 hata** | Utility-process, iptal, no-overwrite, kalıcılık |
| `npm run test:e2e` | **8 geçti, 0 hata** | Sıralama, PDF oluşturma, Save As, Office DOCX, Kaynak hash, Dil değiştirme |

---

## 3. Kod Deposu ve Yapılandırma

- Git Deposu: `https://github.com/AhmeTpz/ConvertorXP.git` (Dal: `main`).
- Git satır sonu ve ikili dosya koruması `.gitattributes` ile sağlandı.
- Prettier kod formatlaması tüm proyeye uygulandı (`npm run format`).

---

## 4. Sıradaki Geliştirme Adımları (Aşama 2)

Bir sonraki oturumda kullanıcı deneyimini doğrudan artıracak **Hızlı İşlemler** aşamasına geçilebilir:
1. Görsel format dönüştürücü: HEIC → JPG/PNG, WEBP → PNG/JPG, PNG → ICO.
2. Hedef boyuta göre görsel sıkıştırma (ör. 200 KB altı).
3. Panodan görsel yapıştırma (Ctrl+V).
4. EXIF / Konum temizleme.
5. PDF → Sayfa görselleri.
