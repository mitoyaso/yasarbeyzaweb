// ==============================================================================
// UYGULAMA SABİTLERİ VE GÜVENLİK AYARLARI
// ==============================================================================

// Giriş Bilgileri (.env dosyasından okunur)
// ÖNEMLİ: Değerler her kullanımda import.meta.env üzerinden DINAMIK olarak okunur.
//         Böylece dev server HMR veya sayfa yenilemede stale değer sorunu olmaz.
//
// .env dosyasını değiştirdiysen tarayıcıda F5 ile sayfayı YENİLE (veya sunucuyu yeniden başlat).

export function getAuthCredentials() {
  return {
    KULLANICI_ADI: (import.meta.env.VITE_AUTH_USERNAME || '').trim(),
    SIFRE: (import.meta.env.VITE_AUTH_PASSWORD || '').trim(),
  };
}

export function isAuthEnvSet() {
  const c = getAuthCredentials();
  return Boolean(c.KULLANICI_ADI && c.SIFRE);
}

// Geriye dönük uyumluluk: AUTH_CREDENTIALS nesnesi (çoğu yerde kullanılıyor)
export const AUTH_CREDENTIALS = new Proxy(
  {},
  {
    get(_target, prop) {
      const c = getAuthCredentials();
      return c[prop];
    },
    ownKeys() {
      return ['KULLANICI_ADI', 'SIFRE'];
    },
    getOwnPropertyDescriptor() {
      return { enumerable: true, configurable: true };
    },
  }
);

export const IS_AUTH_ENV_SET = isAuthEnvSet();

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
