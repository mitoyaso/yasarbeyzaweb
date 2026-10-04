// ==============================================================================
// UYGULAMA SABİTLERİ VE GÜVENLİK AYARLARI
// ==============================================================================

// Giriş Bilgileri (.env dosyasından okunur)
// ÖNEMLİ: .env dosyasını değiştirdiysen Vite dev server'ı YENİDEN BAŞLAT!
//         .env değişiklikleri sadece uygulama başlarken okunur.
const ENV_USER = import.meta.env.VITE_AUTH_USERNAME;
const ENV_PASS = import.meta.env.VITE_AUTH_PASSWORD;

export const AUTH_CREDENTIALS = {
  KULLANICI_ADI: ENV_USER || '',
  SIFRE: ENV_PASS || '',
};

export const IS_AUTH_ENV_SET = Boolean(ENV_USER && ENV_PASS);

// Yerel Depolama Anahtarları (LocalStorage)
export const STORAGE_KEYS = {
  IS_AUTHENTICATED: 'yasar_beyza_auth_v1',
  ACTIVE_SENDER: 'yasar_beyza_active_sender_v1',
  DEMO_PHOTOS: 'yasar_beyza_demo_photos_v1',
  DEMO_NOTES: 'yasar_beyza_demo_notes_v1',
  DEMO_COMMENTS: 'yasar_beyza_demo_comments_v1',
};

// Gönderen Kişiler
export const SENDERS = {
  YASAR: 'Yaşar',
  BEYZA: 'Beyza',
};

// Supabase Storage Bucket Adı
export const SUPABASE_BUCKET_NAME = 'couple-photos';

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
