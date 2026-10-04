# 💖 Yaşar & Beyza — Sonsuz Aşk Günlüğü ve Anı Galerisi

Sevgililer (Yaşar & Beyza) için özel olarak tasarlanmış; modern, romantik, mobil öncelikli (mobile-first), cam efektli (glassmorphism) fotoğraf galerisi ve aşk notları web uygulaması.

---

## 🌟 Öne Çıkan Özellikler

1. **Gerçek ve Güvenli Giriş Sistemi (Supabase Auth)**:
   - Giriş, Supabase Auth üzerinden e-posta + şifre ile yapılır; şifre doğrulaması sunucu tarafında gerçekleşir.
   - **Kodda, repoda veya `.env` dosyasında hiçbir şifre tutulmaz.**
   - Oturum, Supabase'in güvenli oturum yönetimi ve yenileme token'ları ile sürdürülür.
   - Giriş ekranında kişi seçilir (`👨‍🦱 Yaşar` / `👩‍🦰 Beyza`), şifre yalnızca o kişiye ait Supabase hesabıyla eşleşirse kabul edilir.

2. **Veritabanı Seviyesinde Koruma (RLS)**:
   - `notes`, `photos`, `comments`, `likes` tablolarında Row Level Security açıktır.
   - Giriş yapmamış (anon) istemcilerin **okuma, ekleme, güncelleme ve silme yetkisi yoktur**; politikalar yalnızca `authenticated` rolüne tanımlıdır.
   - Fotoğrafların tutulduğu `couple-photos` bucket'ı **private**'tır; görseller yalnızca giriş yapmış kullanıcı için üretilen süreli (imzalı) adreslerle gösterilir.

3. **Aktif Gönderen Seçici (Yaşar / Beyza)**:
   - Giriş yapılan hesaba göre otomatik ayarlanır; istenirse sayfanın üstünden veya mobilde alt menüden tek dokunuşla değiştirilebilir.
   - Yüklenen fotoğraflar, eklenen aşk notları ve yorumlar seçili olan gönderenin özel rozetiyle etiketlenir.

4. **Fotoğraf Galerisi ve Çift Yükleme Desteği**:
   - **Çift Yükleme**: İster "Dosya Seç" butonu ile galeriden/bilgisayardan seçin, ister "Fotoğrafı Buraya Sürükleyin" (Drag & Drop) alanına bırakın.
   - Fotoğraf yükleme anında otomatik önizleme ve anı açıklaması ekleme.
   - **Tam Yönetim Yetkisi**: Hem Yaşar hem Beyza fotoğrafları silebilir ve açıklamalarını düzenleyebilir.
   - **Çift Silme Koruması**: Silinen fotoğraflar hem Supabase Storage (`couple-photos` bucket) depolamasından hem de veritabanından kalıcı olarak kaldırılır.
   - **Türkçe Silme Onayı Modalı**: Kazara silinmeleri önlemek için *"Bu anıyı silmek istediğine emin misin?"* onay penceresi.
   - **Tam Ekran Görünüm (Lightbox)**: Fotoğrafları yüksek çözünürlükte büyütme ve cihaza indirme desteği.

5. **Fotoğraf Yorumları**:
   - Her fotoğrafın altında açılır-kapanan Türkçe romantik yorum alanı.
   - Hızlı kalp ve romantik emoji reaksiyonları (`💖`, `😍`, `💍`, `🌸`, `✨` vb.).

6. **Aşk Notları ve Sohbet Duvarı**:
   - Yaşar ve Beyza'nın birbirine günün her anında tatlı aşk notları bırakabileceği canlı duvar.
   - Türkçe tarih/saat damgaları ve kalp bırakma özelliği.
   - Hızlı aşk mesajı önerileri.

7. **Romantik Aşk Sayacı ve Günün Sözü**:
   - Birlikte geçen süreyi ve özel tarihi (`29 Ağustos 2026`) anlık gün, saat, dakika ve saniye bazında gösteren canlı sayaç.
   - Tıklandıkça değişen romantik aşk sözleri.

8. **Mobil Öncelikli (Mobile-First) ve Cam Efekti (Glassmorphism)**:
   - Telefonda iOS/Android yerel uygulaması hissi veren alt gezinme çubuğu (Bottom Navigation).
   - Arka planda süzülen tatlı kalpler ve ışıltılar.
   - Soft pembe, sıcak krem ve gül kurusu pastel renk paleti.

---

## 🛠️ Teknoloji Yığını

- **Çekirdek**: React 19 + Vite
- **Stil & Tasarım**: Tailwind CSS v4 (Cam Efekti / Glassmorphism, Google Fonts: *Plus Jakarta Sans* ve *Caveat*)
- **Kimlik Doğrulama**: Supabase Auth (e-posta + şifre)
- **Veritabanı & Dosya Depolama**: Supabase JS Client (`@supabase/supabase-js`), RLS korumalı PostgreSQL ve private Storage bucket
- **İkon Seti**: Lucide React
- **Efektler**: Canvas-Confetti (Kalp konfeti patlaması)

---

## 🔐 Kurulum Adımları (Sıfırdan)

### 1. Supabase projesi ve veritabanı

1. [supabase.com](https://supabase.com) adresinde yeni bir proje oluşturun.
2. Sol menüden **SQL Editor** sekmesine gidin.
3. Proje klasöründeki [`supabase_schema.sql`](./supabase_schema.sql) dosyasının tüm içeriğini kopyalayıp SQL Editor'e yapıştırın ve **Run** butonuna basın.
4. Bu işlem; `notes`, `photos`, `comments`, `likes` tablolarını, gerekli RLS politikalarını ve **private** `couple-photos` depolama bucket'ını oluşturur.

> Zaten kurulu bir projeyi güvenli hâle getirmek için (anon erişimini kapatmak, bucket'ı private yapmak) [`supabase/migrations/20261005_auth_only_rls.sql`](./supabase/migrations/20261005_auth_only_rls.sql) betiğini çalıştırın.

### 2. Giriş hesapları

Hesaplar Supabase panelinden oluşturulur; uygulama bunları görünen adlara eşler:

| Ekranda görünen | Supabase Auth e-postası |
| --- | --- |
| 👨‍🦱 Yaşar | `yasar@sevgunlugu.com` |
| 👩‍🦰 Beyza | `beyza@sevgunlugu.com` |

1. Supabase Panel → **Authentication → Users → Add user**
2. Yukarıdaki e-posta adresini ve güçlü bir şifre yazın.
3. **Auto Confirm User** seçeneğini işaretleyin (e-posta doğrulaması beklenmesin diye).
4. Aynı işlemi ikinci hesap için tekrarlayın.

> Giriş ekranında kullanıcı e-posta yazmaz; sadece kim olduğunu seçip şifresini girer.

### 3. Güvenlik ayarları (önerilir)

- **Authentication → Sign In / Providers**: "Allow new users to sign up" seçeneğini **kapatın**. Böylece dışarıdan kimse kendi hesabını oluşturamaz.

---

## ⚙️ Çevre Değişkenleri (.env)

Supabase projenizin **Project Settings → API** bölümünden URL ve Anon Key bilgilerinizi alın ve projedeki `.env` dosyasına yazın:

```env
VITE_SUPABASE_URL=https://projeniz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Anon key tek başına veriye erişemez: tüm tablolar RLS ile korunur ve yalnızca giriş yapmış kullanıcıya izin verir. Yine de bu dosya `.gitignore` ile korunur ve repoya gönderilmez.
>
> Giriş bilgileri (kullanıcı adı/şifre) **artık `.env` dosyasında tutulmaz**.

*(Not: Bu bilgiler girilmediğinde uygulama otomatik olarak akıllı Demo Modunda açılır ve yerel tarayıcı hafızasıyla test edilebilir.)*

---

## 🚀 Yerel Olarak Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda `http://localhost:5173` adresine giderek uygulamayı görüntüleyebilirsiniz.

---

## 🌐 GitHub ve Vercel'de Yayınlama Rehberi

### 1. GitHub'a Gönderme
```bash
git init
git add .
git commit -m "feat: Yaşar & Beyza Aşk Günlüğü Web Uygulaması"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git
git push -u origin main
```

### 2. Vercel'e Dağıtım
1. [vercel.com](https://vercel.com) adresine giriş yapın.
2. **Add New... → Project** seçeneğine tıklayıp GitHub deponuzu seçin.
3. **Environment Variables** bölümüne şu iki anahtarı ekleyin:
   - `VITE_SUPABASE_URL`: Supabase Proje URL'niz
   - `VITE_SUPABASE_ANON_KEY`: Supabase Anon Anahtarınız
4. **Deploy** butonuna basın.

> **Önemli sıralama:** Veritabanını kilitleyen SQL betiği, giriş sistemi canlıya çıktıktan **sonra** çalıştırılmalıdır. Aksi hâlde eski sürüm site bir süre veriye erişemez.

---

## 🔒 Güvenlik Özeti

| Katman | Durum |
| --- | --- |
| Şifre saklama | Kodda/repoda/`.env` içinde şifre **yok**; doğrulama Supabase Auth'ta |
| Tablo erişimi | Yalnızca `authenticated`; `anon` için okuma/yazma/silme kapalı |
| Fotoğraflar | Private bucket + süreli imzalı adresler |
| Yeni kayıt | Panelden kapatılması önerilir |

---

*Yaşar ❤️ Beyza — Sonsuza Dek Birlikte* 💖
