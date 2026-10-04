// ==============================================================================
// YAZMA AKIŞLARI TESTİ
// ==============================================================================
// Ne yapar: Uygulamada gerçekten tıklayarak silme, beğenme ve quiz cevaplama
// akışlarını çalıştırır; ardından GİDEN AĞ İSTEKLERİNİ inceleyerek doğru
// işlemin yapıldığını kanıtlar.
//
// En kritik kontrol: "Sil" dendiğinde kayıt gerçekten ÇÖPE mi taşınıyor
// (deleted_at işaretleniyor) yoksa yanlışlıkla KALICI mı siliniyor?
//
// Çalıştırma:  npm run test:writes     (önce: npm run build)
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
sahteOturumKur(window);

const fotolar = [sahteFoto(1), sahteFoto(2), sahteFoto(3)];
const notlar = [sahteNot(1)];
const copFoto = { ...sahteFoto(9), deleted_at: new Date().toISOString() };

const api = sahteApiKur({ fotolar, notlar, copFotolar: [copFoto], copNotlar: [] });

const bul = (yontem, parca) =>
  api.istekler.find((istek) => istek.yontem === yontem && istek.url.includes(parca));

console.log('Yazma akışları testi başlıyor...\n');
await import(`file://${bilgi.entryDosyasi.replace(/\\/g, '/')}`);
await cizimBekle(document);

// ---------------------------------------------------------------- 1) BEĞENİ
console.log('1) BEĞENİ');
api.sifirla();
tiklaSecici(document, 'button[title="Bu fotoğrafı beğen"]');
await bekle(700);
kontrol('Beğeni kaydedildi (POST /likes)', Boolean(bul('POST', '/rest/v1/likes')));

// ------------------------------------------------------------- 2) YUMUŞAK SİLME
console.log('\n2) SİLME (çöpe taşıma)');
api.sifirla();
tiklaSecici(document, 'button[aria-label="İşlemler Menüsü"]');
await bekle(300);
tikla(document, 'Anıyı Sil');
await bekle(400);
tikla(document, 'Evet, Sil');
await bekle(800);

const yama = bul('PATCH', '/rest/v1/photos');
kontrol('Yumuşak silme: PATCH gönderildi', Boolean(yama));
kontrol('Gövdede deleted_at var', Boolean(yama?.govde?.deleted_at),
  yama?.govde?.deleted_at ? 'tarih işaretlendi' : 'YOK');
kontrol('Kalıcı silme (DELETE /photos) YAPILMADI', !bul('DELETE', '/rest/v1/photos'));
kontrol('Fotoğraf dosyası SİLİNMEDİ (geri alınabilir)', !bul('DELETE', '/storage/v1/'));

// ------------------------------------------------------------------- 3) QUIZ
console.log('\n3) QUIZ CEVABI');
tikla(document, 'Bizim Köşemiz');
await bekle(700);
tikla(document, 'Birbirini Tanıma Testi');
await bekle(600);
tikla(document, 'Teste Başla');
await bekle(500);

api.sifirla();
const kutular = [...document.querySelectorAll('input[type="text"]')];
yaz(window, kutular[0], 'Pizza');
yaz(window, kutular[1], 'Lahmacun');
await bekle(200);
tikla(document, 'Sonraki');
await bekle(900);

const quizIstek = bul('POST', '/rest/v1/quiz_answers');
kontrol('Quiz cevabı kaydedildi (POST /quiz_answers)', Boolean(quizIstek));
kontrol('Çakışma hedefi doğru (question_key + sender)',
  Boolean(quizIstek?.url.includes('on_conflict')),
  quizIstek ? decodeURIComponent(quizIstek.url.split('on_conflict=')[1] || '') : 'yok');
kontrol('İki cevap birden gönderildi (kendi + tahmin)', Array.isArray(quizIstek?.govde) && quizIstek.govde.length === 2,
  `${Array.isArray(quizIstek?.govde) ? quizIstek.govde.length : 0} kayıt`);

// --------------------------------------------------------------- 4) ÇÖP KUTUSU
console.log('\n4) ÇÖP KUTUSU (geri al / kalıcı sil)');
const escBas = () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
escBas();
await bekle(400);

const acButonu = [...document.querySelectorAll('button')].find(
  (buton) => (buton.textContent || '').trim() === 'Aç'
);
kontrol('Çöp kutusu "Aç" düğmesi bulundu', Boolean(acButonu));
acButonu?.click();
await bekle(900);

api.sifirla();
tikla(document, 'Geri al');
await bekle(900);
const geriAlma = bul('PATCH', '/rest/v1/photos');
kontrol('Geri alma: PATCH gönderildi', Boolean(geriAlma));
kontrol('Gövdede deleted_at = null', geriAlma?.govde?.deleted_at === null,
  JSON.stringify(geriAlma?.govde ?? {}).slice(0, 40));

api.sifirla();
const silDugmesi = [...document.querySelectorAll('button')].find(
  (buton) => (buton.textContent || '').trim() === 'Sil'
);
silDugmesi?.click();
await bekle(300);
tikla(document, 'Emin misin');
await bekle(900);

kontrol('Kalıcı silme: DELETE /photos', Boolean(bul('DELETE', '/rest/v1/photos')));
kontrol('Kalıcı silme: dosya depodan silindi', Boolean(bul('DELETE', '/storage/v1/')));

console.log('\n=== SONUÇ ===');
console.log(`  ${basarisiz === 0 ? 'TÜM KONTROLLER GEÇTİ ✅' : `${basarisiz} kontrol BAŞARISIZ ❌`}`);
api.geriAl();
process.exit(basarisiz === 0 ? 0 : 1);
