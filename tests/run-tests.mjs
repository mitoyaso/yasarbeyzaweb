// ==============================================================================
// OTOMATİK TESTLER (bağımlılık yok, düz Node ile çalışır)
// ==============================================================================
// Çalıştırma:  node tests/run-tests.mjs
//              npm test
//
// Neden burada: başarım/seri hesapları ve yedekleme arşivi (ZIP) kritik ama
// gözle görülmeyen mantıklar. Bu dosya onları her değişiklikte otomatik doğrular.
// ==============================================================================

import { longestDailyStreak, computeStats, computeAchievements } from '../src/lib/achievements.js';
import { createZip, textToBytes, crc32 } from '../src/lib/zip.js';
import { thumbPathFor, THUMB_PREFIX } from '../src/lib/image.js';
import { notificationPermission, notificationsSupported, isPageHidden } from '../src/lib/notifications.js';

let toplamTest = 0;
let basarisiz = 0;

function kontrol(ad, gercek, beklenen) {
  toplamTest += 1;
  const ok = JSON.stringify(gercek) === JSON.stringify(beklenen);
  if (!ok) {
    basarisiz += 1;
    console.log(`  [BASARISIZ] ${ad}`);
    console.log(`              beklenen: ${JSON.stringify(beklenen)}`);
    console.log(`              gelen   : ${JSON.stringify(gercek)}`);
  } else {
    console.log(`  [OK] ${ad}`);
  }
}

function bolum(baslik) {
  console.log(`\n${baslik}`);
  console.log('-'.repeat(baslik.length));
}

// Yerel gün yardımcısı (saat 12:00 → gün kayması olmaz)
const gun = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0).toISOString();

// ==============================================================================
bolum('SERİ (üst üste gün) HESABI');
// ==============================================================================
kontrol('3 gün üst üste → 3', longestDailyStreak([{ created_at: gun(2026, 10, 1) }, { created_at: gun(2026, 10, 2) }, { created_at: gun(2026, 10, 3) }]), 3);
kontrol('kopukluk varsa en uzunu (1,2,5) → 2', longestDailyStreak([{ created_at: gun(2026, 10, 1) }, { created_at: gun(2026, 10, 2) }, { created_at: gun(2026, 10, 5) }]), 2);
kontrol('aynı gün çok kayıt → 1', longestDailyStreak([{ created_at: gun(2026, 10, 1) }, { created_at: gun(2026, 10, 1) }, { created_at: gun(2026, 10, 1) }]), 1);
kontrol('boş liste → 0', longestDailyStreak([]), 0);
kontrol('ay geçişi (30 Eyl → 2 Eki) → 3', longestDailyStreak([{ created_at: gun(2026, 9, 30) }, { created_at: gun(2026, 10, 1) }, { created_at: gun(2026, 10, 2) }]), 3);
kontrol('yıl geçişi (31 Ara → 2 Oca) → 3', longestDailyStreak([{ created_at: gun(2026, 12, 31) }, { created_at: gun(2027, 1, 1) }, { created_at: gun(2027, 1, 2) }]), 3);
kontrol('geçersiz tarih yok sayılır', longestDailyStreak([{ created_at: 'bozuk' }, { created_at: gun(2026, 10, 1) }]), 1);

// ==============================================================================
bolum('İSTATİSTİK HESABI');
// ==============================================================================
const stats = computeStats({
  counts: { photos: 10, notes: 4, comments: 7, likes: 25 },
  photos: [
    { uploaded_by: 'Yaşar', created_at: gun(2026, 10, 1) },
    { uploaded_by: 'Yaşar', created_at: gun(2026, 10, 2) },
    { uploaded_by: 'Beyza', created_at: gun(2026, 10, 3) },
  ],
  notes: [{ created_at: gun(2026, 10, 3) }],
});
kontrol('fotoğraf sayısı sayaçtan gelir', stats.counts.photos, 10);
kontrol('Yaşar fotoğraf sayısı', stats.photosBySender.Yaşar, 2);
kontrol('Beyza fotoğraf sayısı', stats.photosBySender.Beyza, 1);
kontrol('ikisi de yükledi', stats.bothUploaded, true);
kontrol('en uzun seri', stats.longestStreak, 3);
kontrol('aktivite gün sayısı', stats.activityDayCount, 3);

// ==============================================================================
bolum('BAŞARIMLAR');
// ==============================================================================
const liste = computeAchievements(stats);
const bul = (id) => liste.find((item) => item.id === id);
kontrol('toplam başarım sayısı', liste.length, 11);
kontrol('"İlk Anı" açıldı', bul('first-photo').unlocked, true);
kontrol('"Anı Koleksiyoncusu" kilitli', bul('photo-25').unlocked, false);
kontrol('"Anı Koleksiyoncusu" yüzdesi (10/25)', bul('photo-25').percent, 40);
kontrol('"Kalp Yağmuru" kilitli (25/100)', bul('like-100').unlocked, false);
kontrol('"İkimiz de" açıldı', bul('both-uploaders').unlocked, true);
kontrol('"7 Günlük Seri" kilitli (3/7)', bul('streak-7').unlocked, false);

const zengin = computeStats({
  counts: { photos: 30, notes: 60, comments: 100, likes: 100 },
  photos: [{ uploaded_by: 'Yaşar', created_at: gun(2026, 1, 1) }],
  notes: [],
});
const liste2 = computeAchievements(zengin);
kontrol('30 fotoğraf → koleksiyoncu açıldı', liste2.find((a) => a.id === 'photo-25').unlocked, true);
kontrol('30 fotoğraf → albüm ustası kilitli', liste2.find((a) => a.id === 'photo-100').unlocked, false);
kontrol('60 not → mektup yazarı açıldı', liste2.find((a) => a.id === 'note-50').unlocked, true);
kontrol('100 yorum → sohbet ustası açıldı', liste2.find((a) => a.id === 'comment-50').unlocked, true);
kontrol('100 kalp → kalp yağmuru açıldı', liste2.find((a) => a.id === 'like-100').unlocked, true);

// ==============================================================================
bolum('ÖNİZLEME (THUMBNAIL) DOSYA YOLU');
// ==============================================================================
kontrol('kök dizindeki dosya', thumbPathFor('foto_123.jpg'), 'thumb_foto_123.jpg');
kontrol('alt klasördeki dosya', thumbPathFor('album/foto_123.jpg'), 'album/thumb_foto_123.jpg');
kontrol('çok seviyeli klasör', thumbPathFor('a/b/c.jpg'), 'a/b/thumb_c.jpg');
kontrol('boş metin → null', thumbPathFor(''), null);
kontrol('null → null', thumbPathFor(null), null);
kontrol('tanımsız → null', thumbPathFor(undefined), null);
kontrol('önek sabiti', THUMB_PREFIX, 'thumb_');

// ==============================================================================
bolum('BİLDİRİM YARDIMCILARI (tarayıcı API\'si olmayan ortam)');
// ==============================================================================
// Node'da window/Notification/document yoktur; fonksiyonların çökmek yerine
// güvenli varsayılan döndürmesi gerekir.
kontrol('izin durumu → unsupported', notificationPermission(), 'unsupported');
kontrol('destek durumu → false', notificationsSupported(), false);
kontrol('sayfa gizli mi → false', isPageHidden(), false);

// ==============================================================================
bolum('ZIP (YEDEK ARŞİVİ)');
// ==============================================================================
const entries = [
  { name: 'veriler.json', data: textToBytes(JSON.stringify({ mesaj: 'Yaşar ❤ Beyza', gun: 37 })) },
  { name: 'fotograflar/not.txt', data: textToBytes('merhaba dünya ğüşiöç I') },
  { name: 'binary.bin', data: new Uint8Array([0, 1, 2, 250, 255, 128, 13, 10]) },
];

const zipBytes = createZip(entries, { date: new Date(2026, 9, 5, 14, 30, 0) });
kontrol('ZIP imzası (PK\\x03\\x04)', Array.from(zipBytes.slice(0, 4)), [80, 75, 3, 4]);

/**
 * ZIP'i bağımsız olarak geri okur (merkezi dizin + yerel başlık doğrulaması).
 * Bu, "arşiv gerçekten geçerli mi" sorusunu test eder.
 */
function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('EOCD (arşiv sonu kaydı) bulunamadı');

  const count = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const out = [];

  let pointer = centralOffset;
  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) throw new Error('merkezi dizin imzası bozuk');

    const crc = view.getUint32(pointer + 16, true);
    const size = view.getUint32(pointer + 24, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);
    const name = decoder.decode(bytes.slice(pointer + 46, pointer + 46 + nameLength));

    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('yerel başlık imzası bozuk');
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;

    out.push({ name, data: bytes.slice(dataStart, dataStart + size), crc });
    pointer += 46 + nameLength + extraLength + commentLength;
  }

  return out;
}

let okunan = null;
try {
  okunan = readZip(zipBytes);
} catch (err) {
  basarisiz += 1;
  toplamTest += 1;
  console.log(`  [BAŞARISIZ] arşiv geri okunamadı: ${err.message}`);
}

if (okunan) {
  kontrol('arşivdeki dosya sayısı', okunan.length, 3);
  kontrol('dosya adları', okunan.map((e) => e.name), [
    'veriler.json',
    'fotograflar/not.txt',
    'binary.bin',
  ]);

  const jsonEntry = okunan.find((e) => e.name === 'veriler.json');
  kontrol('JSON içeriği (Türkçe karakterler)', JSON.parse(new TextDecoder().decode(jsonEntry.data)), {
    mesaj: 'Yaşar ❤ Beyza',
    gun: 37,
  });

  const textEntry = okunan.find((e) => e.name === 'fotograflar/not.txt');
  kontrol('metin içeriği', new TextDecoder().decode(textEntry.data), 'merhaba dünya ğüşiöç I');

  const binaryEntry = okunan.find((e) => e.name === 'binary.bin');
  kontrol('binary içerik', Array.from(binaryEntry.data), [0, 1, 2, 250, 255, 128, 13, 10]);

  for (const entry of okunan) {
    kontrol(`CRC32 doğru (${entry.name})`, crc32(entry.data), entry.crc);
  }
}

kontrol('boş arşiv de geçerli', readZip(createZip([])).length, 0);

// ==============================================================================
console.log('\n' + '='.repeat(50));
if (basarisiz === 0) {
  console.log(`SONUÇ: ${toplamTest} testin tamamı geçti ✅`);
  process.exit(0);
} else {
  console.log(`SONUÇ: ${toplamTest} testten ${basarisiz} tanesi BAŞARISIZ ❌`);
  process.exit(1);
}
