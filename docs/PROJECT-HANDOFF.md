# ConvertorXP — proje amacı ve geliştirme devri

Devir tarihi: **30 Ekim 2026**. Hedef okuyucu: projeyi Antigravity veya başka bir geliştirme ortamında devralan geliştirici/ajan.

Bu belgeyi **ROADMAP.md ile birlikte okuyun**. Roadmap hedefleri ve kabul ölçütlerini; bu belge ürünün gerekçesini, mevcut kodu, yapılan doğrulamaları ve kaldığımız noktayı anlatır. Kullanıcı son talebinde geliştirmeyi durdurup devir belgesi istemiştir. Bu devir sırasında uygulama kodu geliştirilmemiş, testler yeniden çalıştırılmamıştır.

## 1. Neden bu uygulamayı yapıyoruz?

Kullanıcı günlük dosya işleri için farklı internet sitelerine gitmek istemiyor. Word'ü PDF'ye çevirmek, sunumu PDF olarak almak, görselleri PDF yapmak, bir PDF'nin sayfalarını düzenlemek veya fotoğrafa yazı ekleyip kolaj hazırlamak aynı uygulamada yapılabilmeli. Dosyalar cihazda kalmalı; hesap, ücretli API, bulut yükleme ve telemetri gerekmemeli.

Başlangıçtaki “her format, her işlem” fikri daha sonra bilinçli olarak daraltıldı: **sade kullanım ve güvenilir günlük işlemler**, çok sayıda teknik seçenekten daha önemli. Geniş motor altyapısı tek başına tamamlanmış ürün değildir. Destek, uzantı sayısıyla değil girdi → işlem → doğrulanmış çıktı olarak değerlendirilir. Kusursuz dönüşüm garantisi verilmez; font, yerleşim, şeffaflık veya animasyon kayıpları açıklanır.

## 2. Kullanıcının kesinleşmiş tercihleri

- Ad: **ConvertorXP**. Windows XP esintili masaüstü, klasik menüler ve pencereler; ilk paylaşılan dairesel menü tasarımı kullanılmayacak.
- Dosyalar masaüstünde simge/küçük resim olarak görünür. Çoklu seçim, dikdörtgen seçim, ızgaraya oturan taşıma, çift tık/Enter ile açma, sağ tık ve yeniden adlandırma korunur.
- Dosyalar ayrı taşınabilir/boyutlandırılabilir pencerelerde açılır; küçültme, büyütme, kapatma ve görev çubuğu vardır. Aynı dosyayı tekrar açmak mevcut pencereyi öne getirir.
- Dosya üzerindeki menü ile boş masaüstü menüsü farklıdır. Dosya menüsünde gereksiz “Dosya yükle” bulunmaz.
- Araçlar dosyanın kendi penceresinde toplanır. Kullanıcı genel araç kataloğu veya işlem kuyruğu yönetmeye zorlanmaz. Arka planda ağır işleri sıraya koymak uygundur; bunu ana kullanıcı deneyimi yapmak uygun değildir.
- Görsel editöründe **Kopya olarak kaydet** görünür, sürekli erişilebilir sağ taraftaki düğme olmalıdır.
- Kaynak dosya değişmez. Çalışma alanındaki yeniden adlandırma veya kaldırma diskteki kaynağı değiştirmez/silmez. Çıktılar sessizce mevcut dosyaların üzerine yazılmaz.
- Windows 10/11 x64 ilk hedef. Electron EXE kullanılacak. Web sürümü korunacak; Mac mimari olarak düşünülüyor fakat paketi ve gerçek cihaz testleri henüz yok.
- Büyük bileşenler gerektiğinde açıklanarak bir defa indirilir, ardından çevrimdışı kullanılabilir. Teknik paket yöneticisi ana kullanım yolu değildir.
- Varsayılan proje lisansı GPL-3.0-or-later. Üçüncü taraf motorların lisansları ayrıca korunur. Kamuya yayın, sertifika satın alma ve otomatik güncelleme bu teslimin kapsamında değildir.

## 3. Gelecek hedefi ve aşama sırası

1. **Doğrudan dönüşümler:** Office → PDF ve görseller → PDF; aynı pencerede ayarlar, ilerleme, sonuç ve kaydetme.
2. **PDF çalışma penceresi:** solda sayfalar, ortada belge, üstte araçlar; sayfa işlemleri, birleştirme/bölme, eklemeler, form ve dışa aktarma.
3. **Paint benzeri görsel editörü:** çizim, silgi, metin, şekiller, kırpma ve renk tek editörde; tekrar seçilip taşınabilen nesneler; kolaj.
4. **OCR ve gerçek PDF metin düzenleme:** Türkçe/İngilizce tanıma, aranabilir PDF, uygun motorla mevcut yazıyı gerçekten değiştirme.
5. **Gerekli ağır araçlar:** arka plan kaldırma ve sade ses/video araçları.
6. **Dağıtım hazırlığı:** temiz Windows testleri, performans, hata durumları ve lisanslar.

OCR taranmış yazıyı tanır; Word/PPT → PDF dönüşümü için gerekli değildir. PDF'nin üzerine beyaz kutu ve yeni yazı koymak gerçek metin düzenleme sayılmaz. Bu özellik için motor seçimi ve eski içeriğin kaldırılması ayrıca doğrulanmalıdır. İmza ekleme, çizim/görsel yerleştirmedir; sertifikalı dijital imza değildir.

CAD/3D, tam Office editörü, profesyonel video zaman çizelgesi, e-kitap ve geliştirici araçları bu yol haritasının dışında. Önceki geniş kapsamlı konuşmalar yerine son onaylı ROADMAP esas alınmalı.

## 4. Mevcut proje ve mimari

Çalışma dizini: `D:\WORK\PROJELER\Convertor`. Paket sürümü **0.4.0**. Devir sırasında bu klasörde Git deposu bulunmadı; `git status` çalışmıyor. Kaynakları aktarmadan önce mevcut klasörün yedeğini almak ve sürüm kontrolü oluşturmak faydalıdır.

Arayüz vanilla JavaScript/HTML/CSS ile statik olarak çalışır. Electron aynı arayüze dar kapsamlı bir preload köprüsü üzerinden yerel yetenekler ekler. Renderer'a serbest komut veya dosya sistemi erişimi verilmez; sandbox/contextIsolation kullanılır.

| Dosya/dizin | Sorumluluk |
|---|---|
| `app.js`, `desktop.js` | Masaüstü, seçim, dosya eylemleri ve uygulama bağlantıları |
| `windows.js` | XP pencere yönetimi ve görev çubuğu |
| `viewers.js`, `editor.js`, `image-engine.js` | Görüntüleyiciler ve mevcut görsel düzenleme |
| `conversion-ui.js` | Yeni doğrudan Office/görsel PDF pencereleri, bileşen açıklaması, işe özel ilerleme ve sonuç |
| `native-ui.js` | Yerel UI bağlantıları, mevcut araçlar/geçmiş/bileşenler ve PDF görüntüleme |
| `shared/catalog.js` | Dosya/işlem/çıktı yetenek kataloğu ve seçenekler |
| `shared/pdf-layout.js` | Önizleme ve PDF çıktısının ortak sayfa yerleşimi; Office uzantıları |
| `native/main.mjs`, `native/preload.cjs` | Electron giriş noktası, sınırlı IPC, yerel içerik protokolü |
| `native/workspace.mjs` | Dosya kayıtları, kaynak denetimi, küçük resimler ve kalıcılık |
| `native/queue.mjs`, `native/engine-worker.mjs` | Arka plan zamanlayıcısı, iş kimlikleri, iptal ve motor yürütme |
| `native/core-engines.mjs`, `native/extra-engines.mjs` | Görsel/PDF/metin ve ek motor adaptörleri |
| `native/packages.mjs`, `resources/packages.json` | Bileşen manifesti, kurulum ve hash doğrulama |
| `resources/` | Motor kaynakları, fontlar, politikalar ve lisans bildirimleri |
| `tests/`, `scripts/` | Otomatik testler, örnek üretimi, paketleme ve doğrulama betikleri |
| `build.mjs`, `server.mjs` | Statik çıktı oluşturma ve yerel web sunucusu |

Motorlar: ImageMagick; PDF.js/pdf-lib/qpdf; LibreOffice; FFmpeg/ffprobe; Tesseract; 7-Zip. Bunların adaptörlerinin bulunması tüm işlemlerin yeni sade kullanıcı akışına taşındığı anlamına gelmez. Eski PDF, medya, OCR, arşiv ve metin araçları vardır; birleşik editörler sonraki aşamalardır.

Normal masaüstü çalışma alanı uygulama veri dizininde, çıktılar onun `outputs` klasöründe tutulur. Dosyalar yerel yollarla işlenir; önizlemeler küçültülür. Testler için `.cxp-test` ve `.cxp-stage1` gibi ayrı dizinler kullanılmıştır. Bunlar taşınabilir dağıtımın veya kullanıcı verisinin yerine geçmez.

## 5. Son geliştirmede yapılanlar — Aşama 1

### Doğrudan kullanıcı akışı

- Office seçimine **PDF’ye dönüştür**, tek/çoklu görsele **PDF oluştur** eklendi. Uygunsuz görsel işlemleri Office menüsünden çıkarıldı. Eski genel araçlar “Diğer araçlar” altında kaldı.
- Office açma, kaynak dosyayı koruyan geçici PDF önizlemesine bağlandı. Önizleme üretmek masaüstüne yeni dosya eklemiyor.
- Her işlem penceresi sadece kendi iş kimliklerinin durumunu izliyor. İptal/yeniden deneme, sonuç önizleme, Farklı kaydet ve Klasörde göster eylemleri bulunuyor.
- Ana görev çubuğundaki teknik araç/işlem/paket düğmeleri kaldırıldı. Geçmiş ve bileşenler Başlat menüsüne taşındı. Aktif iş olduğunda küçük durum göstergesi var; işlem merkezi kendiliğinden açılmıyor.
- Eksik bileşen için işlem içinde boyut ve **İndir ve devam et** gösteriliyor. Gerçek yüzde yoksa durum metni kullanılıyor.
- Web Office işlemlerine Windows uygulamasının gerekli olduğu açıklaması eklendi.

### Görseller → PDF

- Küçük resimli hazırlık penceresi, sıra değiştirme okları, sürükleme kodu ve işlemden çıkarma var. **Sürükleyerek sıralama son UI denemesinde doğrulanamadı; aşağıdaki açık işe bakın.**
- A4/A5/Letter/görsel boyutu, yön, kenar boşluğu, tek veya ayrı PDF seçenekleri uygulandı. Varsayılan A4/otomatik/10 mm/tek PDF.
- Ortak yerleşim modeli oranı koruyor ve görüntüyü sayfaya sığdırıyor; görsel boyutu seçeneği 96 DPI kullanıyor. Şeffaf alanlar beyaz sayfaya yerleştiriliyor.
- EXIF yönü için kaynak inceleme ve otomatik yönlendirme eklendi. Animasyon/çok sayfa sessizce ilk kareye indirgenmek yerine reddediliyor.

### Güvenilirlik

- Office kaynak başlığı kontrolü bozuk veya desteklenmeyen belgelerin yanıltıcı biçimde dönüştürülmesini önlüyor. Şifrelenmiş OOXML belgesi için anlaşılır hata eklendi.
- Önizleme sınırlı dosya kimliği çağrısıyla başlıyor; özel protokol kaynak değişimini kontrol ediyor. Geçici önizleme işleri kalıcı normal iş geçmişine yazılmıyor; önizleme dizini başlangıçta temizleniyor.
- Çıktılar doğrulanıyor; kaynak bütünlüğü ve çakışan adların numaralandırılması mevcut altyapıda korunuyor.
- PDF görüntüleme sırasında eski asenkron isteğin yeni paneli ezmesini önlemek için ayrı içerik alanı/temizlik düzeltmeleri yapıldı.

## 6. Doğrulama durumu: neyi gerçekten biliyoruz?

Bu sonuçlar **önceki geliştirme oturumuna aittir**, bu belge yazılırken yeniden çalıştırılmadı. Bazılarının dosya raporu vardır; UI gözlemleri oturum notudur. Aşama 1 tümüyle doğrulandı sayılmamalıdır.

| Kontrol | Son kaydedilen sonuç / sınır |
|---|---|
| `npm test` | 19 geçti, 0 başarısız, 0 atlanan |
| `npm run check`, `npm run check:native` | Geçti; yeni modül ayrıca sözdizimi kontrolünden geçirildi |
| `npm run test:desktop` | Kalıcılık, utility-process işlemi, iptal, kaynak/çıktı çakışması, paket hash, format keşfi ve yarım iş davranışı dahil 7 kontrol geçti |
| `scripts/test-stage1.mjs` | 8 kontrol geçti; rapor `.cxp-stage1/run-OKspWO/report.json` |
| Office örnekleri | Türkçe DOCX, PPTX ve XLSX → ikişer sayfalı PDF; eski DOC/PPT → PDF; bozuk dosya varken diğer sonuçların korunması |
| Önizleme | Önbellek, masaüstüne çıktı eklememe ve kaynak hash bütünlüğü backend testinde geçti |
| Görsel PDF | EXIF yönü ve sıralı görsel boyutlu sayfalar; ortak yerleşim, ayrı çıktılar ve animasyon reddi test edildi |
| Metin geri okuma | Üretilen Office PDF'lerinde Türkçe içerik bulundu; XLSX yazdırma alanı dışındaki işaret metni çıkmadı |
| Parolalı belge | Test için şifrelenmiş DOCX üretildi; anlaşılır parola hatası doğrulandı |
| İndirme kesilmesi | `tests/package-retry.test.mjs` sahte ağ kesintisi ve tekrar denemeyi test ediyor. Gerçek tam Office indirmesinin UI üzerinden kabul testi değildir |
| Gerçek UI, geliştirme EXE | DOCX sağ tık → dönüştür → aynı pencerede sonuç/önizleme; Türkçe yazı, tablo ve görsel gözlemlendi. Kuyruk merkezi açılmadı |
| Gerçek UI, paketlenmiş 0.4.0 | Uygulama açıldı; teknik görev çubuğu düğmeleri yok; dikdörtgen çoklu seçim ve doğrudan PDF oluştur penceresi çalıştı; varsayılanlar ve EXIF önizlemesi gözlemlendi |

### Paket

`release/ConvertorXP Setup 0.4.0.exe` üretildi. Devir sırasında mevcut dosya boyutu **264.692.326 bayt** (yaklaşık 252,43 MiB). `release/win-unpacked/ConvertorXP.exe` paketlenmiş test uygulamasıdır. Yeni dönüşüm modülü, ortak yerleşim ve native ana/kuyruk dosyaları ASAR içinde kaynakla karşılaştırılmıştı.

Bu **imzasız yerel geliştirme yükleyicisidir**; temiz Windows kurulum/kaldırma testi veya kamuya hazır sürüm onayı değildir. Mac paketi yok. Paket boyutu isteğe bağlı tüm motorların toplam kurulu boyutu değildir.

## 7. Tam olarak nerede yarım kaldı?

1. **Görsel PDF kartlarını sürükleyerek sıralama:** kod HTML5 drag/drop kullanıyor. Paketlenmiş uygulamada başlık bölgesinden yapılan sürükleme denemesi sıralamayı değiştirmedi. Bunun kod hatası mı yoksa test girdisinin metin seçimine gitmesi mi olduğu belirlenmedi. `conversion-ui.js` içindeki `ondragstart/ondragover/ondrop` incelenmeli; gerçek sürükleme başarılı olmadan tamamlandı denmemeli. Ok düğmelerinin varlığı sürükleme kabul testinin yerine geçmez.
2. **Farklı kaydet uçtan uca:** diyalog açıldı ama test kullanıcı etkileşimiyle kesildi; hedef test dosyası oluşmadı. Kaydetme kesinlikle doğrulandı diye raporlanmamalı.
3. Paketlenmiş EXE'de görsel hazırlama → dönüştür → önizle → Farklı kaydet zinciri tamamlanmalı; kaydedilen dosyanın sayfa sayısı, sırası ve ölçüsü yeniden okunmalı.
4. Paketlenmiş EXE'de Office çift tık önizlemesi ve PPT/XLS çıktılarının görsel karşılaştırması genişletilmeli. Backend başarı ve metin geri okuma, tam görsel eşdeğerlik değildir.
5. Gerçek eksik Office bileşeni durumunda açıklama, indirme/yeniden deneme ve ayarların korunması UI üzerinden doğrulanmalı. Mevcut ağ kesintisi testi taklittir.
6. Webde yeni modüllerin servis edilmesi ve eski görsel akışları yeniden kontrol edilmeli. Önceden çalışan `server.mjs` süreci eski rota kodunu tutuyor olabilir; yalnızca ilgili proje sunucusu gerektiğinde yeniden başlatılmalı.
7. İptal/yeniden deneme/pencere kapatma ve XP etkileşimleri yeni akışla birlikte regresyon testinden geçirilmeli. Font eksikliği ve geniş format varyasyonları tamamen doğrulanmış değil.

Son test oturumunda geliştirme uygulamasına kullanıcı kendi belgesini eklemişti. Test için bu kişisel çalışma alanı kullanılmamalı veya temizlenmemeli. Ayrı test çalışma alanı `.cxp-stage1/release-ui`, örnekler `.cxp-stage1/fixtures` altında. Eski pencere kimlikleri ve çalışan süreçler yeni oturumda geçerli varsayılmamalı.

### Bilinen teknik takip noktaları

- `pdfSources` çağrısı bazı görsel akışlarında bileşen açıklamasından önce yapılıyor. Temel görsel motoru dağıtımla geliyor; motorun eksik olduğu bozuk kurulum davranışı ayrıca incelenmeli.
- Kaynak silindi/değişti durumunda önizleme erişimi reddediliyor; eski önizleme dosyasının fiziksel temizliği başlangıca kalabiliyor. Uzun oturum temizliği gözden geçirilebilir.
- README'deki araç tablosu mevcut motor kodunu özetliyor; tüm araçların yeni UX veya temiz kurulum onayı değildir.
- Roadmap'te boş kutuların hepsi “kod yok” demek değildir. Birçoğu uygulanmıştır fakat ilgili kullanıcı akışı bütünüyle doğrulanmadığından kapanmamıştır.

## 8. Yeni ortamda çalışma ve doğrulama

PowerShell, proje kökü:

```powershell
npm ci
npm run prepare:engines
npm run desktop
```

`prepare:engines` temel motorları indirir; ağ ve disk gerektirir. Var olan paketleri gereksiz yere silmeyin. Test ek paketleri `.cxp-test/packages` altında; bunlar yoksa motor testleri için yeniden hazırlanmalıdır.

```powershell
npm run check
npm run check:native
npm test
npm run test:desktop
npm run dist:win
npm run dev
```

Son iki komut sırasıyla Windows yükleyicisi ve localhost:4173 web sunucusu içindir. Yeni kod değişikliklerinden sonra eski EXE'nin yeni kodu içerdiği varsayılmamalı; yeniden paketlenmeli.

Office aşama testleri için `scripts/create-office-fixtures.py` örnek üretir; python-docx, python-pptx, openpyxl ve Pillow gerekir. Son oturumda standart Python yerine Codex'in paketlenmiş Python ortamı kullanıldı; bu yol Antigravity ortamında bulunmayabilir. Örnekler ve yerel motorlar hazırlandıktan sonra `npx electron scripts/test-stage1.mjs` çalıştırılabilir. Test betiklerinin yerel dizin varsayımlarını önce okuyun. Parolalı örnek ayrı, test amaçlı msoffcrypto ile üretildi; ana uygulama bağımlılığı değildir.

## 9. Devralan geliştiriciye önerilen ilk görev

**Yeni özellik eklemeye başlamadan önce Aşama 1'in açık kabul testlerini kapatın.** Özellikle sürükleyerek sıra değiştirme ve EXE içinden gerçekten diske PDF kaydetme. Sonuçları dosya raporu ve kişisel veri içermeyen örneklerle kaydedin. Roadmap kutularını yalnızca doğrulanan kapsam için işaretleyin. Ardından Aşama 2'nin birleşik PDF penceresi ayrıntılı planını hazırlayın.

Kullanıcıyı yeniden büyük bir teknik araç listesine veya kuyruk ekranına döndürmeyin. Mevcut motorları kullanarak aynı dosya penceresinde sade, tutarlı iş akışları oluşturun. Desteklenmeyen özelliği çalışıyormuş gibi göstermeyin; kodun bulunması, arayüzün bulunması ve kabul testinin geçmesi ayrı durumlardır.
