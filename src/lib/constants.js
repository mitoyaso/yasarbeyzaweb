// ==============================================================================
// UYGULAMA SABİTLERİ VE GÜVENLİK AYARLARI
// ==============================================================================

// ==============================================================================
// GIRIŞ BILGILERI (.env dosyasindan okunur)
// ==============================================================================
// .env dosyasini degistirdikten sonra:
//   1. Vite dev server CALISIYORSA: Kapatip "npm run dev" ile TEKRAR BASLAT
//      (.env dosyalari SADECE uygulama BASLARKEN okunur, sonradan F5 yetmez)
//   2. Ardindan tarayicida sayfayi F5 ile yenile
//
// Bu dosyada ASLA dogrudan sifre yazilmaz! Okuma sadece import.meta.env uzerinden olur.
// ==============================================================================

function readEnvUser() {
  const v = import.meta.env.VITE_AUTH_USERNAME;
  return (typeof v === 'string' ? v : '').trim();
}

function readEnvPass() {
  const v = import.meta.env.VITE_AUTH_PASSWORD;
  return (typeof v === 'string' ? v : '').trim();
}

/**
 * Ortam değişkenlerinden güncel giriş bilgilerini döner (her çağrıda tekrar okur).
 */
export function getAuthCredentials() {
  return {
    KULLANICI_ADI: readEnvUser(),
    SIFRE: readEnvPass(),
  };
}

/**
 * Ortam değişkenlerinin (kullanıcı adı + şifre) dolu olup olmadığını kontrol eder.
 * Debug için degerlerin karakter uzunluklarini da doner (guvenlik icin icerigi degil).
 */
export function isAuthEnvSet() {
  const u = readEnvUser();
  const p = readEnvPass();
  return {
    ok: Boolean(u && p),
    usernameLength: u.length,
    passwordLength: p.length,
    usernameFirstChar: u.charAt(0),
  };
}

// Geriye dönük uyumluluk: AUTH_CREDENTIALS (eski kodlar bozulmasin)
export const AUTH_CREDENTIALS = {
  get KULLANICI_ADI() {
    return readEnvUser();
  },
  get SIFRE() {
    return readEnvPass();
  },
};

export const IS_AUTH_ENV_SET = isAuthEnvSet().ok;

// Yerel Depolama Anahtarları (LocalStorage)
export const STORAGE_KEYS = {
  IS_AUTHENTICATED: 'yasar_beyza_auth_v1',
  ACTIVE_SENDER: 'yasar_beyza_active_sender_v1',
  DEMO_PHOTOS: 'yasar_beyza_demo_photos_v1',
  DEMO_NOTES: 'yasar_beyza_demo_notes_v1',
  DEMO_COMMENTS: 'yasar_beyza_demo_comments_v1',
  DEMO_LIKES: 'yasar_beyza_demo_likes_v1',
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
