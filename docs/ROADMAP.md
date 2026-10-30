# ConvertorXP — sade kullanım, güvenilir dönüşümler

## Ürün kararı
XP görünümlü masaüstünde günlük belge, görsel ve medya işleri. Windows 10/11 x64 ve Mac (DMG / Apple Silicon & Intel) hedefli. Dosyalar cihazda işlenir, kaynaklar asla değiştirilmez/silinmez. Büyük bileşenler ihtiyaç anında açıklanarak bir kez indirilir ve çevrimdışı çalışır. Kullanıcı kuyruk veya teknik paket yönetmek zorunda kalmaz. Web sürümü korunur, Windows yetenekleri webde varmış gibi gösterilmez.

Sade kullanım, kusursuz dönüşüm garantisinden daha önemlidir. Font, yerleşim veya şeffaflık sınırlamaları kullanıcıya açıkça bildirilir.

Durumlar: **Bekliyor / Çalışılıyor / Doğrulandı**. Her aşama ancak kullanıcı akışı ve çıktısı uçtan uca otomatik test edilince doğrulanır. Temel sürümler: 0.3.0 → 0.4.0 → **0.5.0**.

---

## Aşama 1 — dönüşümler ve sade akış
Durum: **Doğrulandı**. Doğrulanan sürüm: **0.5.0** (E2E: `tests/e2e/stage1.e2e.mjs`).

### Doğrudan erişim
- [x] DOC/DOCX/ODT/RTF, PPT/PPTX/ODP, XLS/XLSX/ODS için sağ tık PDF’ye dönüştür (`data-action="pdf-convert"`).
- [x] Office çift tık/Aç: yerel geçici PDF üzerinden önizleme. Önizleme masaüstüne çıktı eklemez.
- [x] Görsellerde ve çoklu görsel seçiminde PDF oluştur; karışık/uygunsuz seçimde işlem gizli (`data-action="pdf-create"`).
- [x] Yeniden adlandırma (F2), özellikler ve XP masaüstü/pencere etkileşimleri korunur.

### Belge dönüşümü
- [x] Tek/çoklu belgelerden ayrı PDF çıktıları. Bir belgenin hatası diğer sonuçları kaybettirmez.
- [x] PPT slaytları PDF sayfaları olur. Excel mevcut yazdırma alanları/sayfa ayarlarını kullanır.
- [x] Font ve yerleşim farkı notu; sonuç önizleme, Farklı kaydet ve Klasörde göster.
- [x] Eksik motor için işlem içinde boyut ve İndir ve devam et; başarısızlıkta seçim/ayarlar korunur.

### Görsellerden PDF
- [x] Sürüklenebilir küçük resimler; HTML5 kart sıralama (`drop-before`/`drop-after` göstergesi, tam ekran overlay ayrımı).
- [x] Varsayılan tek PDF, görsel başına sayfa, A4, otomatik yön, 10 mm kenar boşluğu.
- [x] A4/A5/Letter/görsel boyutu; dikey/yatay/otomatik; kenar boşluğu; tek/ayrı PDF.
- [x] Oran korunur, kırpma yok; EXIF yönü uygulanır, şeffaf bölgelerde beyaz sayfa.
- [x] Önizleme ve çıktı aynı yerleşim hesabı; görsel boyutu 96 DPI.
- [x] Animasyonlu/çok sayfalı görseller sessizce ilk kareye indirgenmez, açıklamayla reddedilir.

### İşlem deneyimi ve altyapı (0.5.0 Ekleri)
- [x] Ayarla → Dönüştür → aynı pencerede ilerleme → Önizle/Kaydet.
- [x] Zorunlu Kuyruğa ekle yok; işlem merkezi kendiliğinden açılmaz; sahte yüzde yok.
- [x] İptal aynı yerde. Pencere kapanınca iş sürebilir.
- [x] **Masaüstüne bırakma koordinatı:** dışarıdan sürüklenen dosyalar fare ile bırakılan ızgara hücresine yerleşir (`cellsFrom`).
- [x] **Uygulamadan dışarıya sürükleme:** pencere kenarından dışarı sürüklenince Windows Gezgini / Masaüstüne native dosya kopyalama başlatılır (`startDrag` + hardlink staging; kaynak dosya asla silinmez/taşınmaz).
- [x] **XP Görev Çubuğu Köşesi (Tray):**
  - "Yerel çalışma" kaldırıldı, Start menüsünde ConvertorXP v0.5.0 sürümü gösterildi.
  - Çalışan iş olduğunda dönen dişli simgesi ve iş sayısı rozeti (`#trayJobs`).
  - XP Balon Bildirimi: iş tamamlandığında veya hata aldığında ses/balon ile çıktı adı, Aç ve Klasörde göster bağlantıları (`#trayBalloon`).
  - XP Dil Seçici: klasik mavi klavye/dil kutusu (`EN` / `TR`). Tıklanınca açılan yukarı menüyle anında dil değiştirme (`#langMenu`).
- [x] **TR / EN Dil Desteği (`i18n.js`):** varsayılan İngilizce, profilde Türkçe seçildiyse kalıcı. Statik ve dinamik tüm arayüz metinleri simetrik sözlükle çevrildi.
- [x] Başarılı çıktı masaüstüne bir kez eklenir; mevcut çıktı numaralandırılır.
- [x] Çıkışta ve işlem anında kaynak bütünlüğü hash denetimiyle doğrulanır.

---

## Aşama 2 — Hızlı İşlemler & Pratik Araçlar
Durum: **Doğrulandı**. Doğrulanan sürüm: **0.6.0** (E2E: `tests/e2e/stage2.e2e.mjs`, Unit: `tests/stage2.test.mjs`).
- [x] **XP Görev Çubuğu & Dil Çubuğu (Language Bar):**
  - Dil seçici (`EN` / `TR`) bildirim alanı ayırıcısının hemen solunda, orijinal Windows XP deskband gripper'ı (`band-gripper`) ile yerleştirildi.
  - Açılan dil menüsü XP görsel kılavuzuna uygun sağa hizalı, onay işareti ve "Show the Language bar" altlığıyla güncellendi.
  - Bildirim alanında (tray) yerel çalışma güvenlik rozeti (`#trayShield`) ve aktif iş dişlisi (`#trayJobs`) konumlandırıldı.
- [x] **Görsel format dönüştürme:** HEIC → JPG/PNG, WEBP → PNG/JPG, PNG → ICO (çoklu çözünürlük 256..16 başlığıyla), SVG → PNG.
- [x] **Görsel sıkıştırma (Hedef KB):** e-Devlet ve formlar için 200 KB, 500 KB, 1 MB, 2 MB hazır presetleri ve kademeli kalite/çözünürlük optimizasyonu ile garanti boyut sınırı (`image.compress`).
- [x] **Panodan yapıştırma (Ctrl+V):** `readClipboard` IPC ile masaüstüne anında ekran görüntüsü ekleme ve XP sarı balon bildirimi.
- [x] **Gizlilik / EXIF temizleme:** Tek tıkla GPS konumu ve kamera metadata silme (`image.strip`).
- [x] **PDF → Görseller:** PDF sayfalarını bağımsız PNG görselleri olarak masaüstüne dışa aktarma (`pdf.images`).
- [x] **Video → GIF & Ses dönüştürücü:** Hızlı paylaşım için optimize edilmiş paletle GIF üretimi (`media.gif`) ve ses ayıklama (`media.audio`).

---

## Aşama 3 — PDF Çalışma Penceresi
Durum: **Bekliyor**. Hedef sürüm: 0.7.0.
- [ ] Solda sayfa küçük resimleri, ortada belge, üstte araç çubuğu.
- [ ] Sıralama/silme/döndürme; birleştirme/bölme; görsel/metin çıkarma; sıkıştırma.
- [ ] Yazı, görsel, kaşe/çizim ekleme, form doldurma (çizim/imza eklentisi).

---

## Aşama 4 — Paint Benzeri Görsel & Kolaj Editörü
Durum: **Bekliyor**. Hedef sürüm: 0.8.0.
- [ ] **Fabric.js** tabanlı tuval: nesne seçme, taşıma, döndürme, yeniden boyutlandırma.
- [ ] XP Paint araçları: seçim, çizim kalemi, silgi, metin kutusu, şekiller (dikdörtgen, elips, ok), renk paleti.
- [ ] **Kolaj aracı:** ızgara şablonları, sürükle-bırak fotoğraf yerleştirme, kenar boşluğu ve zemin rengi.
- [ ] Sağda sürekli erişilebilir "Kopya olarak kaydet" eylemi.

---

## Aşama 5 — Gerekli Ağır Araçlar
Durum: **Bekliyor**. Hedef sürüm: 0.9.0.
- [ ] **Yapay Zeka Arka Plan Kaldırma:** BiRefNet-lite / ISNet modelleriyle karşılaştırma testi, tek seferlik bileşen indirme, GPU'suz yerel çalışma.
- [ ] **Medya araçları:** FFmpeg tabanlı ses/video kesme, sıkıştırma, ses çıkarma.

---

## Aşama 6 — OCR ve Sınırlı PDF Metin Düzenleme
Durum: **Bekliyor**. Hedef sürüm: 0.10.0.
- [ ] Türkçe/İngilizce OCR ve aranabilir PDF üretimi (Tesseract).
- [ ] Sınırlı PDF metin düzeltme (MuPDF / AGPL uyumlu): mevcut yazıyı karartıp gerçek silme ve yerine aynı font/ölçüde metin yazma.

---

## Aşama 7 — Dağıtıma Hazırlık & Platformlar
Durum: **Bekliyor**. Hedef sürüm: 1.0.0.
- [ ] Temiz Windows NSIS kurulum/kaldırma ve SignPath açık kaynak kod imzalama.
- [ ] **Mac Desteği:** GitHub Actions üzerinde ücretsiz Intel + Apple Silicon `.dmg` derlemesi, ilk açılış güvenlik rehberi.
- [ ] winget dağıtım manifestosu.
