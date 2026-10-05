// ==============================================================================
// EROS — SUNUCU TARAFI (Vercel Serverless Function)
// ==============================================================================
// GÜVENLİK: Yapay zekâ anahtarı YALNIZCA burada durur (Vercel ortam değişkeni).
// Tarayıcıya asla inmez. Bu adres yalnızca SİTENİZE GİRİŞ YAPMIŞ çiftin
// isteklerini kabul eder (Supabase oturum jetonu doğrulanır).
//
// SAĞLAYICI: deepseek (varsayılan, ücretli ama çok ucuz) veya gemini (ücretsiz
// katman). İkisi de OpenAI uyumlu olduğu için tek kod yolu kullanılır.
//
// Gerekli ortam değişkenleri (Vercel → Settings → Environment Variables):
//   DEEPSEEK_API_KEY   (deepseek için)
//   GEMINI_API_KEY     (gemini için)
//   EROS_PROVIDER      'deepseek' | 'gemini'   (varsayılan: deepseek)
//   EROS_MODEL         isteğe bağlı model adı
// ==============================================================================

const IZINLI_EPOSTALAR = (process.env.EROS_IZINLI_EPOSTALAR ||
  'yasar@sevgunlugu.com,beyza@sevgunlugu.com')
  .split(',')
  .map((eposta) => eposta.trim().toLowerCase())
  .filter(Boolean);

const SAGLAYICILAR = {
  deepseek: {
    adres: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-flash',
    anahtar: () => process.env.DEEPSEEK_API_KEY,
  },
  gemini: {
    // Google'ın OpenAI uyumlu uç noktası (ücretsiz katman buradan çalışır)
    adres: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.5-flash',
    anahtar: () => process.env.GEMINI_API_KEY,
  },
};

const SINIRLAR = {
  enFazlaMesaj: 24, // son kaç konuşma mesajı gönderilir
  enFazlaKarakter: 120000, // toplam istek boyutu üst sınırı
  enFazlaCikti: 1200, // üretilecek en fazla token
  enFazlaProfil: 60000, // profil üst sınırı
};

/**
 * Sağlayıcıya gönderilecek istek gövdesini kurar (SAF — test edilebilir).
 *
 * ÖNEMLİ: `thinking: { type: 'disabled' }`
 * DeepSeek'te düşünme modu VARSAYILAN OLARAK AÇIKTIR ve düşünme metni
 * `reasoning_content` alanında gelir. O metin ekrana basılmadığı için sohbet
 * "Eros cevap vermiyor, üç nokta kalıyor" gibi görünür. Sohbet arkadaşı için
 * düşünme modunu kapatıyoruz: hem hızlı hem ucuz, cevap anında görünür.
 */
export function erosIstekGovdesi({ model, sistem = '', mesajlar = [] }) {
  return {
    model,
    messages: [{ role: 'system', content: sistem }, ...mesajlar],
    temperature: 0.8,
    max_tokens: SINIRLAR.enFazlaCikti,
    stream: true,
    thinking: { type: 'disabled' },
  };
}

function supabaseBilgisi() {
  return {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    anon: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  };
}

/**
 * İsteği yapan kişinin gerçekten sizden biri olduğunu doğrular.
 * Supabase oturum jetonunu Supabase'e sorarak doğrular.
 */
async function kullaniciDogrula(req) {
  const baslik = req.headers.authorization || '';
  const jeton = baslik.startsWith('Bearer ') ? baslik.slice(7) : '';
  if (!jeton) return null;

  const { url, anon } = supabaseBilgisi();
  if (!url || !anon) return null;

  try {
    const cevap = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${jeton}` },
    });
    if (!cevap.ok) return null;

    const kullanici = await cevap.json();
    const eposta = String(kullanici?.email || '').toLowerCase();
    if (!IZINLI_EPOSTALAR.includes(eposta)) return null;

    return kullanici;
  } catch {
    return null;
  }
}

/**
 * Gelen mesajları doğrular ve sadeleştirir.
 */
function mesajlariHazirla(gelenMesajlar) {
  if (!Array.isArray(gelenMesajlar)) return null;

  const temiz = gelenMesajlar
    .filter((mesaj) => mesaj && typeof mesaj.icerik === 'string')
    .filter((mesaj) => mesaj.rol === 'user' || mesaj.rol === 'assistant')
    .slice(-SINIRLAR.enFazlaMesaj)
    .map((mesaj) => ({
      role: mesaj.rol,
      content: mesaj.icerik.slice(0, 8000),
    }));

  return temiz.length > 0 ? temiz : null;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ hata: 'Yalnızca POST desteklenir.' });
    return;
  }

  // 1) Bu isteği yapan gerçekten sizden biri mi?
  const kullanici = await kullaniciDogrula(req);
  if (!kullanici) {
    res.status(401).json({ hata: 'Bu özellik yalnızca siteye giriş yapan çift içindir.' });
    return;
  }

  // 2) Sağlayıcı ve anahtar hazır mı?
  const saglayiciAdi = (process.env.EROS_PROVIDER || 'deepseek').toLowerCase();
  const saglayici = SAGLAYICILAR[saglayiciAdi];

  if (!saglayici) {
    res.status(500).json({ hata: `Bilinmeyen sağlayıcı: ${saglayiciAdi}` });
    return;
  }

  const anahtar = saglayici.anahtar();
  if (!anahtar) {
    res.status(500).json({
      hata:
        `${saglayiciAdi.toUpperCase()}_API_KEY tanımlı değil. ` +
        'Vercel → Settings → Environment Variables bölümünden ekleyin.',
      kurulumGerekli: true,
    });
    return;
  }

  // 3) Mesajları hazırla
  const govde = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const mesajlar = mesajlariHazirla(govde.mesajlar);
  if (!mesajlar) {
    res.status(400).json({ hata: 'Geçerli mesaj bulunamadı.' });
    return;
  }

  const sistem = typeof govde.sistem === 'string' ? govde.sistem.slice(0, SINIRLAR.enFazlaProfil) : '';

  if (sistem.length + JSON.stringify(mesajlar).length > SINIRLAR.enFazlaKarakter) {
    res.status(413).json({ hata: 'İstek çok büyük.' });
    return;
  }

  const istekGovdesi = erosIstekGovdesi({
    model: process.env.EROS_MODEL || saglayici.model,
    sistem,
    mesajlar,
  });

  // 4) Sağlayıcıya bağlan ve cevabı olduğu gibi tarayıcıya akıt
  let cevap;
  try {
    cevap = await fetch(saglayici.adres, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anahtar}`,
      },
      body: JSON.stringify(istekGovdesi),
    });
  } catch (hata) {
    res.status(502).json({ hata: 'Yapay zekâ servisine ulaşılamadı: ' + hata.message });
    return;
  }

  if (!cevap.ok) {
    let ayrinti = '';
    try {
      ayrinti = (await cevap.text()).slice(0, 500);
    } catch {
      ayrinti = '';
    }

    const mesaj =
      cevap.status === 401 || cevap.status === 403
        ? 'API anahtarı geçersiz görünüyor.'
        : cevap.status === 402
          ? 'Bakiye yetersiz görünüyor.'
          : cevap.status === 429
            ? 'Çok hızlı istek gönderildi (ücretsiz katman sınırı olabilir). Biraz bekleyip tekrar dene.'
            : `Yapay zekâ servisi hata verdi (${cevap.status}).`;

    res.status(502).json({ hata: mesaj, ayrinti });
    return;
  }

  if (!cevap.body) {
    res.status(502).json({ hata: 'Yapay zekâ servisinden boş cevap geldi.' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    for await (const parca of cevap.body) {
      res.write(parca);
    }
  } catch (hata) {
    // Bağlantı ortasında kopabilir; sessizce bitir
    console.warn('Eros akışı kesildi:', hata.message);
  }

  res.end();
}

// Vercel: akış için gövde ayrıştırmayı sınırla
export const config = {
  api: {
    bodyParser: { sizeLimit: '512kb' },
    responseLimit: false,
  },
};
