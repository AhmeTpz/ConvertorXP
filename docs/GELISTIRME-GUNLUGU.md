# ConvertorXP — Geliştirme Günlüğü (Development Changelog)

Bu doküman, ConvertorXP projesinde tamamlanan her aşamanın mimarisini, eklenen/değiştirilen bileşenlerini, test yöntemlerini ve alınan ürün kararlarını aşama aşama detaylı olarak belgeler. Her yeni aşamada güncellenmeye devam edecektir.

---

## 📌 Temel Ürün İlkeleri & Mimari Felsefe

1. **Kayıpsız Kaynak Dokunulmazlığı:**
   - Masaüstüne yüklenen veya dönüştürülen kaynak dosyalar **asla** değiştirilmez, taşınmaz veya üzerine yazılmaz.
   - Her çıktı (düzenlenmiş görsel, yeni PDF, kolaj, sıkıştırılmış kopya vb.) `-duzenlendi`, `-kolaj` veya yeni bir adla bağımsız bir dosya olarak masaüstüne eklenir.
   - Tüm aşamalarda otomatik testler orijinal dosyanın SHA-256 hash'inin değişmediğini kesin olarak doğrular.
2. **%100 Yerel / Cihazda İşleme (Offline-First):**
   - Belgeler, görseller ve medya dosyaları kullanıcının kendi bilgisayarında yerel motorlarla işlenir.
   - Hiçbir veri harici sunucuya veya buluta gönderilmez.
3. **Orijinal Windows XP Luna Görselliği:**
   - Tahoma 11px sistem yazı tipi, klasik mavi görev çubuğu (#245edb / #1941a5), 3B Luna pencere kenarlıkları, sistem tepsisi (system tray), klasik sarı balon bildirimleri (#trayBalloon) ve deskband dil çubuğu birebir korunur.
4. **Çift Platform (Windows & macOS):**
   - Windows x64 (NSIS installer / portable) ve macOS (Apple Silicon / Intel DMG) desteği.

---

## 🚀 Aşama 1 — Temel Dönüşümler, Sürükle-Bırak, XP Sistem Tepsisi & Çift Dil (v0.5.0)

**Durum:** Tamamlandı & Doğrulandı (Commit: `4460fa6`).  
**Doğrulama Testleri:** `tests/e2e/stage1.e2e.mjs` (E2E), 30 Birim Testi (`npm test`).

### 1. Neler Geliştirildi?
- **Office Belgesi → PDF Dönüşümü:**
  - DOC, DOCX, ODT, RTF, PPT, PPTX, ODP, XLS, XLSX, ODS formatlarında sağ tık menüsünden doğrudan erişim (`data-action="pdf-convert"`).
  - Excel tablolarında mevcut yazdırma alanlarını/sayfa ayarlarını koruma.
  - PowerPoint slaytlarını sırayla PDF sayfalarına dönüştürme.
  - Çift tıklamayla geçici PDF üzerinden masaüstüne çıktı eklemeden hızlı önizleme.
- **Görsellerden Çok Sayfalı PDF Oluşturma:**
  - Tek veya çoklu görsel seçiminde sağ tık `data-action="pdf-create"`.
  - HTML5 tabanlı sürükle-bırak kart sıralama (`.drop-before` / `.drop-after` yerleşim çizgileri).
  - Sayfa boyutu seçenekleri: A4, A5, Letter, Orijinal Görsel Boyutu (96 DPI).
  - Yönlendirme (Dikey, Yatay, Otomatik) ve kenar boşluğu (0..30 mm) kontrolleri.
- **Gelişmiş Masaüstü Sürükle-Bırak (Drag & Drop):**
  - **İçeriye Bırakma:** Dışarıdan masaüstüne bırakılan dosyalar fare koordinatına en yakın boş ızgara hücresine yerleşir (`cellsFrom`).
  - **Dışarıya Sürükleme (Drag Out):** Masaüstündeki bir dosya pencere dışına sürüklendiğinde, Electron `startDrag` ve geçici NTFS hardlink mekanizmasıyla doğrudan Windows Gezgini'ne, masaüstüne veya başka bir uygulamaya kopyalanır; kaynak dosya kesinlikle zarar görmez.
- **Otantik XP Sistem Tepsisi & Sarı Balon Bildirimi:**
  - Görev çubuğunun sağ alt köşesinde dönen dişli ve aktif iş sayısı rozeti (`#trayJobs`).
  - İşlem bittiğinde veya hata aldığında sesli/ikonlu otantik XP sarı balon bildirimi (`#trayBalloon`). Balon içinde "Dosyayı Aç" ve "Klasörde Göster" butonları.
- **Simetrik TR / EN Çoklu Dil Desteği (`i18n.js`):**
  - Varsayılan İngilizce; kullanıcı profilinde Türkçe seçildiyse kalıcı hatırlama (`localStorage`).
  - Statik (`data-i18n`) ve dinamik tüm arayüz metinleri simetrik Türkçe ve İngilizce sözlükle eşlendi.
  - Klasik XP dil seçici butonu (`EN` / `TR`).

---

## ⚡ Aşama 2 — Hızlı Eylemler & Pratik Araçlar (v0.6.0)

**Durum:** Tamamlandı & Doğrulandı (Commit: `94dc6eb`).  
**Doğrulama Testleri:** `tests/stage2.test.mjs` (Unit), `tests/e2e/stage2.e2e.mjs` (E2E).

### 1. Neler Geliştirildi?
- **e-Devlet ve Resmi Formlar İçin Hedef Boyutlu Görsel Sıkıştırma (`image.compress`):**
  - 200 KB (e-Devlet zorunlu yükleme sınırı), 500 KB, 1 MB ve 2 MB hazır presetleri.
  - Kademeli kalite ve akıllı çözünürlük optimizasyonu ile dosya boyutunun hedefin kesinlikle altında kalmasını garanti eden ikili arama algoritması.
- **Panodan Masaüstüne Yapıştırma (Ctrl+V Clipboard Screenshot):**
  - Kullanıcı `Ctrl+V` veya `Shift+Insert` yaptığında panodaki ekran görüntüsü okunur (`readClipboard`).
  - Masaüstünde farenin bulunduğu hücreye `Ekran Goruntusu YYYY-MM-DD.png` olarak yerleştirilir ve sarı balonla bildirilir.
- **Gizlilik / EXIF Metadata Temizleme (`image.strip`):**
  - Görsel dosyalarındaki GPS konum koordinatları, kamera markası/modeli, çekim tarihi ve hassas meta verileri tek tıkla silinir; pikseller kayıpsız korunur.
- **Çoklu Çözünürlüklü Windows İkonu (PNG → ICO):**
  - Standart tek boyutlu ICO yerine, Windows standartlarına uygun 256x256, 128x128, 64x64, 48x48, 32x32 ve 16x16 çözünürlüklerini tek bir dosya başlığında içeren gerçek Windows Icon üretimi.
- **PDF Sayfalarını Bağımsız PNG Görsellerine Dönüştürme (`pdf.images`):**
  - Çok sayfalı PDF belgelerinin her sayfasını yüksek kaliteli (150+ DPI) bağımsız PNG görsellerine dönüştürerek masaüstüne dökme.
- **Video'dan GIF & Ses Dönüştürücü:**
  - Hızlı paylaşım için optimize edilmiş 256 renk paletli akıcı GIF üretimi (`media.gif`).
  - Video dosyalarından tek tıkla MP3/WAV ses ayıklama (`media.audio`).
- **Otantik XP Dil Çubuğu & Tepsi Yeniden Tasarımı:**
  - Görev çubuğunun sağında dil göstergesi simgelerin soluna hizalandı, bildirim alanı ayırıcı çizgisi ve `#trayShield` güvenlik kalkanı eklendi.

---

## 📑 Aşama 3 — Etkileşimli PDF Çalışma Penceresi (v0.7.0)

**Durum:** Tamamlandı & Doğrulandı (Commit: `8347833`).  
**Doğrulama Testleri:** `tests/pdf-workspace.test.mjs` (Unit), `tests/e2e/stage3.e2e.mjs` (E2E).

### 1. Neler Geliştirildi?
- **Sol Kenar Çubuğu (Küçük Resimler & Sürükle-Bırak Sıralama):**
  - Belgenin tüm sayfaları numaralandırılmış küçük resim kartları (`.pdf-page-card`) olarak listelenir.
  - Kartlar fareyle sürüklenerek belgenin sayfa sırası anında değiştirilir (`.drop-before` / `.drop-after`).
  - Kart üzerine gelindiğinde hızlı 90° döndürme (`🔄`) ve silme (`🗑`) butonları.
- **Yüksek Çözünürlüklü Orta Tuval:**
  - `pdfjs-dist` ile seçilen sayfa süper keskin render edilir.
  - Sığdır (Fit Page), 100%, Yakınlaştır (`+`) ve Uzaklaştır (`-`) kontrolleri.
- **Sayfa Üzerine Not & Kaşe/İmza Ekleme:**
  - Sayfa üzerine tıklanarak kırmızı/özel not veya filigran yerleştirme (`pdf_ws_add_text`).
  - Şeffaf PNG imza veya kaşe damgası yerleştirme (`pdf_ws_add_stamp`).
- **Araç Çubuğu Hızlı Eylemleri:**
  - Tek tıkla sayfaları bağımsız PDF'lere bölme (`split`).
  - QPDF / nesne akışı tabanlı kayıpsız PDF sıkıştırma (`compress`).
  - Belgedeki metinleri ayıklayıp `.txt` dosyasına dökme (`extract-text`).
  - Sayfaları PNG'ye aktarma (`export-png`).
  - Başka bir PDF veya görselden belge arasına sayfa ekleme (`insert`).
- **Kayıpsız Farklı Kaydet (Save As):**
  - Orijinal PDF hash'i %100 korunur; yeni belge `-duzenlendi.pdf` olarak kaydedilir ve balonla bildirilir.

---

## 🎨 Aşama 4 — Windows XP Paint & Kolaj Stüdyosu (v0.8.0)

**Durum:** Tamamlandı & Doğrulandı (Commit: `01683a2`).  
**Doğrulama Testleri:** `tests/collage.test.mjs` (Unit), `tests/e2e/stage4.e2e.mjs` (E2E), 34/34 Birim Testi.

### 1. Neler Geliştirildi?
- **Otantik Windows XP Paint Stüdyosu (`paint-workspace.js`):**
  - **16-Araçlık Klasik Araç Kutusu:** Kalem (Pencil), Fırça (Brush), Püskürtme (Airbrush), Silgi (Eraser), Boya Kovası (Flood Fill / BFS), Renk Damlalığı (Color Picker), Büyüteç, Yazı (Text), Çizgi, Eğri Çizgi, Dikdörtgen, Yuvarlak Köşeli Dikdörtgen, Elips, Çokgen, Dikdörtgen ve Serbest Seçim araçları.
  - **28 Renk Çift Paleti:** Sol tıkla birincil (çizim), sağ tıkla ikincil (silgi/arka plan) renk; sol altta ikonik üst üste binen XP renk çipleri.
  - **Kontür ve Dolgu Seçimi:** 1px..8px çizgi kalınlığı, Yalnızca Çerçeve / Çerçeve + Dolgu / Yalnızca Dolgu modları.
  - **Düzenleme & Kısayollar:** Geri Al (Ctrl+Z), Yinele (Ctrl+Y), 90° Döndürme, Yatay/Dikey Aynalama, Tuvali Temizle.
  - **Başlat Menüsü:** Başlat menüsünde doğrudan boş tuvalle açılan **Paint** programı.
- **Çoklu Fotoğraf Kolaj Oluşturucu (`collage-engine.js`):**
  - Masaüstünde 2+ görsel seçilip sağ tıklandığında menünün **en ilk sırasında** doğrudan **`🖼 Kolaj Oluştur`** seçeneği açılır.
  - **7 Izgara Şablonu:** 1×2 (Yan Yana), 2×1 (Alt Alta), 1+2 (Bölünmüş), 1×3 (Sütun), 2×2 (Eşit Izgara), 1+3 (Üst+Alt), 2×3 (6'lı Izgara).
  - **Canlı Kontroller:** Aralık (0..30px), Köşe Yuvarlaklığı (0..25px), En-Boy Oranı (1:1, 4:3, 16:9, 9:16) ve Zemin Rengi.
- **Kullanıcı Kararı — Format Seçimi & Canlı Boyut Göstergesi:**
  - Kullanıcı kaydetme butonuna bastığında otantik XP **Farklı Kaydet (Save As)** penceresi açılır.
  - Kullanıcı **PNG** (Kayıpsız), **JPEG** (Küçük dosya boyutu) veya **WebP** seçebilir.
  - JPEG veya WebP seçildiğinde canlı kalite kaydırıcısı (%40..%100) açılır.
  - Format veya kalite değiştikçe **`📁 Tahmini Dosya Boyutu: 142.4 KB`** milisaniyeler içinde blob hesaplanarak canlı gösterilir.
  - Paint alt durum çubuğunun sağ tarafında tuvaldeki anlık boyut (`💾 ~ 142.4 KB`) sürekli görünür.
- **Kullanıcı Kararı — Görev Çubuğu Dil Çubuğu:**
  - Dil seçici (`EN` / `TR`) bildirim alanı simgelerinin tam soluna, gereksiz tutamaç çizgisi olmadan, Tahoma 11px beyaz font ve 2px keskin dikey ayırıcı çizgiyle kullanıcının gönderdiği orijinal XP ekran görüntüsüyle birebir hizalandı.

---

## 🔮 Gelecek Aşamalar

- **Aşama 5 (v0.9.0):** Gerekli Ağır Araçlar — Yapay Zeka Arka Plan Kaldırma (On-Device / Sıfır Python WebAssembly & ONNX Modelleri) ve FFmpeg Tabanlı Medya Araçları.
- **Aşama 6 (v0.10.0):** OCR ve Sınırlı PDF Metin Düzenleme.
