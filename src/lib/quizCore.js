// ==============================================================================
// BİRBİRİNİ TANIMA TESTİ — SAF MANTIK
// ==============================================================================
// Sorular, anahtar üretimi ve puanlama. Bilinçli olarak HİÇBİR ŞEY import etmez;
// böylece tarayıcı ortamına ihtiyaç duymadan (Node ile) test edilebilir.
//
// Çalışma biçimi:
//   Her soru için iki cevap saklanır:
//     "<soru>#oz"      → kişinin kendisi hakkındaki cevabı
//     "<soru>#tahmin"  → partneri için tahmini
//   Puan: tahmin, partnerin kendi cevabıyla eşleşiyorsa +1.
// ==============================================================================

export const QUIZ_SENDERS = ['Yaşar', 'Beyza'];

const SORU_HAVUZU = [
  {
    id: 'gunluk',
    kategori: 'Günlük hayat',
    sorular: [
      'Sabah uyanınca ilk ne yaparım?',
      'Yorucu bir günün sonunda en çok nasıl dinlenmeyi severim?',
      'Evde boş bir saatim olsa ne yapmayı seçerim?',
      'Gün içinde en sık içtiğim şey nedir?',
      'Bir yere geç kalınca genelde nasıl davranırım?',
      'Telefonumda en çok hangi uygulamayı kullanırım?',
      'Canım sıkkın olduğunda beni en hızlı ne neşelendirir?',
      'Uyumadan önce yapmayı alışkanlık hâline getirdiğim şey nedir?',
      'Ev işlerinden hangisini yapmayı daha çok tercih ederim?',
      'Planlı bir gün mü, spontane bir gün mü bana daha uygundur?',
    ],
  },
  {
    id: 'favoriler',
    kategori: 'Sevdiklerim',
    sorular: [
      'En sevdiğim yemek hangisidir?',
      'Tatlı olarak ilk tercihim ne olur?',
      'En sevdiğim mevsim hangisi ve neden?',
      'Bir kafede genelde ne sipariş ederim?',
      'Tekrar tekrar izlemekten sıkılmadığım film veya dizi türü nedir?',
      'Müzik açınca en çok hangi tarzı dinlerim?',
      'En sevdiğim renk hangisidir?',
      'Hediye olarak en çok ne beni mutlu eder?',
      'Dışarıdan yemek söylesek ne seçmek isterim?',
      'En sevdiğim atıştırmalık nedir?',
    ],
  },
  {
    id: 'biz',
    kategori: 'Bizim hikâyemiz',
    sorular: [
      'Birlikte yaşadığımız en komik an hangisiydi?',
      'İlk buluşmamızda en çok ne dikkatimi çekmişti?',
      'Birlikte tekrar yaşamak istediğim gün hangisi?',
      'İkimizin en iyi anlaştığı ortak aktivite nedir?',
      'Birlikte gittiğimiz yerlerden hangisini yeniden görmek isterim?',
      'Bana kendimi en çok sevildiğimi hissettiren küçük şey nedir?',
      'Birlikte yaptığımız hangi şey günlük rutinimizin parçası olsun isterim?',
      'İkimizin arasında en çok kullandığımız komik söz veya şaka nedir?',
      'Bir fotoğrafımıza bakınca en çok hangi anı hatırlarım?',
      'Birlikte başardığımız ve beni gururlandıran şey nedir?',
    ],
  },
  {
    id: 'hayaller',
    kategori: 'Hayaller',
    sorular: [
      'Birlikte gitmeyi en çok istediğim şehir veya ülke neresi?',
      'Mükemmel hafta sonumu nasıl geçirirdim?',
      'Öğrenmek istediğim yeni bir beceri var mı, ne?',
      'Bir günlüğüne istediğim yerde olabilsem nerede olurdum?',
      'Birlikte denemek istediğim yeni aktivite nedir?',
      'Hayalimdeki evde mutlaka olmasını istediğim şey nedir?',
      'Önümüzdeki yıl yapmak için en çok heyecanlandığım şey nedir?',
      'Uzun bir tatilde deniz kenarını mı, doğayı mı, şehri mi seçerim?',
      'Birlikte gerçekleştirmek istediğim küçük bir hedef nedir?',
      'Bana göre güzel bir tatilin en önemli kısmı nedir?',
    ],
  },
  {
    id: 'eglence',
    kategori: 'Eğlence',
    sorular: [
      'Bir oyun gecesinde hangi oyunu seçerim?',
      'Beni kahkahaya boğan şeyler genelde nasıl şeylerdir?',
      'Karaokede söylemeye cesaret edebileceğim şarkı hangisi olurdu?',
      'Birlikte yarışmaya girsek hangi konuda iddialı olurum?',
      'Hiç düşünmeden bir günlüğüne hangi hobiye başlardım?',
      'Bir sürpriz planında beni en çok ne heyecanlandırır?',
      'Komedi filmi mi, macera filmi mi seçerim?',
      'Bir günlüğüne görünmez olsam ilk ne yapardım?',
      'Birlikte yaparken zamanın nasıl geçtiğini anlamadığım şey nedir?',
      'Beni anlatan bir emoji seçsem hangisi olurdu?',
    ],
  },
];

function seedliRastgele(seed) {
  let state = 2166136261;
  for (const karakter of String(seed)) {
    state = Math.imul(state ^ karakter.charCodeAt(0), 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function karistir(liste, rastgele = Math.random) {
  const sonuc = [...liste];
  for (let i = sonuc.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rastgele() * (i + 1));
    [sonuc[i], sonuc[j]] = [sonuc[j], sonuc[i]];
  }
  return sonuc;
}

/** AI/API kullanmadan, her kategoriden iki soru seçerek ortak tur hazırlar. */
export function createQuizRound(previousQuestions = [], seed = null) {
  const rastgele = seed === null ? Math.random : seedliRastgele(seed);
  const oncekiSorular = new Set(
    previousQuestions.map((question) => normalizeAnswer(question?.text)).filter(Boolean)
  );

  const secilenler = SORU_HAVUZU.flatMap((kategori) => {
    const oncekiOlmayanlar = kategori.sorular.filter(
      (text) => !oncekiSorular.has(normalizeAnswer(text))
    );
    const adaylar = oncekiOlmayanlar.length >= 2 ? oncekiOlmayanlar : kategori.sorular;

    return karistir(adaylar, rastgele)
      .slice(0, 2)
      .map((text) => ({ text, kategori: kategori.kategori }));
  });

  return karistir(secilenler, rastgele).map((question, index) => ({
    id: `q${index + 1}`,
    text: question.text,
    category: question.kategori,
  }));
}

function istanbulTarihAnahtari(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function gunIndeksi(dayKey) {
  const [year, month, day] = dayKey.split('-').map(Number);
  const currentDay = Date.UTC(year, month - 1, day);
  const epochDay = Date.UTC(2020, 0, 1);
  return Math.floor((currentDay - epochDay) / 86_400_000);
}

/** Aynı Türkiye gününde aynı 10 soruyu gösterir; beş günde havuzun tamamını kullanır. */
export function createDailyQuizRound(date = new Date()) {
  const dayKey = istanbulTarihAnahtari(date);
  const dayNumber = gunIndeksi(dayKey);
  const dayInCycle = ((dayNumber % 5) + 5) % 5;
  const cycleNumber = Math.floor(dayNumber / 5);
  const chosen = SORU_HAVUZU.flatMap((category) =>
    karistir(
      category.sorular,
      seedliRastgele(`yasar-beyza-havuz-${cycleNumber}-${category.id}`)
    )
      .slice(dayInCycle * 2, dayInCycle * 2 + 2)
      .map((text) => ({ text, kategori: category.kategori }))
  );

  return {
    id: `gunluk-${dayKey}`,
    created_at: `${dayKey}T00:00:00.000Z`,
    created_by: null,
    questions: karistir(chosen, seedliRastgele(`yasar-beyza-gunluk-${dayKey}`)).map(
      (question, index) => ({
        id: `q${index + 1}`,
        text: question.text,
        category: question.kategori,
      })
    ),
  };
}

// Geriye uyumlu puanlama varsayılanı; oyun arayüzü günlük havuz turunu kullanır.
export const QUIZ_QUESTIONS = createQuizRound([], 'varsayilan-quiz-turu');

export const SELF_SUFFIX = '#oz';
export const GUESS_SUFFIX = '#tahmin';

export function selfKey(questionId) {
  return `${questionId}${SELF_SUFFIX}`;
}

export function guessKey(questionId) {
  return `${questionId}${GUESS_SUFFIX}`;
}

/**
 * Cevapları karşılaştırmak için sadeleştirir:
 * büyük/küçük harf, noktalama ve fazladan boşluk farkları önemsizdir.
 */
export function normalizeAnswer(text) {
  return String(text || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ');
}

/**
 * Cevaplardan puan tablosunu üretir.
 * @param {Array<{question_key: string, sender: string, answer: string}>} answers
 */
export function computeQuizScore(answers, questions = QUIZ_QUESTIONS) {
  const map = new Map();
  for (const row of answers || []) {
    if (!row?.question_key || !row?.sender) continue;
    map.set(`${row.question_key}|${row.sender}`, row.answer ?? '');
  }

  const get = (key, sender) => map.get(`${key}|${sender}`) ?? '';

  const perQuestion = questions.map((question) => {
    const yasarSelf = get(selfKey(question.id), 'Yaşar');
    const beyzaSelf = get(selfKey(question.id), 'Beyza');
    const yasarGuess = get(guessKey(question.id), 'Yaşar');
    const beyzaGuess = get(guessKey(question.id), 'Beyza');

    const yasarDogru = Boolean(
      yasarGuess && beyzaSelf && normalizeAnswer(yasarGuess) === normalizeAnswer(beyzaSelf)
    );
    const beyzaDogru = Boolean(
      beyzaGuess && yasarSelf && normalizeAnswer(beyzaGuess) === normalizeAnswer(yasarSelf)
    );

    return {
      id: question.id,
      text: question.text,
      yasarSelf,
      beyzaSelf,
      yasarGuess,
      beyzaGuess,
      yasarDogru,
      beyzaDogru,
    };
  });

  return {
    perQuestion,
    total: questions.length,
    yasarScore: perQuestion.filter((row) => row.yasarDogru).length,
    beyzaScore: perQuestion.filter((row) => row.beyzaDogru).length,
  };
}

/**
 * Bir kişinin kaç soruyu tamamladığı (hem kendi cevabı hem tahmini girilmişse).
 */
export function quizProgress(answers, sender, questions = QUIZ_QUESTIONS) {
  const girilenler = new Set(
    (answers || [])
      .filter((row) => row?.sender === sender && String(row?.answer || '').trim())
      .map((row) => row.question_key)
  );

  const tamamlanan = questions.filter(
    (question) => girilenler.has(selfKey(question.id)) && girilenler.has(guessKey(question.id))
  ).length;

  return { tamamlanan, toplam: questions.length };
}
