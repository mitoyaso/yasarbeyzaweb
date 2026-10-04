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
import {
  translateAuthError,
  translateMfaError,
  AUTH_ERROR_MESSAGES,
  MFA_ERROR_MESSAGES,
  MFA_DISABLED_MESSAGE,
} from '../src/lib/authMessages.js';
import {
  computeQuizScore,
  quizProgress,
  normalizeAnswer,
  selfKey,
  guessKey,
  QUIZ_QUESTIONS,
} from '../src/lib/quizCore.js';
import {
  toCoord,
  hasLocation,
  geotaggedPhotos,
  photosWithoutLocation,
  mapCenter,
  mapZoom,
  locationLabel,
  groupByLocation,
  TURKIYE_MERKEZ,
} from '../src/lib/geo.js';

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
bolum('HATA MESAJLARI (kullanıcıya gösterilen Türkçe metinler)');
// ==============================================================================
kontrol('kod ile eşleşme (invalid_credentials)', translateAuthError({ code: 'invalid_credentials' }), AUTH_ERROR_MESSAGES.invalid_credentials);
kontrol('mesaj ile eşleşme (Invalid login credentials)', translateAuthError({ message: 'Invalid login credentials' }), AUTH_ERROR_MESSAGES.invalid_credentials);
kontrol('onaylanmamış hesap', translateAuthError({ message: 'Email not confirmed' }), AUTH_ERROR_MESSAGES.email_not_confirmed);
kontrol('429 durum kodu', translateAuthError({ status: 429, message: 'x' }), AUTH_ERROR_MESSAGES.too_many_requests);
kontrol('bağlantı hatası', translateAuthError({ message: 'Failed to fetch' }), 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.');
kontrol('hata yok', translateAuthError(null), 'Bilinmeyen bir giriş hatası oluştu.');
kontrol('bilinmeyen hata mesajı korunur', translateAuthError({ message: 'Beklenmeyen durum' }), 'Beklenmeyen durum');

kontrol('2FA panelde kapalı', translateMfaError({ message: 'MFA is not enabled' }), MFA_DISABLED_MESSAGE);
kontrol('2FA kod hatası', translateMfaError({ code: 'mfa_verification_failed' }), MFA_ERROR_MESSAGES.mfa_verification_failed);
kontrol('2FA kodun süresi doldu', translateMfaError({ message: 'Challenge expired' }), MFA_ERROR_MESSAGES.mfa_challenge_expired);
kontrol('2FA hata yok', translateMfaError(null), 'İki adımlı doğrulama sırasında bilinmeyen bir hata oluştu.');

// ==============================================================================
bolum('BİRBİRİNİ TANIMA TESTİ — NORMALİZASYON VE PUANLAMA');
// ==============================================================================
kontrol('büyük/küçük harf farkı yok sayılır', normalizeAnswer('PİZZA'), normalizeAnswer('pizza'));
kontrol('noktalama farkı yok sayılır', normalizeAnswer('Pizza!'), normalizeAnswer('pizza'));
kontrol('fazla boşluk sadeleşir', normalizeAnswer('  çok   güzel '), 'çok güzel');
kontrol('boş değer → boş metin', normalizeAnswer(null), '');

kontrol('kendi cevap anahtarı', selfKey('q1'), 'q1#oz');
kontrol('tahmin anahtarı', guessKey('q1'), 'q1#tahmin');

const quizSatirlari = [
  { question_key: 'q1#oz', sender: 'Beyza', answer: 'Pizza' },
  { question_key: 'q1#tahmin', sender: 'Yaşar', answer: 'pizza!' },
  { question_key: 'q1#oz', sender: 'Yaşar', answer: 'Mantı' },
  { question_key: 'q1#tahmin', sender: 'Beyza', answer: 'Kebap' },
];
const quizSkor = computeQuizScore(quizSatirlari);
kontrol('Yaşar 1 puan (normalize eşleşme)', quizSkor.yasarScore, 1);
kontrol('Beyza 0 puan (yanlış tahmin)', quizSkor.beyzaScore, 0);
kontrol('toplam soru sayısı', quizSkor.total, QUIZ_QUESTIONS.length);
kontrol('q1 Yaşar doğru', quizSkor.perQuestion[0].yasarDogru, true);
kontrol('q1 Beyza yanlış', quizSkor.perQuestion[0].beyzaDogru, false);
kontrol('cevapsız sorular yanlış sayılır', quizSkor.perQuestion[1].yasarDogru, false);

const quizKarsilikli = computeQuizScore([
  { question_key: 'q2#oz', sender: 'Beyza', answer: 'Kahve' },
  { question_key: 'q2#tahmin', sender: 'Yaşar', answer: 'kahve' },
  { question_key: 'q2#oz', sender: 'Yaşar', answer: 'Deniz' },
  { question_key: 'q2#tahmin', sender: 'Beyza', answer: 'deniz' },
]);
kontrol('karşılıklı doğru → Yaşar 1', quizKarsilikli.yasarScore, 1);
kontrol('karşılıklı doğru → Beyza 1', quizKarsilikli.beyzaScore, 1);

const quizBos = computeQuizScore([]);
kontrol('hiç cevap yoksa puan 0', quizBos.yasarScore + quizBos.beyzaScore, 0);

const quizBozuk = computeQuizScore([null, {}, { question_key: 'q1#oz' }, { sender: 'Yaşar' }]);
kontrol('bozuk satırlar çökertmez', quizBozuk.yasarScore + quizBozuk.beyzaScore, 0);

const quizIlerleme = quizProgress(
  [
    { question_key: 'q1#oz', sender: 'Yaşar', answer: 'a' },
    { question_key: 'q1#tahmin', sender: 'Yaşar', answer: 'b' },
    { question_key: 'q2#oz', sender: 'Yaşar', answer: 'c' },
    { question_key: 'q3#oz', sender: 'Beyza', answer: 'd' },
  ],
  'Yaşar'
);
kontrol('tamamlanan soru (ikisi de girilmiş)', quizIlerleme.tamamlanan, 1);
kontrol('ilerleme toplamı', quizIlerleme.toplam, 10);

const quizIlerleme2 = quizProgress(
  [
    { question_key: 'q1#oz', sender: 'Yaşar', answer: '   ' },
    { question_key: 'q1#tahmin', sender: 'Yaşar', answer: 'b' },
  ],
  'Yaşar'
);
kontrol('sadece boşluk → cevap sayılmaz', quizIlerleme2.tamamlanan, 0);

// ==============================================================================
bolum('ANI HARİTASI — KONUM YARDIMCILARI');
// ==============================================================================
kontrol('toCoord: sayı', toCoord(41.0082), 41.0082);
kontrol('toCoord: metin sayı', toCoord('29.0'), 29);
kontrol('toCoord: sıfır geçerli koordinat', toCoord(0), 0);
kontrol('toCoord: boş metin → null', toCoord(''), null);
kontrol('toCoord: null → null', toCoord(null), null);
kontrol('toCoord: geçersiz → null', toCoord('abc'), null);

const haritaFotolar = [
  { id: '1', storage_path: 'a.jpg', latitude: 41.0, longitude: 29.0, location_name: 'İstanbul' },
  { id: '2', storage_path: 'b.jpg', latitude: 38.6, longitude: 34.8, location_name: '' },
  { id: '3', storage_path: 'c.jpg', latitude: null, longitude: null },
  { id: '4', storage_path: 'demo-1.jpg', latitude: 40.0, longitude: 30.0 },
];

kontrol('konumu olan anı sayısı', geotaggedPhotos(haritaFotolar).length, 3);
kontrol('konum bekleyen anılar (demo hariç)', photosWithoutLocation(haritaFotolar).map((p) => p.id), ['3']);
kontrol('hasLocation: konumlu', hasLocation(haritaFotolar[0]), true);
kontrol('hasLocation: konumsuz', hasLocation(haritaFotolar[2]), false);

const haritaMerkez = mapCenter(haritaFotolar);
kontrol('merkez = koordinatların ortalaması', Number(haritaMerkez.lat.toFixed(3)), Number(((41 + 38.6 + 40) / 3).toFixed(3)));
kontrol('konum yoksa Türkiye merkezi', mapCenter([{ id: 'x' }]), TURKIYE_MERKEZ);

kontrol('yakınlaştırma: konum yok → 6', mapZoom([]), 6);
kontrol('yakınlaştırma: tek anı → 13', mapZoom([haritaFotolar[0]]), 13);
kontrol('yakınlaştırma: çok anı → geniş', mapZoom(haritaFotolar), 10);

kontrol('etiket: yer adı varsa onu kullanır', locationLabel(haritaFotolar[0]), 'İstanbul');
kontrol('etiket: ad yoksa koordinat yazar', locationLabel(haritaFotolar[1]), '38.600, 34.800');
kontrol('etiket: konum yoksa', locationLabel({ id: 'z' }), 'Konum yok');

const haritaGruplar = groupByLocation(haritaFotolar);
kontrol('konum grubu sayısı', haritaGruplar.length, 3);
kontrol('grup etiketleri', haritaGruplar.map((g) => g.etiket), ['İstanbul', '38.600, 34.800', '40.000, 30.000']);

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
