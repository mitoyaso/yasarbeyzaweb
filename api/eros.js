// ==============================================================================
// EROS — SUNUCU TARAFI (Vercel Serverless Function)
// ==============================================================================
// GÜVENLİK: Yapay zekâ anahtarı YALNIZCA burada durur (Vercel ortam değişkeni).
// Tarayıcıya asla inmez. Bu adres yalnızca SİTENİZE GİRİŞ YAPMIŞ çiftin
// isteklerini kabul eder (Supabase oturum jetonu doğrulanır).
//
// SAĞLAYICI: gemini (varsayılan), deepseek veya openai. OpenAI Responses API
// için ayrı bir gövde biçimi gerekir; anahtar her durumda yalnızca sunucudadır.
//
// Gerekli ortam değişkenleri (Vercel → Settings → Environment Variables):
//   DEEPSEEK_API_KEY   (deepseek için)
//   GEMINI_API_KEY     (gemini için)
//   OPENAI_API_KEY     (openai için)
//   EROS_PROVIDER      'gemini' | 'deepseek' | 'openai' (varsayılan: gemini)
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
    // Google'ın OpenAI uyumlu uç noktası
    adres: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-3.8-flash',
    anahtar: () => process.env.GEMINI_API_KEY,
  },
  openai: {
    adres: 'https://api.openai.com/v1/responses',
    model: 'gpt-6-luna',
    anahtar: () => process.env.OPENAI_API_KEY,
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
 * Gemini düşük reasoning_effort ile çalışır. DeepSeek'te düşünme modu
 * `thinking: { type: 'disabled' }` ile kapatılır; aksi hâlde düşünme metni
 * `reasoning_content` alanında kalıp kullanıcıya görünmeyebilir.
 */
export function erosIstekGovdesi({ provider = 'gemini', model, sistem = '', mesajlar = [] }) {
  if (provider === 'openai') {
    return {
      model,
      input: [
        { role: 'developer', content: sistem },
        ...mesajlar.map(({ role, content }) => ({ role, content })),
      ],
      stream: true,
      max_output_tokens: SINIRLAR.enFazlaCikti,
      reasoning: { effort: 'low' },
    };
  }

  const govde = {
    model,
    messages: [{ role: 'system', content: sistem }, ...mesajlar],
    temperature: 0.8,
    max_tokens: SINIRLAR.enFazlaCikti,
    stream: true,
  };

  if (provider === 'gemini') {
    // Gemini 3.x düşünme seviyesini OpenAI uyumlu reasoning_effort ile alır.
    govde.reasoning_effort = 'low';
  } else {
    // DeepSeek'te kapatılmazsa cevap reasoning_content içinde kalabilir.
    govde.thinking = { type: 'disabled' };
  }

  return govde;
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
  const saglayiciAdi = (process.env.EROS_PROVIDER || 'gemini').toLowerCase();
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
  let govde;
  try {
    govde = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    res.status(400).json({ hata: 'İstek gövdesi geçerli JSON değil.' });
    return;
  }
  if (!govde || typeof govde !== 'object' || Array.isArray(govde)) {
    res.status(400).json({ hata: 'İstek gövdesi geçersiz.' });
    return;
  }

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

  const modelAdi = process.env.EROS_MODEL || saglayici.model;
  const istekGovdesi = erosIstekGovdesi({
    provider: saglayiciAdi,
    model: modelAdi,
    sistem,
    mesajlar,
  });

  // 4) Sağlayıcıya bağlan ve cevabı olduğu gibi tarayıcıya akıt
  let cevap;
  let baglantiHatasi;
  const yenidenDenenebilirDurumlar = new Set([408, 429, 500, 502, 503, 504]);
  const istekSecenekleri = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anahtar}`,
    },
    body: JSON.stringify(istekGovdesi),
  };

  // Gemini 503 yanıtları geçici kapasite sorunları olabilir. Az sayıda,
  // artan aralıklı deneme yap; geçerli anahtar/istek hatalarını yineleme.
  for (let deneme = 0; deneme < 3; deneme += 1) {
    try {
      cevap = await fetch(saglayici.adres, istekSecenekleri);
      baglantiHatasi = null;
      if (cevap.ok || !yenidenDenenebilirDurumlar.has(cevap.status) || deneme === 2) break;
      await cevap.body?.cancel().catch(() => {});
    } catch (hata) {
      cevap = null;
      baglantiHatasi = hata;
      if (deneme === 2) break;
    }

    const bekleme = 400 * (2 ** deneme) + Math.floor(Math.random() * 250);
    await new Promise((resolve) => setTimeout(resolve, bekleme));
  }

  // Gemini 3.8 Flash can remain at capacity after retries. If it does, make
  // one attempt with the stable Flash-Lite model so Eros can keep responding.
  if (cevap?.status === 503 && saglayiciAdi === 'gemini' && modelAdi === 'gemini-3.8-flash') {
    await cevap.body?.cancel().catch(() => {});
    const alternatifGovde = erosIstekGovdesi({
      provider: saglayiciAdi,
      model: 'gemini-3.5-flash-lite',
      sistem,
      mesajlar,
    });

    try {
      cevap = await fetch(saglayici.adres, {
        ...istekSecenekleri,
        body: JSON.stringify(alternatifGovde),
      });
      baglantiHatasi = null;
    } catch (hata) {
      cevap = null;
      baglantiHatasi = hata;
    }
  }

  if (!cevap && baglantiHatasi) {
    res.status(502).json({ hata: 'Yapay zekâ servisine ulaşılamadı: ' + baglantiHatasi.message });
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
          : cevap.status === 503
            ? 'Gemini şu anda yoğun (503); ana model ve hafif model denemeleri de yanıt vermedi. Biraz sonra tekrar dene.'
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
