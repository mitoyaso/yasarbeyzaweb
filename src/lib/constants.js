// ==============================================================================
// UYGULAMA SABİTLERİ VE KİMLİK DOĞRULAMA AYARLARI
// ==============================================================================

// ==============================================================================
// GİRİŞ SİSTEMİ (Supabase Auth)
// ==============================================================================
// Kimlik doğrulama artık Supabase Auth üzerinden e-posta + şifre ile yapılır.
// Bu dosyada ve ön yüzün hiçbir yerinde şifre TUTULMAZ.
// Eski VITE_AUTH_USERNAME / VITE_AUTH_PASSWORD değişkenleri tamamen kaldırıldı;
// artık .env dosyasında da yok.
//
// Giriş ekranında kullanıcı kendi adını seçer; bu ad aşağıdaki e-posta adresine
// eşlenir ve Supabase Auth'a gönderilir.
//
// ÖNEMLİ: Bu adresler Supabase panelinde
//   Authentication -> Users
// altında aynı şekilde tanımlı olmalıdır. Yeni bir hesap eklerken hem buraya
// hem panele eklemen gerekir.

// Gönderen Kişiler
export const SENDERS = {
  YASAR: 'Yaşar',
  BEYZA: 'Beyza',
};

export const AUTH_ACCOUNTS = [
  { name: SENDERS.YASAR, email: 'yasar@sevgunlugu.com', emoji: '👨‍🦱' },
  { name: SENDERS.BEYZA, email: 'beyza@sevgunlugu.com', emoji: '👩‍🦰' },
];

/**
 * Görünen addan Supabase Auth e-postasını bulur.
 */
export function emailForName(name) {
  const found = AUTH_ACCOUNTS.find((a) => a.name === name);
  return found ? found.email : null;
}

/**
 * Supabase Auth e-postasından görünen adı bulur.
 * Eşleşme yoksa null döner (beklenmeyen bir hesapla giriş yapılmış demektir).
 */
export function nameForEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  const found = AUTH_ACCOUNTS.find((a) => a.email.toLowerCase() === normalized);
  return found ? found.name : null;
}

// Yerel Depolama Anahtarları (LocalStorage)
export const STORAGE_KEYS = {
  // ESKİ sistemden kalan bayrak: açılışta temizlenir, artık kullanılmıyor.
  LEGACY_IS_AUTHENTICATED: 'yasar_beyza_auth_v1',
  ACTIVE_SENDER: 'yasar_beyza_active_sender_v1',
  DEMO_PHOTOS: 'yasar_beyza_demo_photos_v1',
  DEMO_NOTES: 'yasar_beyza_demo_notes_v1',
  DEMO_COMMENTS: 'yasar_beyza_demo_comments_v1',
  DEMO_LIKES: 'yasar_beyza_demo_likes_v1',
};

// Supabase Storage Bucket Adı
// (DİKKAT: eski dokümanlarda "couples-photos" yazıyordu, gerçek bucket bu.)
export const SUPABASE_BUCKET_NAME = 'couple-photos';

// Private bucket'tan üretilen imzalı fotoğraf adreslerinin geçerlilik süresi (saniye).
// Süre dolduğunda sayfa yenilendiğinde yeni adres üretilir.
export const SIGNED_URL_TTL_SECONDS = 60 * 60 * 12; // 12 saat

// Özel Tarih / Yıldönümü Hedefi (29 Ağustos 2026)
export const SPECIAL_DATE = '2026-08-29T00:00:00';

// Romantik Aşk Sözleri (Rastgele gösterilmek üzere)
export const ROMANTIC_QUOTES = [
  "Sen benim bugünüm, yarınım ve sonsuza dek sürecek en güzel hikâyemsin. 💖",
  "Gözlerinin içine her baktığımda, evime dönmüş gibi hissediyorum. 🌸",
  "Dünyadaki en güzel manzara, senin gülümsemen. ✨",
  "Birlikte biriktirdiğimiz her anı, kalbimin en değerli köşesinde saklı. 📸",
  "Yaşar & Beyza: İki kalp, tek bir sonsuz sevgi. 🕊️",
  "İyi ki varsın sevgilim, seninle her gün bayram tadında. 🌷",
];
