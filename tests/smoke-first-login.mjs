// ==============================================================================
// İLK GİRİŞ TESTİ — Şifre Belirleme
// ==============================================================================
// Ne yapar: Şifresini henüz kendisi belirlememiş bir hesapla giriş yapılmış gibi
// davranır ve uygulamanın "Kendi Şifreni Belirle" penceresini açtığını,
// üç alanın (mevcut / yeni / tekrar) bulunduğunu ve hatalı girişlerin
// reddedildiğini doğrular.
// ==============================================================================

import {
  paketBilgisi,
  tarayiciKur,
  cizimBekle,
  bekle,
  sahteOturumKur,
  sahteApiKur,
  yaz,
  sahteFoto,
  sahteNot,
} from './harness.mjs';

const bilgi = paketBilgisi();
if (!bilgi) {
  console.log('[ATLANDI] dist/index.html yok. Önce "npm run build" çalıştırın.');
  process.exit(0);
}

let basarisiz = 0;
const kontrol = (ad, kosul, ek = '') => {
  if (!kosul) basarisiz += 1;
  console.log(`  ${kosul ? '[OK]  ' : '[HATA]'} ${ad}${ek ? ` — ${ek}` : ''}`);
};

const { window, document } = tarayiciKur(bilgi.html);

// Şifresini henüz belirlememiş hesap → ilk giriş akışı
sahteOturumKur(window, { sifreKisisel: false });

const api = sahteApiKur({ fotolar: [sahteFoto(1)], notlar: [sahteNot(1)] });

console.log('İlk giriş (şifre belirleme) testi başlıyor...\n');

// Not: aynı paket bu süreçte ikinci kez yükleniyor; ESM önbelleğini atlatmak
// için sorgu eklenir.
await import(`file://${bilgi.entryDosyasi.replace(/\\/g, '/')}?ilk-giris=1`);
await cizimBekle(document);
await bekle(600);

const pencere = document.querySelector('[role="dialog"][aria-label="Şifre Belirle"]');
kontrol('İlk girişte şifre penceresi AÇILDI', Boolean(pencere));

if (pencere) {
  const alanlar = [...pencere.querySelectorAll('input')];
  kontrol('Üç alan var (mevcut / yeni / tekrar)', alanlar.length === 3, `${alanlar.length} alan`);

  kontrol(
    'Uyarı: diğeri şifreni bilmesin',
    (pencere.textContent || '').includes('diğerin senin şifreni bilmez'),
    true
  );

  // 1) Boş gönderim → "mevcut şifre" uyarısı
  pencere.querySelector('button[type="submit"]').click();
  await bekle(300);
  kontrol(
    'Boş gönderim reddedildi',
    (pencere.textContent || '').includes('Mevcut şifreni girmelisin'),
    true
  );

  // 2) Kısa yeni şifre → "en az 8 karakter" uyarısı (+ güç göstergesi görünür)
  yaz(window, alanlar[0], 'eskiSifre1');
  yaz(window, alanlar[1], 'kisa1');
  yaz(window, alanlar[2], 'kisa1');
  await bekle(200);
  kontrol(
    'Güç göstergesi göründü',
    (pencere.textContent || '').toLowerCase().includes('zayıf'),
    true
  );
  pencere.querySelector('button[type="submit"]').click();
  await bekle(300);
  kontrol(
    'Kısa şifre reddedildi (en az 8)',
    (pencere.textContent || '').includes('en az 8 karakter'),
    true
  );

  // 3) Uyuşmayan tekrar → "uyuşmuyor" uyarısı
  yaz(window, alanlar[1], 'yeniSifre123');
  yaz(window, alanlar[2], 'baskaSifre123');
  await bekle(150);
  pencere.querySelector('button[type="submit"]').click();
  await bekle(300);
  kontrol(
    'Uyuşmayan şifreler reddedildi',
    (pencere.textContent || '').includes('uyuşmuyor'),
    true
  );
} else {
  kontrol('Üç alan var (mevcut / yeni / tekrar)', false, 'pencere yok');
}

console.log('\n=== SONUÇ ===');
console.log(`  ${basarisiz === 0 ? 'TÜM KONTROLLER GEÇTİ ✅' : `${basarisiz} kontrol BAŞARISIZ ❌`}`);
api.geriAl();
process.exit(basarisiz === 0 ? 0 : 1);
