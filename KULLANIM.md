# 💖 Kullanım Kılavuzu — Yaşar & Beyza Aşk Günlüğü

Bu kılavuz, siteyi günlük hayatta nasıl kullanacağınızı anlatır. Teknik bilgi
gerektirmez. Kurulum/yönetim adımları için [README.md](./README.md) dosyasına bakın.

---

## 1. Siteyi telefonunuza kurun (bir kez yapılır)

Site aslında bir web adresi ama kurulunca gerçek bir uygulama gibi çalışır.

**Android / Chrome**
1. Sitede giriş yapın.
2. Altta çıkan *"Aşk günlüğünü telefonuna kur 💖"* kartındaki **Kur** düğmesine basın.
3. Kart çıkmazsa: sağ üstteki **⋮** menüsü → **Uygulamayı yükle**.

**iPhone / Safari**
1. Sitede giriş yapın.
2. Alttaki **Paylaş** simgesine (kare + yukarı ok) dokunun.
3. **Ana Ekrana Ekle** seçeneğini seçin → **Ekle**.

Kurulduktan sonra: adres çubuğu kaybolur, tam ekran açılır ve ana ekranda kalp
ikonu görünür.

---

## 2. Giriş yapma

- Kim olduğunuzu seçin (**Yaşar** veya **Beyza**) ve şifrenizi girin.
- Şifreyi siz belirlediniz ve **yalnızca siz biliyorsunuz**; uygulamada veya kodda
  hiçbir yerde saklanmaz.
- İki adımlı doğrulamayı açtıysanız (bkz. bölüm 7), şifreden sonra telefonunuzdaki
  uygulamadan 6 haneli kod istenir.
- **Çıkış** düğmesi sağ üsttedir.

---

## 3. Anı (fotoğraf) ekleme

1. **Anılar** sekmesi → **Yeni Fotoğraf Yükle**.
2. Fotoğrafı sürükleyip bırakın veya **Dosya Seç** ile galerinizden seçin.
3. İsterseniz bir anı notu yazın → **Anıyı Galeriye Ekle**.

Eklerken fotoğraf otomatik olarak sıkıştırılır (uzun kenar 1920 piksel). Bildirimde
*"4,2 MB → 620 KB olarak sıkıştırıldı"* gibi ne kadar küçüldüğünü görürsünüz.
Bu sayede telefonunuzda seçtiğiniz orijinal dosya kalır, site ise hızlı kalır.

Ayarlar:
- Yalnızca **fotoğraf** dosyaları (JPG, PNG, WebP, iPhone HEIC)
- En fazla **15 MB** (sıkıştırmadan önce)

---

## 4. Beğeni ve yorum

- Bir anının altındaki **kalbe** dokunarak beğenin. Sayı anında güncellenir ve
  kaydedilir; sayfayı yenileseniz de kaybolmaz.
- **Yorumlar** düğmesiyle açılan alandan yorum yazabilir, emoji bırakabilirsiniz.
- Yorumları silebilirsiniz.

---

## 5. Bizim Köşemiz (üçüncü sekme)

Burada dört bölüm var:

| Bölüm | Ne yapar |
| --- | --- |
| **İstatistikler** | Kaç anı, not, yorum, kalp; birlikte kaç gün; en uzun seri |
| **Başarımlar** | 11 hedef (25 fotoğraf, 50 not, 100 kalp, 1. yıl…). Kilitliler ilerleme çubuğuyla görünür |
| **Eğlence** | **Anı Eşleştirme Oyunu**, **Bizim Filmimiz**, **Birbirini Tanıma Testi**, **Anı Haritası** |
| **Anılarımızı Koru** | Yedekleme ve bakım |
| **Çöp Kutusu** | Silinen anılar ve notlar (30 gün geri alınabilir) |
| **Güvenlik** | İki adımlı doğrulama (2FA) |
| **Bildirimler** | Yeni anı/not geldiğinde haber verme |

### Birbirini Tanıma Testi
Her soruda iki şey yazarsın: **kendi cevabın** ve **partnerin için tahminin**.
Tahminin onun cevabıyla eşleşirse puan kazanırsın. Cevaplar otomatik kaydedilir;
sonuç ekranında her soru için tahminin ve onun gerçek cevabı yan yana görünür.

### Anı Haritası
- Konumu olan anılar haritada **kalp işaretleriyle** görünür; işarete dokununca
  fotoğraf, anı notu ve yer adı açılır.
- **Konum eklemek için:** alttaki şeritten bir anı seç → haritada o yere dokun →
  istersen *"Kapadokya"* gibi bir isim yaz → **Kaydet**.
- **📍 Konumum** düğmesi telefonunun bulunduğu yeri kullanır.
- Harita yalnızca açtığında indirilir, bu yüzden siteyi yavaşlatmaz.

### Çöp Kutusu (geri alınabilir silme)
Yanlışlıkla silinen bir anı veya not **30 gün** boyunca çöp kutusunda bekler:

- **Geri al** → olduğu yere döner (fotoğraf dosyası silinmemiştir)
- **Sil** → iki kez dokunmanı ister (*"Emin misin?"*), sonra kalıcı olarak silinir
- Her kaydın yanında kaç gün kaldığı yazar

> Silme bildiriminde *"çöp kutusuna taşındı"* yazıyorsa geri alınabilir;
> *"kalıcı olarak silindi"* yazıyorsa geri alınamaz.


### Bizim Filmimiz
Başlattıktan sonra:
- Ortadaki büyük düğme oynat/duraklat
- **🎵** simgesine dokunup telefonunuzdaki bir şarkıyı seçebilirsiniz (şarkı yüklenmez,
  sadece o an çalar)
- Klavye: `←` `→` geçiş, `Boşluk` duraklat, `Esc` çıkış

---

## 6. Yedek almak (önemli!)

Anılar bulutta **tek kopya** olarak durur. Ayda bir yedek almanızı öneririz.

**Bizim Köşemiz → Anılarımızı Koru:**
- **Tam Yedek İndir (ZIP)** → tüm notlar + **bütün fotoğraf dosyaları** tek arşivde iner.
  Arşivin içinde `veriler.json` (tüm kayıtlar) ve `fotograflar/` klasörü olur.
- **Sadece Veriler (JSON)** → hızlı, sadece yazılı kayıtlar (fotoğraf dosyaları hariç).

Uygulama son yedek tarihini hatırlar; 30 gün geçerse **turuncu uyarı** gösterir.

> İndirdiğiniz arşivi telefonunuzda/bilgisayarınızda ya da Google Drive gibi bir
> yerde saklayın. Bu, anılarınızın sizdeki kopyasıdır.

**Bakım:** Eski fotoğrafların küçük önizlemesi yoksa *"Eski fotoğraflara önizleme ekle"*
düğmesi onları üretir; galeri belirgin şekilde hızlanır.

---

## 7. İki adımlı doğrulama (2FA) açmak

Şifreniz birine geçse bile hesabınıza girilmesini engeller.

1. Telefonunuza bir doğrulama uygulaması kurun:
   **Google Authenticator**, **Authy** veya **Microsoft Authenticator**.
2. Sitede **Bizim Köşemiz → Güvenlik → "İki adımlı doğrulamayı aç"**.
3. Ekrandaki kare kodu (QR) uygulamayla tarayın.
4. Uygulamanın gösterdiği 6 haneli kodu girin → **Onayla**.

Artık her girişte şifreden sonra kod istenir.

> **Önemli:** Kodu üreten telefonu kaybederseniz giriş yapamazsınız. Böyle bir durumda
> Supabase panelinden (Authentication → Users) 2FA kaydı kaldırılabilir.
>
> Bu özellik için Supabase panelinde **Authentication → Multi-Factor Auth → TOTP**
> seçeneğinin açık olması gerekir. Kapalıysa kurulum başlatıldığında uyarı görürsünüz.

---

## 8. Bildirimler

**Bizim Köşemiz → Bildirimler → "Bildirimlere izin ver"** dediğinizde, partneriniz yeni
bir anı veya not eklediğinde telefonunuzun bildirim alanından haber verilir.

- Bildirim, site arka planda/başka sekmedeyken gösterilir.
- **iPhone'da** bildirimler yalnızca site ana ekrana eklendikten sonra çalışır.
- İzni yanlışlıkla reddettiyseniz: adres çubuğundaki kilit simgesi → Bildirimler → İzin ver.

---

## 9. Anıların canlı gelmesi

Siz siteyi açıkken partneriniz bir anı veya not eklerse, **sayfayı yenilemenize gerek
kalmadan** ekranda belirir ve küçük bir bilgi balonu çıkar
(*"Beyza yeni bir anı ekledi 💖"*).

---

## 10. Sık sorulan sorular

**Şifremi unuttum, ne yapacağım?**
Giriş şifresi Supabase panelinden yenilenir: *Authentication → Users → kullanıcı →
şifre sıfırlama*. Sitede şifre hatırlatma yoktur (bilinçli bir güvenlik tercihi).

**Fotoğraf yüklenmiyor, ne yapmalıyım?**
- Dosya 15 MB'tan büyük olabilir.
- Dosya bir fotoğraf değilse (örneğin PDF) kabul edilmez.
- Bağlantınız zayıf olabilir; tekrar deneyin.

**Galeri açılışta yavaş.**
Mevcut eski fotoğraflar için *"Eski fotoğraflara önizleme ekle"* düğmesini bir kez
çalıştırın.

**Bir anıyı yanlışlıkla sildim.**
**Bizim Köşemiz → Çöp Kutusu** bölümünden **Geri al** diyebilirsin; silinen anılar ve
notlar 30 gün boyunca orada bekler. Yine de düzenli **tam yedek** almak en sağlam
korumadır.

**Site bir gün açılmazsa?**
Ücretsiz Supabase projeleri uzun süre kullanılmazsa duraklatılır. Depoda bunu önleyen
günlük bir görev vardır; yine de olursa Supabase panelinden **Resume project** ile
geri açılır (veriler kaybolmaz).

---

## 11. Yönetici işleri (teknik)

Aşağıdakiler yalnızca gerekli olduğunda yapılır:

| İş | Nerede |
| --- | --- |
| Veritabanı güncellemesi (SQL) | Supabase Panel → SQL Editor → dosyayı yapıştır → **Run** |
| Yeni hesap ekleme | Supabase → Authentication → Users → **Add user** (+ Auto Confirm) |
| Yeni kayıtları kapatma | Supabase → Authentication → Sign In / Providers |
| Site kodunu güncelleme | GitHub'a push → Vercel otomatik yayınlar |
| Testler | `npm test` (56 test) · `npm run lint` |

---

*Yaşar ❤️ Beyza — Sonsuza Dek Birlikte* 💖
