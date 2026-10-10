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
      'En sevdiğim mevsim hangisidir?',
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

// Her soru için dört hazır seçenek; arayüz ayrıca "Bunların dışında" seçeneğini ekler.
const CEVAP_SECENEKLERI = {
  gunluk: [
    ['Telefonuma bakarım', 'Kahve/çay içerim', 'Biraz daha uyurum', 'Hazırlanmaya başlarım'],
    ['Uyuyup dinlenirim', 'Film veya dizi izlerim', 'Müzik dinlerim', 'Seninle vakit geçiririm'],
    ['Telefonla oyalanırım', 'Bir şeyler izlerim', 'Kitap okur veya müzik dinlerim', 'Bir hobiyle uğraşırım'],
    ['Kahve', 'Çay', 'Su', 'Soğuk içecek'],
    ['Hızlanıp yetişmeye çalışırım', 'Sana haber veririm', 'Sakin davranırım', 'Panik yaparım'],
    ['Instagram', 'WhatsApp', 'TikTok', 'YouTube'],
    ['Sarılmak ve ilgi görmek', 'Konuşup içimi dökmek', 'Biraz yalnız kalmak', 'Sevdiğim bir şeyi yapmak'],
    ['Telefonuma bakarım', 'Bir şeyler izlerim', 'Müzik veya podcast dinlerim', 'Doğrudan uyurum'],
    ['Yemek yapmak', 'Bulaşık yıkamak', 'Evi toplamak/temizlik', 'Çamaşırla ilgilenmek'],
    ['Önceden planlı bir gün', 'Spontane bir gün', 'Duruma göre ikisi', 'Fark etmez'],
  ],
  favoriler: [
    ['Pizza', 'Makarna', 'Mantı', 'Kebap/döner'],
    ['Çikolatalı tatlı', 'Sütlü tatlı', 'Baklava/şerbetli tatlı', 'Dondurma'],
    ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'],
    ['Kahve', 'Çay', 'Soğuk kahve/limonata', 'Tatlı'],
    ['Komedi', 'Romantik', 'Aksiyon/macera', 'Bilim kurgu/fantastik'],
    ['Pop', 'Rap', 'Rock', 'Slow/akustik'],
    ['Pembe', 'Mavi', 'Siyah', 'Yeşil'],
    ['Birlikte geçirilen zaman', 'Düşünülmüş kişisel bir hediye', 'Çiçek', 'Tatlı/romantik bir sürpriz'],
    ['Pizza', 'Burger', 'Döner', 'Makarna'],
    ['Çikolata', 'Cips', 'Kuruyemiş', 'Meyve'],
  ],
  biz: [
    ['Yolculukta yaşanan bir aksilik', 'İlk buluşmadaki heyecan', 'Komik bir söz/lakap', 'Ters giden bir plana gülmemiz'],
    ['Gülüşün', 'Konuşma tarzın', 'Giyimin/tarzın', 'Heyecanın/tavrın'],
    ['İlk buluşmamız', 'Birlikte çıktığımız gezi', 'Özel bir günümüz', 'Sıradan ama güzel bir gün'],
    ['Film/dizi izlemek', 'Birlikte gezmek', 'Yemek/kahve yapmak', 'Oyun oynamak'],
    ['Kafe/restoran', 'Sahil', 'Doğa/park', 'Şehir gezisi'],
    ['Sarılmak', 'Güzel sözler söylemek', 'Yardım edip destek olmak', 'Birlikte zaman geçirmek'],
    ['Günlük mesajlaşmak', 'Birlikte kahve/yemek', 'Akşam sohbeti', 'Yürüyüş yapmak'],
    ['Bir lakap', 'Komik bir replik', 'Bir yanlış anlaşılma', 'Yaşadığımız komik bir olay'],
    ['İlk fotoğrafımız', 'Birlikte gittiğimiz gezi', 'Özel bir kutlama', 'Günlük bir an'],
    ['Bir hedefi tamamlamak', 'Zor bir dönemi birlikte aşmak', 'Bir planı hayata geçirmek', 'Birbirimize destek olmak'],
  ],
  hayaller: [
    ['Paris', 'Roma', 'Japonya', 'Kapadokya'],
    ['Evde dinlenmek', 'Bir yerlere gezmeye gitmek', 'Film/dizi keyfi yapmak', 'Aile/arkadaşlarla vakit geçirmek'],
    ['Yabancı dil', 'Bir enstrüman', 'Yemek/pasta yapmak', 'Fotoğrafçılık'],
    ['Deniz kenarı', 'Doğada bir yer', 'Büyük bir şehir', 'Evde sevdiğim ortam'],
    ['Kamp yapmak', 'Konser/festivale gitmek', 'Dans etmek', 'Doğa yürüyüşü yapmak'],
    ['Bahçe/balkon', 'Geniş bir mutfak', 'Kitaplık/kütüphane', 'Sinema/oyun odası'],
    ['Birlikte tatile çıkmak', 'Yeni bir yer keşfetmek', 'Yeni bir hobiye başlamak', 'Ortak bir hedefi tamamlamak'],
    ['Deniz kenarı', 'Doğa', 'Şehir', 'Kar tatili'],
    ['Yeni bir yer görmek', 'Birlikte birikim yapmak', 'Güzel bir alışkanlık edinmek', 'Bir hobi/projeye başlamak'],
    ['Dinlenmek', 'Yeni yerler keşfetmek', 'Güzel yemekler', 'Seninle vakit geçirmek'],
  ],
  eglence: [
    ['Kart oyunu', 'Kutu oyunu', 'Video oyunu', 'Bilgi yarışması'],
    ['Absürt mizah', 'Komik videolar', 'Taklitler', 'İç şakalarımız'],
    ['Türkçe pop', '90’lar şarkıları', 'Slow bir şarkı', 'Rap'],
    ['Bilgi yarışması', 'Video/konsol oyunu', 'Yemek yapma', 'Spor'],
    ['Fotoğrafçılık', 'Resim/çizim', 'Dans', 'Yemek yapmak'],
    ['Birlikte yapılacak etkinlik', 'Nereye gideceğimizi bilmemek', 'Hediye', 'Güzel bir yemek'],
    ['Komedi', 'Macera', 'Romantik', 'Aksiyon'],
    ['Özgürce dolaşmak', 'Birine şaka yapmak', 'Dünyayı izlemek', 'Dinlenmek/uyumak'],
    ['Sohbet etmek', 'Film/dizi izlemek', 'Gezmek', 'Oyun oynamak'],
    ['❤️', '😂', '🥹', '✨'],
  ],
};

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

/** Aynı 50 soruyu iki kişinin de aynı sırayla görmesini sağlar. */
export function createSharedQuizRound() {
  const questions = SORU_HAVUZU.flatMap((category) =>
    category.sorular.map((text, index) => ({
      text,
      kategori: category.kategori,
      options: [...CEVAP_SECENEKLERI[category.id][index], 'Bunların dışında bir şey'],
    }))
  );
  return {
    id: 'havuz-50-secim-v2',
    created_at: null,
    created_by: null,
    questions: karistir(questions, seedliRastgele('yasar-beyza-50-soru-havuzu-v1')).map(
      (question, index) => ({
        id: `q${index + 1}`,
        text: question.text,
        category: question.kategori,
        options: question.options,
      })
    ),
  };
}

export const QUIZ_QUESTIONS = createSharedQuizRound().questions;

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
