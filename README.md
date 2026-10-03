# 💖 Yaşar & Beyza — Sonsuz Aşk Günlüğü ve Anı Galerisi

Sevgililer (Yaşar & Beyza) için özel olarak tasarlanmış; modern, romantik, mobil öncelikli (mobile-first), cam efektli (glassmorphism) fotoğraf galerisi ve aşk notları web uygulaması.

---

## 🌟 Öne Çıkan Özellikler

1. **Özel ve Güvenli Giriş Ekranı**:
   - Yalnızca Yaşar & Beyza'nın erişebileceği şifreli koruma.
   - **Kullanıcı Adı**: `yasarbeyza`
   - **Şifre**: `yasarbeyza29082026`
   - Oturum durumu tarayıcı hafızasında (LocalStorage) güvenle saklanır.

2. **Aktif Gönderen Seçici (Yaşar / Beyza)**:
   - Sayfanın üst kısmında ve mobilde tek dokunuşla gönderen profili değiştirilebilir (`👨‍🦱 Yaşar` / `👩‍🦰 Beyza`).
   - Yüklenen fotoğraflar, eklenen aşk notları ve yorumlar seçili olan gönderenin özel rozetiyle etiketlenir.

3. **Fotoğraf Galerisi ve Çift Yükleme Desteği**:
   - **Çift Yükleme**: İster "Dosya Seç" butonu ile galeriden/bilgisayardan seçin, ister "Fotoğrafı Buraya Sürükleyin" (Drag & Drop) alanına bırakın.
   - Fotoğraf yükleme anında otomatik önizleme ve anı açıklaması ekleme.
   - **Tam Yönetim Yetkisi**: Hem Yaşar hem Beyza fotoğrafları silebilir ve açıklamalarını düzenleyebilir.
   - **Çift Silme Koruması**: Silinen fotoğraflar hem Supabase Storage (`couples-photos` bucket) depolamasından hem de veritabanından kalıcı olarak kaldırılır.
   - **Türkçe Silme Onayı Modalı**: Kazara silinmeleri önlemek için *"Bu anıyı silmek istediğine emin misin?"* onay penceresi.
   - **Tam Ekran Görünüm (Lightbox)**: Fotoğrafları yüksek çözünürlükte büyütme ve cihaza indirme desteği.

4. **Fotoğraf Yorumları**:
   - Her fotoğrafın altında açılır-kapanır Türkçe romantik yorum alanı.
   - Hızlı kalp ve romantik emoji reaksiyonları (`💖`, `😍`, `💍`, `🌸`, `✨` vb.).

5. **Aşk Notları ve Sohbet Duvarı**:
   - Yaşar ve Beyza'nın birbirine günün her anında tatlı aşk notları bırakabileceği canlı duvar.
   - Türkçe tarih/saat damgaları ve kalp bırakma özelliği.
   - Hızlı aşk mesajı önerileri.

6. **Romantik Aşk Sayacı ve Günün Sözü**:
   - Birlikte geçen süreyi ve özel tarihi (`29 Ağustos 2026`) anlık gün, saat, dakika ve saniye bazında gösteren canlı sayaç.
   - Tıklandıkça değişen romantik aşk sözleri.

7. **Mobil Öncelikli (Mobile-First) ve Cam Efekti (Glassmorphism)**:
   - Telefonda iOS/Android yerel uygulaması hissi veren alt gezinme çubuğu (Bottom Navigation).
   - Arka planda süzülen tatlı kalpler ve ışıltılar.
   - Soft pembe, sıcak krem ve gül kurusu pastel renk paleti.

---

## 🛠️ Teknoloji Yığını

- **Çekirdek**: React 19 + Vite
- **Stil & Tasarım**: Tailwind CSS v4 (Cam Efekti / Glassmorphism, Google Fonts: *Plus Jakarta Sans* ve *Caveat*)
- **Veritabanı & Dosya Depolama**: Supabase JS Client (`@supabase/supabase-js`)
- **İkon Seti**: Lucide React
- **Efektler**: Canvas-Confetti (Kalp konfeti patlaması)

---

## 🗄️ Supabase Veritabanı ve Storage Kurulumu

1. [supabase.com](https://supabase.com) adresinde ücretsiz yeni bir proje oluşturun.
2. Supabase kontrol panelinizde sol menüden **SQL Editor** sekmesine gidin.
3. Proje klasöründeki [`supabase_schema.sql`](./supabase_schema.sql) dosyasının tüm içeriğini kopyalayıp SQL Editor'e yapıştırın ve **Run** butonuna basın.
4. Bu işlem;
   - `notes` (Aşk Notları tablosu)
   - `photos` (Fotoğraf Galerisi tablosu)
   - `comments` (Yorumlar tablosu)
   - `couples-photos` (Herkese açık Depolama / Storage Bucket'ı)
   - Gerekli tüm RLS (Row Level Security) okuma/yazma/silme izinlerini tek seferde eksiksiz kuracaktır.

---

## ⚙️ Çevre Değişkenleri (.env.local)

Supabase projenizin **Project Settings -> API** bölümünden URL ve Anon Key bilgilerinizi alın ve projedeki `.env.local` dosyasına yapıştırın:

```env
VITE_SUPABASE_URL=https://projeniz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

*(Not: Bu bilgiler girilmediğinde uygulama otomatik olarak akıllı Demo Modunda açılır ve yerel tarayıcı hafızasıyla test edilebilir).*

---

## 🚀 Yerel Olarak Çalıştırma

Projeyi bilgisayarınızda çalıştırmak için:

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
2. **Add New... -> Project** seçeneğine tıklayıp GitHub deponuzu seçin.
3. **Environment Variables** bölümüne şu iki anahtarı ekleyin:
   - `VITE_SUPABASE_URL`: Supabase Proje URL'niz
   - `VITE_SUPABASE_ANON_KEY`: Supabase Anon Anahtarınız
4. **Deploy** butonuna basın. Birkaç saniye içinde siteniz dünya çapında canlıya geçecektir!

---

*Yaşar ❤️ Beyza — Sonsuza Dek Birlikte* 💖
