#!/usr/bin/env node
// ==============================================================================
// EROS — WHATSAPP DÖKÜMÜ İŞLEYİCİ
// ==============================================================================
// Ne yapar: eros-data/ klasöründeki WhatsApp sohbet dökümlerini (*.txt) okur ve
// Eros'un hafızasını kurmak için gerekli özetleri üretir.
//
// NEDEN: Konuşmaların tamamı (yüz binlerce kelime) yapay zekâya gönderilmez.
// Bunun yerine:
//   1. Bu betik istatistikleri ve dönem örneklerini çıkarır  (--ozet, --ornek)
//   2. Bu örneklerden yapılandırılmış bir "çift profili" yazılır
//   3. Eros her soruda yalnızca o PROFİLİ görür (küçük ve ucuz)
// Ham döküm asla dışarı çıkmaz.
//
// KULLANIM:
//   node tools/eros-import.mjs --ozet
//   node tools/eros-import.mjs --ornek 150
//   node tools/eros-import.mjs --ara "Kapadokya"
//   node tools/eros-import.mjs --test
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';

const VERI_KLASORU = path.resolve('eros-data');

// Zaman damgası: [03.10.2026, 21:15:32]  |  03.10.2026 21:15 -  |  10/3/26, 9:15 PM -
const ZAMAN_KALIBI =
  /^\[?(\d{1,2})[./](\d{1,2})[./](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?\]?\s*(?:[-–]\s*)?/;

// "Gönderen: mesaj" — gönderen adı 60 karakteri ve ':' içermez
const GONDEREN_KALIBI = /^([^:]{1,60}?):\s?([\s\S]*)$/;

// Sistem bildirimleri (bunlar sohbet sayılmaz)
const SISTEM_ISARETLERI = [
  'uçtan uca şifrelidir',
  'end-to-end encrypted',
  'mesajları ve aramaları',
  'bu mesaj silindi',
  'this message was deleted',
  'görüntü dahil edilmedi',
  'image omitted',
  'video dahil edilmedi',
  'ses dahil edilmedi',
  'audio omitted',
  'belge dahil edilmedi',
  'document omitted',
  'sticker omitted',
  'çıkartma dahil edilmedi',
  'güvenlik kodunuz değişti',
  'security code changed',
  'gruba ekledi',
  'added you',
  'kullanıcı adı',
  'değiştirdi:',
  'changed the subject',
];

const TURKCE_STOPWORD = new Set(
  `ve bir bu şu o da de ki mi mu mü ne için ile ama fakat ancak çok daha en gibi kadar
   sonra önce her hiç hep yine değil var yok olan olarak ise eğer şey şeyi bana ben sen
   seni sana onu ona biz siz onlar benim senin onun bizim sizin onların beni bizi size
   nasıl neden niye nerede kimi kim neyi hangi acaba belki artık şimdi bugün yarın dün
   tamam peki evet hayır tamam mı ya işte öyle böyle yani hani ki de ayrıca üzere göre
   başka bütün tüm bazı herkes kimse hiçbir birşey bir şey oldu olur olmuş olacak
   gel git gidiyor geliyor yapıyorum yaptım ediyorum ettim istiyorum istedim
   bilmiyorum biliyorum görüyorum gördüm diyorum dedim`
    .split(/\s+/)
    .filter(Boolean)
);

const EMOJI_KALIBI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{2764}]/gu;

// ------------------------------------------------------------------------------
// AYARLAR
// ------------------------------------------------------------------------------
function argOku(ad, varsayilan = null) {
  const i = process.argv.indexOf(ad);
  if (i === -1) return varsayilan;
  const sonraki = process.argv[i + 1];
  if (!sonraki || sonraki.startsWith('--')) return true;
  return sonraki;
}

function dosyalariBul() {
  if (!fs.existsSync(VERI_KLASORU)) return [];
  return fs
    .readdirSync(VERI_KLASORU)
    .filter((ad) => ad.toLowerCase().endsWith('.txt'))
    .map((ad) => path.join(VERI_KLASORU, ad));
}

// ------------------------------------------------------------------------------
// AYRIŞTIRMA (PARSER)
// ------------------------------------------------------------------------------
/**
 * Bir döküm metnini mesaj listesine çevirir.
 * Çok satırlı mesajlar tek mesaj olarak birleştirilir.
 */
export function dokumuAyristir(metin) {
  const satirlar = metin.split(/\r?\n/);
  const mesajlar = [];
  let aktif = null;

  // Tarih sırası (gün-önce mi ay-önce mi) dosyadan tahmin edilir
  let gunOnce = null;

  const tarihCoz = (a, b, yil) => {
    const sayi1 = Number(a);
    const sayi2 = Number(b);

    if (gunOnce === null) {
      if (sayi1 > 12) gunOnce = true;
      else if (sayi2 > 12) gunOnce = false;
    }

    const gunMuOnce = gunOnce !== false; // varsayılan: gün.ay.yıl (Türkçe)
    const gun = gunMuOnce ? sayi1 : sayi2;
    const ay = gunMuOnce ? sayi2 : sayi1;
    const tamYil = yil.length === 2 ? 2000 + Number(yil) : Number(yil);

    if (gun < 1 || gun > 31 || ay < 1 || ay > 12) return null;

    return `${String(tamYil).padStart(4, '0')}-${String(ay).padStart(2, '0')}-${String(
      gun
    ).padStart(2, '0')}`;
  };

  for (const satir of satirlar) {
    const zaman = satir.match(ZAMAN_KALIBI);

    if (zaman) {
      const kalan = satir.slice(zaman[0].length);

      // Sistem bildirimi mi?
      const kucuk = kalan.toLowerCase();
      if (SISTEM_ISARETLERI.some((isaret) => kucuk.includes(isaret))) {
        if (aktif) mesajlar.push(aktif);
        aktif = null;
        continue;
      }

      const gonderen = kalan.match(GONDEREN_KALIBI);

      if (!gonderen) {
        // Zaman damgalı ama gönderensiz → sistem mesajı
        if (aktif) mesajlar.push(aktif);
        aktif = null;
        continue;
      }

      if (aktif) mesajlar.push(aktif);

      let saat = Number(zaman[4]);
      const ampm = (zaman[7] || '').toLowerCase();
      if (ampm === 'pm' && saat < 12) saat += 12;
      if (ampm === 'am' && saat === 12) saat = 0;

      aktif = {
        tarih: tarihCoz(zaman[1], zaman[2], zaman[3]),
        saat,
        dakika: Number(zaman[5]),
        gonderen: gonderen[1].trim(),
        metin: gonderen[2],
      };
      continue;
    }

    // Devam satırı (çok satırlı mesaj)
    if (aktif && satir.trim()) {
      aktif.metin += '\n' + satir;
    }
  }

  if (aktif) mesajlar.push(aktif);

  return mesajlar.filter((m) => m.tarih && m.metin.trim());
}

// ------------------------------------------------------------------------------
// ÖZET
// ------------------------------------------------------------------------------
export function ozetCikar(mesajlar) {
  const gonderenler = {};
  const aylar = {};
  const saatler = new Array(24).fill(0);
  const kelimeler = {};
  const emojiler = {};
  let toplamKarakter = 0;
  let enUzun = null;

  for (const mesaj of mesajlar) {
    gonderenler[mesaj.gonderen] = (gonderenler[mesaj.gonderen] || 0) + 1;

    const ay = mesaj.tarih.slice(0, 7);
    aylar[ay] = (aylar[ay] || 0) + 1;

    saatler[mesaj.saat] += 1;
    toplamKarakter += mesaj.metin.length;

    if (!enUzun || mesaj.metin.length > enUzun.metin.length) enUzun = mesaj;

    for (const kelime of mesaj.metin.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (kelime.length < 3 || TURKCE_STOPWORD.has(kelime)) continue;
      kelimeler[kelime] = (kelimeler[kelime] || 0) + 1;
    }

    for (const emoji of mesaj.metin.match(EMOJI_KALIBI) || []) {
      emojiler[emoji] = (emojiler[emoji] || 0) + 1;
    }
  }

  const sirala = (nesne, adet) =>
    Object.entries(nesne)
      .sort((a, b) => b[1] - a[1])
      .slice(0, adet);

  const aylarSirali = Object.keys(aylar).sort();

  return {
    toplamMesaj: mesajlar.length,
    gonderenBasina: gonderenler,
    ilkMesaj: mesajlar[0]?.tarih || null,
    sonMesaj: mesajlar[mesajlar.length - 1]?.tarih || null,
    konusulanGunSayisi: new Set(mesajlar.map((m) => m.tarih)).size,
    aylikDagilim: aylar,
    enYogunAylar: sirala(aylar, 12),
    enYogunSaatler: saatler
      .map((adet, saat) => ({ saat, adet }))
      .sort((a, b) => b.adet - a.adet)
      .slice(0, 6),
    ortalamaMesajUzunlugu: Math.round(toplamKarakter / (mesajlar.length || 1)),
    enUzunMesaj: enUzun ? { tarih: enUzun.tarih, gonderen: enUzun.gonderen, uzunluk: enUzun.metin.length } : null,
    sikKelimeler: sirala(kelimeler, 60),
    sikEmojiler: sirala(emojiler, 25),
    tarihAraligi: aylarSirali.length ? `${aylarSirali[0]} → ${aylarSirali[aylarSirali.length - 1]}` : null,
  };
}

/**
 * Zaman çizelgesine yayılmış örnek mesajlar seçer (profil çıkarmak için).
 */
export function ornekSec(mesajlar, adet) {
  if (mesajlar.length <= adet) return mesajlar;

  const adim = mesajlar.length / adet;
  const secilen = [];
  const gorulenGun = new Set();

  for (let i = 0; i < adet; i += 1) {
    const mesaj = mesajlar[Math.floor(i * adim)];
    if (!mesaj) continue;
    // Aynı günden çok fazla örnek almayalım (çeşitlilik)
    if (gorulenGun.has(mesaj.tarih) && secilen.length > adet * 0.8) continue;
    gorulenGun.add(mesaj.tarih);
    secilen.push(mesaj);
  }

  return secilen;
}

// ------------------------------------------------------------------------------
// KOMUTLAR
// ------------------------------------------------------------------------------
function tumMesajlariYukle() {
  const dosyalar = dosyalariBul();

  if (dosyalar.length === 0) {
    console.log('\n⚠️  eros-data/ klasöründe .txt dökümü bulunamadı.');
    console.log('   Nasıl alınacağı: eros-data/OKU-BENI.md\n');
    process.exit(0);
  }

  let hepsi = [];
  for (const dosya of dosyalar) {
    const mesajlar = dokumuAyristir(fs.readFileSync(dosya, 'utf8'));
    console.log(`  ${path.basename(dosya)} → ${mesajlar.length} mesaj`);
    hepsi = hepsi.concat(mesajlar);
  }

  hepsi.sort((a, b) =>
    `${a.tarih}${String(a.saat).padStart(2, '0')}${String(a.dakika).padStart(2, '0')}`.localeCompare(
      `${b.tarih}${String(b.saat).padStart(2, '0')}${String(b.dakika).padStart(2, '0')}`
    )
  );

  return hepsi;
}

function ozetKomutu(mesajlar) {
  const ozet = ozetCikar(mesajlar);
  const hedef = path.join(VERI_KLASORU, 'ozet.json');
  fs.writeFileSync(hedef, JSON.stringify(ozet, null, 2), 'utf8');

  console.log('\n=== ÖZET ===');
  console.log(`Mesaj sayısı      : ${ozet.toplamMesaj}`);
  console.log(`Gönderenler       : ${JSON.stringify(ozet.gonderenBasina)}`);
  console.log(`Tarih aralığı     : ${ozet.ilkMesaj} → ${ozet.sonMesaj}`);
  console.log(`Konuşulan gün     : ${ozet.konusulanGunSayisi}`);
  console.log(`Ort. mesaj uzunluğu: ${ozet.ortalamaMesajUzunlugu} karakter`);
  console.log(`En yoğun aylar    : ${ozet.enYogunAylar.map(([ay, adet]) => `${ay}(${adet})`).join(', ')}`);
  console.log(`En yoğun saatler  : ${ozet.enYogunSaatler.map(({ saat, adet }) => `${saat}:00(${adet})`).join(', ')}`);
  console.log(`Sık kelimeler     : ${ozet.sikKelimeler.slice(0, 25).map(([k, a]) => `${k}(${a})`).join(', ')}`);
  console.log(`Sık emojiler      : ${ozet.sikEmojiler.slice(0, 15).map(([e, a]) => `${e}(${a})`).join(' ')}`);
  console.log(`\nKaydedildi: ${hedef}`);
}

function ornekKomutu(mesajlar, adet) {
  const ornekler = ornekSec(mesajlar, adet);
  const satirlar = ['# WhatsApp Dökümü — Dönem Örnekleri', ''];

  let sonTarih = '';
  for (const mesaj of ornekler) {
    if (mesaj.tarih !== sonTarih) {
      satirlar.push(`\n## ${mesaj.tarih}`);
      sonTarih = mesaj.tarih;
    }
    const saat = `${String(mesaj.saat).padStart(2, '0')}:${String(mesaj.dakika).padStart(2, '0')}`;
    satirlar.push(`- **${mesaj.gonderen}** (${saat}): ${mesaj.metin.replace(/\n/g, ' / ')}`);
  }

  const hedef = path.join(VERI_KLASORU, 'ornekler.md');
  fs.writeFileSync(hedef, satirlar.join('\n'), 'utf8');
  console.log(`\n${ornekler.length} örnek mesaj kaydedildi: ${hedef}`);
}

function araKomutu(mesajlar, kelime) {
  const kucuk = String(kelime).toLowerCase();
  const bulunanlar = mesajlar.filter((m) => m.metin.toLowerCase().includes(kucuk));
  console.log(`\n"${kelime}" geçen ${bulunanlar.length} mesaj:\n`);
  for (const mesaj of bulunanlar.slice(0, 40)) {
    console.log(`  [${mesaj.tarih}] ${mesaj.gonderen}: ${mesaj.metin.replace(/\n/g, ' / ').slice(0, 160)}`);
  }
}

function yardim() {
  console.log(`
EROS — WhatsApp dökümü işleyici

  node tools/eros-import.mjs --ozet          İstatistikleri çıkar (ozet.json)
  node tools/eros-import.mjs --ornek 150     Dönem örneklerini yaz (ornekler.md)
  node tools/eros-import.mjs --ara "kelime"  Belirli bir konuyu ara
  node tools/eros-import.mjs --test          Ayrıştırıcıyı sına

Dökümler eros-data/ klasörüne konur (GitHub'a gitmez).
`);
}

function test() {
  const ornek = `[03.10.2026, 21:15:32] Yaşar: Merhaba canım
[03.10.2026, 21:16:02] Beyza: Merhaba aşkım 💖
[03.10.2026, 21:17:00] Yaşar: Bugün ne yaptın?
çok satırlı
devam eden mesaj
03.10.2026 21:20 - Mesajlar ve aramalar uçtan uca şifrelidir.
10/4/26, 9:30 PM - Beyza: Iyi geceler`;

  const mesajlar = dokumuAyristir(ornek);
  const kontroller = [
    ['sistem mesajı ayıklandı', mesajlar.length === 4],
    ['çok satırlı mesaj birleşti', mesajlar[2]?.metin.includes('devam eden')],
    ['gönderen doğru', mesajlar[1]?.gonderen === 'Beyza'],
    ['emoji korundu', mesajlar[1]?.metin.includes('💖')],
    ['tarih çözüldü', mesajlar[0]?.tarih === '2026-10-03'],
    ['12 saat formatı (PM) çözüldü', mesajlar[3]?.saat === 21],
  ];

  let hata = 0;
  for (const [ad, sonuc] of kontroller) {
    if (!sonuc) hata += 1;
    console.log(`  ${sonuc ? '[OK]  ' : '[HATA]'} ${ad}`);
  }

  console.log(`\n${hata === 0 ? 'AYRIŞTIRICI ÇALIŞIYOR ✅' : `${hata} hata ❌`}`);
  process.exit(hata === 0 ? 0 : 1);
}

// ------------------------------------------------------------------------------
if (process.argv.includes('--test')) test();
else if (process.argv.includes('--yardim') || process.argv.includes('--help')) yardim();
else {
  const mesajlar = tumMesajlariYukle();
  if (process.argv.includes('--ozet')) ozetKomutu(mesajlar);
  else if (process.argv.includes('--ornek')) {
    const adet = Number(argOku('--ornek', 150)) || 150;
    ornekKomutu(mesajlar, adet);
  } else if (process.argv.includes('--ara')) araKomutu(mesajlar, argOku('--ara', ''));
  else yardim();
}
