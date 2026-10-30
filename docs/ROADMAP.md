# ConvertorXP — sade kullanım, güvenilir dönüşümler

## Ürün kararı
XP görünümlü masaüstünde günlük belge, görsel ve medya işleri. Windows 10/11 x64 öncelikli; Mac ayrı aşama. Dosyalar cihazda işlenir, kaynaklar değiştirilmez. Büyük bileşenler ihtiyaç anında açıklanarak bir kez indirilir. Kullanıcı kuyruk veya teknik paket yönetmek zorunda kalmaz. Web sürümü korunur, Windows yetenekleri webde varmış gibi gösterilmez.

CAD/3D, e-kitap, geliştirici araçları, tam Office editörü ve profesyonel video zaman çizelgesi kapsam dışındadır. Mevcut motor kodu bulunması, kullanıcı akışının tamamlandığı anlamına gelmez.

Durumlar: **Bekliyor / Çalışılıyor / Doğrulandı**. Her aşama ancak kullanıcı akışı ve çıktısı test edilince doğrulanır. Önceki temel: 0.3.0; mevcut geliştirme paketi: **0.4.0**. Yeni aşamaların doğrulanan sürümleri aşağıda ayrıca tutulur.

## Devir notu — 30 Ekim 2026

Bu dosya [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md) ile birlikte kullanılmalıdır. Devir belgesi ürün amacını, kullanıcı kararlarını, mevcut mimariyi, yapılan uygulamayı, test kanıtlarını ve açık işleri içerir. Kullanıcının isteğiyle geliştirme durdurulmuş, devam başka geliştirme ortamına bırakılmıştır.

Aşama 1'in doğrudan Office/görsel PDF pencereleri, ortak sayfa yerleşimi, işe özel ilerleme ve geçici Office önizlemesi kodlandı; 0.4.0 Windows deneme yükleyicisi üretildi. Son oturumda 19 otomatik test, 7 masaüstü altyapı kontrolü ve 8 Office/görsel PDF entegrasyon kontrolü geçti. Bunlar tüm kullanıcı kabul testlerinin geçtiği anlamına gelmez; bu devir sırasında tekrar çalıştırılmadı.

**İlk devam işi:** görsel PDF kartlarında sürükleyerek sıralamayı doğrulamak/düzeltmek; paketlenmiş EXE'de dönüşüm → önizleme → Farklı kaydet akışını gerçekten diske çıktı alarak bitirmek. Gerçek bileşen kurulumu, web regresyonu ve kalan UI/hata testleri de açıktır. Aşama 1 bu nedenle hâlâ **Çalışılıyor** durumundadır. Aşağıdaki kutular kod varlığını değil ilgili kapsamın kabulünü temsil eder; boş kutu her zaman hiç uygulanmadığı anlamına gelmez. Ayrıntılı gerçekleşen durum devir belgesindedir.

## Aşama 1 — dönüşümler ve sade akış
Durum: **Çalışılıyor**. Doğrulanan sürüm: henüz yok.

### Doğrudan erişim
- [ ] DOC/DOCX/ODT/RTF, PPT/PPTX/ODP, XLS/XLSX/ODS için sağ tık PDF’ye dönüştür.
- [ ] Office çift tık/Aç: yerel geçici PDF üzerinden önizleme. Önizleme masaüstüne çıktı eklemez.
- [ ] Görsellerde ve çoklu görsel seçiminde PDF oluştur; karışık/uygunsuz seçimde işlem gizli.
- [ ] Yeniden adlandırma, özellikler ve XP masaüstü/pencere etkileşimleri korunur.

### Belge dönüşümü
- [ ] Tek/çoklu belgelerden ayrı PDF çıktıları. Bir belgenin hatası diğer sonuçları kaybettirmez.
- [ ] PPT slaytları PDF sayfaları olur. Excel mevcut yazdırma alanları/sayfa ayarlarını kullanır.
- [ ] Font ve yerleşim farkı notu; sonuç önizleme, Farklı kaydet ve Klasörde göster.
- [ ] Eksik motor için işlem içinde boyut ve İndir ve devam et; başarısızlıkta seçim/ayarlar korunur.

### Görsellerden PDF
- [ ] Sürüklenebilir küçük resimler; işlemden çıkarma kaynak dosyayı silmez.
- [ ] Varsayılan tek PDF, görsel başına sayfa, A4, otomatik yön, 10 mm kenar boşluğu.
- [ ] A4/A5/Letter/görsel boyutu; dikey/yatay/otomatik; kenar boşluğu; tek/ayrı PDF.
- [ ] Oran korunur, kırpma yok; EXIF yönü uygulanır, şeffaf bölgelerde beyaz sayfa.
- [ ] Önizleme ve çıktı aynı yerleşim hesabı; görsel boyutu 96 DPI.
- [ ] Animasyonlu/çok sayfalı görseller sessizce ilk kareye indirgenmez, açıklamayla reddedilir.

### İşlem deneyimi ve altyapı
- [ ] Ayarla → Dönüştür → aynı pencerede ilerleme → Önizle/Kaydet.
- [ ] Zorunlu Kuyruğa ekle yok; işlem merkezi kendiliğinden açılmaz; sahte yüzde yok.
- [ ] İptal aynı yerde. Pencere kapanınca iş sürebilir; küçük görev durumu kalır.
- [ ] Geçmiş Başlat menüsünde; ana görev çubuğunda teknik İşlemler/Paketler yok.
- [ ] Başarılı çıktı masaüstüne bir kez eklenir; mevcut çıktı numaralandırılır.
- [ ] Katalog: kullanıcı eylemi, platform, bileşen, özel pencere bilgisi.
- [ ] İş kimlikleri üzerinden pencereye ait durum izleme; önizleme dosya kimliğiyle sınırlı IPC.
- [ ] Kaynak değişiminde önbellek geçersiz; eski çalışma alanı/iş kayıtları korunur.
- [ ] Webde Office dönüşümüne Windows uygulamasında kullanılabilir açıklaması; mevcut web görsel akışı korunur.

### Kabul testleri
- [ ] Türkçe, tablo, görsel ve sayfa sonlu DOCX; eski DOC/PPT; çok slaytlı PPTX; yazdırma alanlı XLSX.
- [ ] Font eksikliği, bozuk/parolalı belge; çoklu işlemde kısmi başarı.
- [ ] Tek/çoklu görsel, sıra, portre/manzara, EXIF, şeffaf PNG; sayfa ölçüsü ve önizleme eşleşmesi.
- [ ] Animasyon/çok sayfa reddi; tek/ayrı çıktı; PDF yeniden açma ve görsel karşılaştırma.
- [ ] İptal/yeniden deneme/pencere kapatma; eksik motor/yarıda indirme; kaynak hash bütünlüğü.
- [ ] Çakışan adlar, tek çıktı kaydı; EXE seçme/dönüştürme/Farklı kaydet; masaüstü regresyonu.

Bilinen eksikler ve test sonuçları uygulama sırasında bu bölüme kaydedilir. İlk aşama, kullanıcı genel araç listesi veya kuyruk ekranına girmeden doğrulanmış PDF kaydedebildiğinde tamamlanır.

## Aşama 2 — PDF çalışma penceresi
Durum: **Bekliyor**. Doğrulanan sürüm: yok.
- [ ] Solda sayfa küçük resimleri, ortada belge, üstte araç çubuğu.
- [ ] Sıralama/silme/döndürme; birleştirme/bölme; görsel/metin çıkarma; sıkıştırma.
- [ ] Yazı/görsel/imza ekleme, form doldurma. İmza çizim/görseldir, sertifikalı dijital imza değildir.
Kabul: sayfa sırası/sayısı, metin ve eklemeler kaydedilen PDF’de korunur; tekrar açılır, görsel olarak incelenir.
Bilinen eksik: henüz birleşik PDF editörü yok.

## Aşama 3 — Paint benzeri görsel editörü
Durum: **Bekliyor**. Doğrulanan sürüm: yok.
- [ ] Tek araç çubuğunda seçim, çizim, silgi, metin, şekil, kırpma, boyut ve renk.
- [ ] Metin/şekil/eklenen görseller tekrar seçilir ve taşınır; geri al/yinele.
- [ ] Kolaj: ızgara/yatay/dikey, sürükleme, boşluk ve zemin.
- [ ] Sağda sürekli Kopya olarak kaydet; format ve kalite aynı editörde.
Kabul: araçlar yeni işlem penceresi açmaz; düzenleme/geri alma/çıktı boyutları ve şeffaflık doğrulanır.
Bilinen eksik: mevcut editör birleşik nesne düzenleyici değildir.

## Aşama 4 — OCR ve mevcut PDF yazısı
Durum: **Bekliyor**. Doğrulanan sürüm: yok.
- [ ] Türkçe/İngilizce OCR, aranabilir PDF ve metin çıkarma.
- [ ] Yerel ve açık kaynakla uyumlu gerçek PDF düzenleme motorunun temsilî dosyalarla değerlendirilmesi.
- [ ] Mevcut yazıyı düzeltme; font/yerleşim ve eski içeriğin kaldırılması doğrulanır.
Kabul: beyaz kutu çizme mevcut metni değiştirme sayılmaz. Eski metin aranamaz/çıkarılamaz; desteklenmeyen içerik açıklanır. OCR doğruluğu kontrol edilebilir.
Bilinen eksik: gerçek PDF içerik düzenleme motoru henüz seçilmedi; doğrulanmadan açılmayacak.

## Aşama 5 — gerekli ağır araçlar
Durum: **Bekliyor**. Doğrulanan sürüm: yok.
- [ ] Görsel arka plan kaldırma ve elle kenar düzeltme.
- [ ] Ses/video dönüştürme, sıkıştırma, kesme, birleştirme, ses çıkarma.
- [ ] Format/kalite/kesim temel; kodek/bitrate Gelişmiş altında. Tek sade pencere.
Kabul: model/motor bir kez kurulur; çevrimdışı çalışır; süre/akış/boyut ve görsel sonuç doğrulanır.
Bilinen eksik: arka plan kaldırma yok; mevcut medya araçlarının arayüzü yenilenecek.

## Aşama 6 — dağıtıma hazırlık
Durum: **Bekliyor**. Doğrulanan sürüm: yok.
- [ ] Temiz Windows kurulum/kaldırma; çevrimdışı kullanım; büyük/bozuk dosya ve iptal.
- [ ] Performans, bellek, geçici dosya temizliği, lisans bildirimleri.
- [ ] Doğrulanmış yetenek ve sınırlamaların sürüm raporu.
Kabul: temiz ortamda temel kullanıcı akışları geçer. Mac ayrı derleme/imza/gerçek cihaz testleri olmadan desteklenmiş ilan edilmez.

Sonraki aşamalar önceki aşama kabulünden sonra ayrıntılı planlanır. Bu yol haritası tüm aşamaların tek teslimde tamamlandığı anlamına gelmez.
