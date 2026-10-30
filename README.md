# ConvertorXP 0.4 — Windows geliştirme sürümü

XP görünümlü dosya masaüstü. Dosyalar bu cihazda işlenir; hesap, bulut dosya yükleme veya telemetri yoktur. Windows 10/11 x64 önceliklidir. Web sürümü statik olarak korunur; Mac derlemesi ve testi henüz yapılmadı.

## Kullanım

- EXE: `release/ConvertorXP Setup 0.4.0.exe`. Kurulum kullanıcı hesabına yapılır. Bu yerel deneme sürümü imzasızdır.
- Dosyaları sürükle veya **Dosya yükle** ile seç. Boş masaüstüne sağ tık → **Klasör ekle** alt klasörleri de getirir.
- Dikdörtgen seçim, Ctrl ile çoklu seçim, ızgaraya oturan taşıma; çift tık/Enter ile dosya penceresi. F2, sağ tık veya dosya adına 0,5–2 saniye aralıklı iki tıklamayla yeniden adlandırma.
- Office dosyasına sağ tık → **PDF’ye dönüştür**. DOC/DOCX/ODT/RTF, PPT/PPTX/ODP, XLS/XLSX/ODS. Çift tık Office belgesini geçici PDF önizlemesiyle açar; masaüstüne gereksiz çıktı eklemez.
- Bir veya birkaç görsele sağ tık → **PDF oluştur**. Sıra, A4/A5/Letter/görsel boyutu, yön, kenar boşluğu ve tek/ayrı PDF seçilebilir. Animasyon/çok sayfalı görseller sessizce düzleştirilmez.
- İlerleme, iptal, önizleme ve **Farklı kaydet** aynı işlem penceresindedir. İşlem merkezi kendiliğinden açılmaz.
- Eksik Office bileşeni işlem içinden **İndir ve devam et** ile kurulur. Geçmiş ve ileri bileşen yönetimi Başlat menüsündedir; eski araçlar sağ tık → **Diğer araçlar** altında korunur.
- Webde Office önizleme/dönüşümü desteklenmez; Windows uygulamasında kullanılabilir açıklaması gösterilir.
- Çalışma alanı `%APPDATA%/ConvertorXP` altında saklanır. Dosyaların kendisi kaynak konumunda kalır. Üretilen çıktılar uygulamanın `outputs` klasörüne eklenir; **Farklı kaydet** ile dışarı alınabilir.
- Yeniden adlandırma çalışma alanındaki adı değiştirir. Masaüstünden kaldırma kaynak dosyayı silmez. Mevcut dosyaların üstüne yazılmaz; çakışmalar numaralanır.
- Dosya/pencere konumları ve görsel düzenleme parametreleri saklanır. Eksik/değişmiş kaynak yeniden eklenmelidir. Kesilmiş işler otomatik tekrar çalıştırılmaz.

## Araçlar

| Alan | Uygulanan işlemler |
|---|---|
| Görsel | PNG/JPG/WebP/BMP/TIFF/GIF/ICO/AVIF çıktıları; HEIC/HEIF girdileri motor desteğine bağlı. Kırpma, boyut, döndürme, çevirme, renk, filigran, kenarlık, birleştirme, metadata, hedef boyut, kare çıkarma, GIF/WebP oluşturma. SVG dış kaynak/aktif içerik içermiyorsa rasterleştirilir. |
| PDF | Önizleme, birleştirme, bölme, çıkarma/sıralama/silme/döndürme, görselden PDF, PNG/metin çıkarma, filigran ve numara, form alanlarını listeleme/doldurma, bilinen parola ile şifre çözme. |
| Ses/video | FFmpeg: dönüşüm, kesme, uyumlu dosyaları birleştirme, çözünürlük/FPS/bitrate, ses çıkarma/kaldırma/normalleştirme, kare/GIF, seçilebilir altyazı ekleme/çıkarma. |
| Office | LibreOffice: belge, tablo ve sunum dönüşümleri; PDF dışa aktarma. Tam Office düzenleyicisi değildir. |
| OCR | Tesseract: Türkçe/İngilizce, metin ve aranabilir PDF; PDF sayfa aralığı ve yön düzeltme. |
| Arşiv | 7-Zip: ZIP/7Z/TAR/GZ oluşturma; desteklenen arşivleri listeleme/açma, parola, bütünlük ve güvenli yol kontrolleri. RAR yalnızca açılır. |
| Metin | Metin düzenleme; UTF-8/UTF-16LE/Windows-1254, satır sonları, JSON doğrulama/biçimleme, CSV/TSV ve SRT/VTT. |

Menüler kurulu paketlere ve format kataloğuna göre oluşur; ImageMagick çıktı biçimleri çalışma anında sorgulanır. Teknik dönüşüm başarısı kusursuz görsel/semantik eşdeğerlik garantisi değildir. JPEG şeffaflığı, Office yerleşimi/fontları, OCR doğruluğu ve metadata/renk profili değişimleri arayüzde belirtilir. Çözücü tarafından tek kare olarak görülen animasyonlar sessizce düzleştirilmez, reddedilir. Çok katmanlı PSD/AI, CAD/3D, PDF→Word yeniden akış, RAW, e-kitap, arka plan kaldırma ve görüntü büyütme bu sürüme dahil değildir.

## Kaynaktan çalıştırma

Node.js 22.12+ ve Windows x64:

```powershell
npm ci
npm run prepare:engines
npm run desktop
```

`prepare:engines`, manifestteki sabit ImageMagick/qpdf paketlerini indirir, SHA-256 doğrular ve uygulama kaynaklarına açar. Yeni sürümleri araştırıp manifesti değiştiren `prepare-packages` betikleri yalnızca bakım içindir; normal kurulum bunları çalıştırmaz.

```powershell
npm run dist:win
npm run dev
```

İlk komut `.exe` yükleyicisini üretir. İkinci komut mevcut web arayüzünü localhost:4173 üzerinde sunar. Webde yerel motor/kalıcılık araçları açılmaz; Vercel statik dağıtımı korunur.

## Yapı ve sınırlar

- `native/`: Electron ana/preload, yerel dosya kayıtları, kuyruk ve motor adaptörleri. Renderer Node.js erişimi almaz; yalnızca sınırlı IPC çağrıları kullanır. Navigasyon uygulama giriş sayfasıyla sınırlıdır.
- `shared/catalog.js`: dosya→işlem→çıktı kataloğu ve seçenek doğrulaması. `native-ui.js`: paketler, araçlar, kuyruk ve PDF görüntüleyici.
- Büyük dosyalar arayüz belleğine alınmaz; küçük resimler üretilir. Uygun görsel ancak editörü açılınca yüklenir. İşler izole geçici klasörlerde dosya kopyaları üzerinden çalışır. Yerel süreçler shell olmadan çağrılır; ImageMagick dış kaynak/delegate erişimi kapalıdır.
- Görsel editörü 24 MP; yerel görsel motoru 100 MP inceleme, 500 kare, 256 MB bellek/512 MB map/2 GB geçici disk ve 120 saniye motor politikası kullanır. Metin 20 MB; arşiv açılımı 4 GB/10000 kayıt; masaüstü 2000 kayıt. Büyük işlem için kaynak ve çıktı kadar boş disk gerekir.
- Çıktı doğrulaması: görsel format/kare/döndürme boyutları; PDF yeniden okuma/qpdf; medya akış/süre; arşiv CRC; metin kodlama geri dönüş kontrolü. Office arşiv biçimleri için yapı kontrolü sınırlıdır, çıktı görünümü incelenmelidir.
- Yükleyici kamuya yayımlanmadı. Otomatik güncelleme servisi yok. Mac platform paketleri oluşturulmadı; platform ayrımı Mac'i otomatik olarak desteklenmiş yapmaz.

## Doğrulama

```powershell
npm test
npm run check
npm run check:native
npm run test:desktop
```

Ek motor entegrasyon testleri için paketleri uygulamada kurabilir veya geliştirici test verisini hazırlayabilirsin:

```powershell
node scripts/fetch-engines.mjs --all
node scripts/install-test-packs.mjs
npm run test:matrix
```

Test paketleri `.cxp-test/packages` altındadır. Motor yoksa ilgili entegrasyon testi açıkça atlanır; geçilmiş sayılmaz. `tests/verification-report.json` temsilî format/işlem testlerinin sonuçlarını içerir. `test:desktop`, gerçek Electron utility-process kuyruğu, iptal, kalıcılık, kaynak bütünlüğü, çakışan adlar, paket hash reddi ve yarım iş kurtarmayı doğrular. Görsel masaüstü akışları ayrıca gerçek Windows penceresinde kontrol edilir. Bu makinedeki testler temiz Windows sanal makinesi veya Mac testinin yerine geçmez.

## Lisans

Uygulama kodu GPL-3.0-or-later. Üçüncü taraf lisansları ve kaynak bağlantıları `resources/THIRD-PARTY.md` ve üretilen `resources/licenses` altında bulunur. Motorların lisansları bağımsızdır; yeniden dağıtımda karşılık gelen kaynak ve bildirim yükümlülükleri korunmalıdır. Kullanıcı tarafından sağlanan görseller uygulama kodu lisansından ayrı değerlendirilir.

## Geliştirme yol haritası

`docs/ROADMAP.md` ana aşamaları, kabul listelerini ve açık doğrulama işlerini tutar. 0.4 ilk aşamanın geliştirme paketidir; aşamanın tüm kabul testleri henüz tamamlanmamıştır. Birleşik PDF editörü, Paint benzeri nesne düzenleme ve OCR ile mevcut PDF yazısını değiştirme sonraki aşamalardır. Proje amacı, mimari, test sonuçları ve yarım kalan işler `docs/PROJECT-HANDOFF.md` içindedir. Projeyi devralırken bu iki belge birlikte okunmalıdır.
