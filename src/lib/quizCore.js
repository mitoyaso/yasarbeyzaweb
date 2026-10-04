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

export const QUIZ_QUESTIONS = [
  { id: 'q1', text: 'En sevdiğim yemek ne?' },
  { id: 'q2', text: 'Beni en çok ne mutlu eder?' },
  { id: 'q3', text: 'En sevdiğim renk hangisi?' },
  { id: 'q4', text: 'Birlikte ilk nereye gitmiştik?' },
  { id: 'q5', text: 'En çok hangi şarkıyı severim?' },
  { id: 'q6', text: 'Sabah ilk ne yaparım?' },
  { id: 'q7', text: 'Beni en çok neye güldürürsün?' },
  { id: 'q8', text: 'Hayalimdeki tatil neresi?' },
  { id: 'q9', text: 'En sevdiğim anı hangisi?' },
  { id: 'q10', text: 'Bir günümüz olsa ne yapardık?' },
];

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
export function computeQuizScore(answers) {
  const map = new Map();
  for (const row of answers || []) {
    if (!row?.question_key || !row?.sender) continue;
    map.set(`${row.question_key}|${row.sender}`, row.answer ?? '');
  }

  const get = (key, sender) => map.get(`${key}|${sender}`) ?? '';

  const perQuestion = QUIZ_QUESTIONS.map((question) => {
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
    total: QUIZ_QUESTIONS.length,
    yasarScore: perQuestion.filter((row) => row.yasarDogru).length,
    beyzaScore: perQuestion.filter((row) => row.beyzaDogru).length,
  };
}

/**
 * Bir kişinin kaç soruyu tamamladığı (hem kendi cevabı hem tahmini girilmişse).
 */
export function quizProgress(answers, sender) {
  const girilenler = new Set(
    (answers || [])
      .filter((row) => row?.sender === sender && String(row?.answer || '').trim())
      .map((row) => row.question_key)
  );

  const tamamlanan = QUIZ_QUESTIONS.filter(
    (question) => girilenler.has(selfKey(question.id)) && girilenler.has(guessKey(question.id))
  ).length;

  return { tamamlanan, toplam: QUIZ_QUESTIONS.length };
}
