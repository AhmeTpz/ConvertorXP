# ConvertorXP 0.3.0 — Windows deneme doğrulaması

Tarih: 29 Ekim 2026. Bu kayıt mevcut geliştirme bilgisayarındaki sonuçları kapsar.

- 14 mevcut otomatik test geçti; ek PDF form alanı keşfi/doğru ve yanlış parola testi ayrıca geçti (toplam 15).
- Electron utility-process, kuyruk iptali, çalışma alanı kalıcılığı, kaynak bütünlüğü, ad çakışması, paket hash reddi, yetenek keşfi ve yarım kalan işler: 7 altyapı kontrolü geçti.
- `verification-report.json`: 37 temsilî format/işlem senaryosu geçti; sekiz görsel çıktı biçimi, PDF, medya, altyazı, CSV ve Office dahil.
- Web ve yerel JavaScript sözdizimi kontrolleri geçti.
- Paketlenmiş `release/win-unpacked/ConvertorXP.exe` gerçek Windows arayüzünde açıldı. Kayıtlı masaüstü dosyaları ve küçük resimleri geri geldi.
- Paketlenmiş EXE ile WebP → PNG tamamlandı; aynı adlı çıktı `(1)` ile korundu ve yeni dosya yeniden başlatma gerekmeksizin masaüstüne eklendi.
- Yerel dosya seçiciden PDF eklendi; çift tıkla açılan PDF sayfası Türkçe metinle görüntülendi. Kanıt: `desktop-smoke.png`.
- ASAR içindeki ana süreç, görsel/PDF motoru ve arayüz dosyaları çalışma ağacındaki sürümlerle karşılaştırıldı ve eşleşti.

Yükleyici: `release/ConvertorXP Setup 0.3.0.exe`, 264684161 bayt (252.42 MiB).

SHA-256: `1C99AAED5D48003B6AB3EFC656EB600EEAB67599B831FBD93FF57FC5CEE693A7`

## Henüz doğrulanmayanlar

Temiz Windows 10/11 sanal makinesinde kurulum/kaldırma, tüm paketlerin paketlenmiş EXE üzerinden uçtan uca kullanımı ve tüm format varyantları doğrulanmadı. Ek paket motor testleri bu bilgisayarda yerel test paketleriyle yapıldı. Mac paketi üretilmedi. Bu sürüm deneme sürümüdür; tüm formatlar ve bütün belgeler için hatasızlık iddiası taşımaz.

Test matrisi tekrar çalıştırıldığında eski `office-output` klasörüne takılıyordu. Betik her çalıştırmada ayrı geçici alt klasör oluşturacak şekilde düzeltildi ve 37 senaryo yeniden geçirildi.
