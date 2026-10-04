// ==============================================================================
// GİRİŞ YAPILMIŞ ARAYÜZ TESTİ
// ==============================================================================
// Ne yapar: Sahte bir oturum ve sahte Supabase yanıtlarıyla uygulamayı
// giriş yapılmış gibi çalıştırır; "Bizim Köşemiz" sekmesini ve oradaki tüm
// panelleri (çöp kutusu, anı haritası, test, oyun, film) sırayla açar ve
// ekrana çizildiklerini doğrular.
//
// Neden önemli: Bu paneller canlı test edilemediği için, çalışma zamanı
// hatalarını (beyaz ekran, çökme) yakalayan tek otomatik kontrol budur.
//
// Çalıştırma:  npm run test:app     (önce: npm run build)
// ==============================================================================

import {
  paketBilgisi,
  tarayiciKur,
  cizimBekle,
  bekle,
  sahteOturumKur,
  sahteApiKur,
  tikla,
  tiklaSecici,
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
sahteOturumKur(window);

const fotolar = [sahteFoto(1), sahteFoto(2), sahteFoto(3), sahteFoto(4)];
const notlar = [sahteNot(1), sahteNot(2)];
const api = sahteApiKur({ fotolar, notlar });

const escBas = () => {
  document.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  );
};

console.log('Giriş yapılmış arayüz testi başlıyor...');
console.log(`  paket: ${bilgi.entryYolu}`);
console.log(`  sahte veri: ${fotolar.length} anı, ${notlar.length} not\n`);

let icerik = '';
try {
  await import(`file://${bilgi.entryDosyasi.replace(/\\/g, '/')}`);
  icerik = await cizimBekle(document);
} catch (err) {
  console.log('  [HATA] Paket yüklenemedi: ' + String(err.message).slice(0, 160));
  console.log('  yığın: ' + String(err.stack || '').split('\n').slice(0, 6).join(' | '));
  basarisiz += 1;
}

console.log('1) GİRİŞ YAPILMIŞ ANA EKRAN');
kontrol('Uygulama çizildi', icerik.length > 200, `${icerik.length} karakter`);
kontrol('Giriş ekranı GÖRÜNMÜYOR (oturum kabul edildi)', !icerik.includes('Kimsin'));
kontrol('Üst çubuk (Navbar) çizildi', icerik.includes('Sonsuz Anılar'));
kontrol('Anılar sekmesi ve galeri başlığı', icerik.includes('Aşk Albümümüz'));
kontrol('Sahte anı yüklendi', icerik.includes('Test anısı 1'));
// Kullanıcı isteği: gönderen kişi hesaba göre belirlenir, seçilemez.
kontrol('Gönderen rozeti görünüyor (hesaptan geliyor)', icerik.includes('Yaşar'));
kontrol(
  'Gönderen değiştirici KALDIRILDI',
  !document.querySelector('[title="Göndereni Değiştir"]') && !icerik.includes('Aktif Gönderen')
);

console.log('\n2) BİZİM KÖŞEMİZ SEKMESİ');
tikla(document, 'Bizim Köşemiz');
await bekle(700);

icerik = document.getElementById('root').innerHTML;
kontrol('Sekme değişti ve bölüm açıldı', icerik.includes('Bizim Köşemiz'));
kontrol('İstatistik kartları', icerik.includes('Aşk Notu') && icerik.includes('Kalp'));
kontrol('Başarımlar bölümü', icerik.includes('Başarımlar') && icerik.includes('İlk Anı'));
kontrol('Yedekleme bölümü', icerik.includes('Anılarımızı Koru'));
kontrol('Eğlence bölümü', icerik.includes('Eğlence'));
kontrol('Oyun kartı', icerik.includes('Anı Eşleştirme Oyunu'));
kontrol('Film kartı', icerik.includes('Bizim Filmimiz'));
kontrol('YETENEK: Çöp kutusu kartı göründü', icerik.includes('Çöp Kutusu'));
kontrol('YETENEK: Anı haritası kartı göründü', icerik.includes('Anı Haritası'));
kontrol('YETENEK: Test kartı göründü', icerik.includes('Birbirini Tanıma Testi'));
kontrol('Güvenlik bölümü', icerik.includes('Güvenlik'));
kontrol('Bildirimler bölümü', icerik.includes('Bildirimler'));

console.log('\n3) BİRBİRİNİ TANIMA TESTİ (quiz paneli)');
tikla(document, 'Birbirini Tanıma Testi');
await bekle(600);
icerik = document.getElementById('root').innerHTML;
kontrol('Test paneli açıldı', icerik.includes('Teste Başla') || icerik.includes('soruda'));
kontrol('Soru sayısı yazıldı', icerik.includes('10'));
escBas();
await bekle(400);

console.log('\n4) ANI EŞLEŞTİRME OYUNU');
tikla(document, 'Anı Eşleştirme Oyunu');
await bekle(600);
icerik = document.getElementById('root').innerHTML;
kontrol('Oyun paneli açıldı', icerik.includes('hamle') && icerik.includes('Yeni Oyun'));
kontrol('Kart alanı oluştu', document.querySelectorAll('.flip-scene').length > 0,
  `${document.querySelectorAll('.flip-scene').length} kart`);
escBas();
await bekle(400);

console.log('\n5) BİZİM FİLMİMİZ (slayt)');
tikla(document, 'Bizim Filmimiz');
await bekle(800);
icerik = document.getElementById('root').innerHTML;
kontrol('Sinema modu açıldı', icerik.includes('Bizim Filmimiz') && icerik.includes('müzik'));

// Kullanıcı geri bildirimi: slayttan çıkmak zordu → sol üstte "Geri" olmalı
const filmGeri = document.querySelector('button[aria-label="Slayttan çık"]');
kontrol('Sol üstte "Geri" düğmesi var', Boolean(filmGeri),
  filmGeri ? `"${(filmGeri.textContent || '').trim()}"` : 'YOK');
kontrol(
  'Yan gezinme okları var (önceki/sonraki)',
  Boolean(
    document.querySelector('button[aria-label="Önceki anı"]') &&
      document.querySelector('button[aria-label="Sonraki anı"]')
  )
);

const sayfaNo = () =>
  (document.getElementById('root').innerHTML.match(/(\d+) \/ (\d+)/) || [])[1];
const oncekiSayfa = sayfaNo();
tiklaSecici(document, 'button[aria-label="Sonraki anı"]');
await bekle(500);
const sonrakiSayfa = sayfaNo();
kontrol('"Sonraki" oku slaytı ilerletti', oncekiSayfa !== sonrakiSayfa,
  `${oncekiSayfa} → ${sonrakiSayfa}`);

filmGeri?.click();
await bekle(500);
kontrol(
  '"Geri" düğmesi slayttan çıkardı',
  document.querySelector('[role="dialog"][aria-label="Bizim Filmimiz"]') === null
);
await bekle(400);

// Telefonda üst bölge çentik/durum çubuğu altında kalabildiği için
// altta da mutlaka bir çıkış yolu bulunmalı (kullanıcı geri bildirimi).
tikla(document, 'Bizim Filmimiz');
await bekle(700);
const altCikis = [...document.querySelectorAll('button')].find(
  (buton) => (buton.textContent || '').trim() === 'Slayttan çık'
);
kontrol('Altta "Slayttan çık" düğmesi var (telefon güvencesi)', Boolean(altCikis));
altCikis?.click();
await bekle(500);
kontrol(
  'Alttaki çıkış düğmesi çalışıyor',
  document.querySelector('[role="dialog"][aria-label="Bizim Filmimiz"]') === null
);
await bekle(400);

console.log('\n6) ÇÖP KUTUSU PANELİ');
tikla(document, 'Çöp Kutusu');
await bekle(400);
tikla(document, 'Aç');
await bekle(700);
icerik = document.getElementById('root').innerHTML;
kontrol('Çöp kutusu paneli açıldı', icerik.includes('Çöp Kutusu') && icerik.includes('kayıt'));
kontrol('Boş durum mesajı', icerik.includes('Çöp kutusu boş'));
escBas();
await bekle(400);

console.log('\n7) ANI HARİTASI PANELİ');
tikla(document, 'Anı Haritası');

// Harita kütüphanesi jsdom'da gerçek yerleşim bulamayabilir; bu yüzden
// "harita çizildi", "hata mesajı gösterildi" veya "hâlâ yükleniyor"
// durumlarından biri beklenir. Önemli olan panelin ÇÖKMEMESİ.
let haritaDurumu = 'yükleniyor (jsdom kısıtı)';
for (let deneme = 0; deneme < 16; deneme += 1) {
  await bekle(500);
  icerik = document.getElementById('root').innerHTML;
  if (document.querySelector('.leaflet-container')) {
    haritaDurumu = 'harita çizildi';
    break;
  }
  if (icerik.includes('Harita yüklenemedi')) {
    haritaDurumu = 'hata mesajı gösterildi (çökme yok)';
    break;
  }
  if (!icerik.includes('Anı Haritası')) {
    haritaDurumu = 'panel beklenmedik şekilde kapandı';
    break;
  }
}

kontrol('Harita paneli çöktürmedi', icerik.length > 200);
kontrol(
  'Harita paneli beklenen bir durumda (harita / hata mesajı / yükleniyor)',
  !haritaDurumu.startsWith('panel beklenmedik'),
  haritaDurumu
);
console.log(
  '  NOT: jsdom gerçek yerleşim yapamadığı için harita "yükleniyor" durumunda\n' +
    '       kalabilir; bunun gerçek tarayıcıda olup olmadığı ancak canlı testte anlaşılır.'
);

console.log('\n8) EROS (yapay zekâ danışman)');
escBas();
await bekle(500);
kontrol('Eros kartı göründü', document.getElementById('root').innerHTML.includes('Eros'), true);
tikla(document, 'Sohbet et');
await bekle(700);
icerik = document.getElementById('root').innerHTML;
kontrol(
  'Eros sohbet ekranı açıldı',
  document.querySelector('[role="dialog"][aria-label="Eros"]') !== null,
  true
);
kontrol('Karşılama mesajı göründü', icerik.includes('Merhaba, ben Eros'), true);
kontrol('Öneri düğmeleri var', icerik.includes('sürpriz fikri'), true);
kontrol(
  'Gizlilik uyarısı var (uzman değildir)',
  icerik.includes('uzman değildir'),
  true
);

console.log('\n=== SONUÇ ===');
console.log(`  ${basarisiz === 0 ? 'TÜM KONTROLLER GEÇTİ ✅' : `${basarisiz} kontrol BAŞARISIZ ❌`}`);

api.geriAl();

if (basarisiz !== 0) {
  console.log('\nSon ekran içeriği (ilk 400 karakter):\n' + icerik.slice(0, 400));
}

process.exit(basarisiz === 0 ? 0 : 1);
