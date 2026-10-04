// ==============================================================================
// ŞİFRE KURALLARI (SAF — test edilebilir)
// ==============================================================================

/**
 * Yeni şifre kurallarını denetler.
 * @returns {string|null} hata mesajı ya da null (uygun)
 */
export function sifreHatasi({ mevcut = '', yeni = '', tekrar = '' } = {}) {
  if (!mevcut) return 'Mevcut şifreni girmelisin.';

  if (!yeni) return 'Yeni şifreni girmelisin.';
  if (yeni.length < 8) return 'Yeni şifre en az 8 karakter olmalı.';
  if (yeni === mevcut) return 'Yeni şifre eskisiyle aynı olamaz.';
  if (yeni !== tekrar) return 'Yeni şifreler birbiriyle uyuşmuyor.';

  const harfVar = /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(yeni);
  const rakamVar = /[0-9]/.test(yeni);
  if (!harfVar || !rakamVar) return 'Şifre en az bir harf ve bir rakam içermeli.';

  return null;
}

/**
 * Şifre gücünü 0-4 arasında puanlar (arayüzdeki gösterge için).
 */
export function sifreGucu(sifre = '') {
  let puan = 0;
  if (sifre.length >= 8) puan += 1;
  if (sifre.length >= 12) puan += 1;
  if (/[A-ZÇĞİÖŞÜ]/.test(sifre) && /[a-zçğıöşü]/.test(sifre)) puan += 1;
  if (/[0-9]/.test(sifre) && /[^A-Za-z0-9]/.test(sifre)) puan += 1;
  return Math.min(4, puan);
}

export function sifreGucuEtiketi(puan) {
  return ['Çok zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü'][Math.max(0, Math.min(4, puan))];
}
