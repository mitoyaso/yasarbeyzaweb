// ==============================================================================
// TEST ALTYAPISI (sanal tarayıcı + sahte Supabase)
// ==============================================================================
// Ön-yüz testleri bu dosyayı kullanır: derlenmiş uygulamayı jsdom içinde
// çalıştırır, istenirse giriş yapılmış gibi davranır ve Supabase çağrılarını
// sahte yanıtlarla karşılar.
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

// supabase-js oturumu bu anahtarla saklar: sb-<proje-ref>-auth-token
export const OTURUM_ANAHTARI = 'sb-vjdovvnehxiardhumezz-auth-token';

/**
 * dist/index.html ve derlenmiş paket yolunu bulur.
 */
export function paketBilgisi() {
  const distDir = path.resolve('dist');
  const htmlPath = path.join(distDir, 'index.html');

  if (!fs.existsSync(htmlPath)) return null;

  const html = fs.readFileSync(htmlPath, 'utf8');
  const eslesme = html.match(/<script[^>]+src="([^"]+\.js)"/);
  if (!eslesme) return null;

  return {
    html,
    entryYolu: eslesme[1],
    entryDosyasi: path.join(distDir, eslesme[1].replace(/^\//, '')),
  };
}

// jsdom penceresindeki tarayıcı API'lerini Node global'lerine taşır.
// DİKKAT: 'queueMicrotask' ve 'performance' bilinçli olarak listede yok —
// jsdom'un sarmalayıcıları global nesneye geri baktığı için sonsuz özyineleme
// yapıyorlar; Node'un kendi sürümleri kullanılır.
const GLOBAL_ANAHTARLAR = [
  'window', 'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage',
  'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent',
  'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia',
  'DOMRect', 'SVGElement', 'Blob', 'File', 'FileReader', 'FormData', 'Headers', 'Request',
  'Response', 'screen', 'CSS', 'NodeList', 'HTMLCollection',
  'MutationObserver', 'IntersectionObserver', 'ResizeObserver', 'DOMParser',
  'XMLHttpRequest', 'AbortController', 'AbortSignal', 'MessageChannel', 'MessagePort',
  'structuredClone', 'DOMTokenList', 'HTMLInputElement', 'HTMLTextAreaElement',
  'HTMLAnchorElement', 'HTMLImageElement', 'Image', 'DocumentFragment', 'Text',
  'Comment', 'Range', 'Selection', 'Storage',
];

function globalAyarla(anahtar, deger) {
  try {
    Object.defineProperty(globalThis, anahtar, { value: deger, configurable: true, writable: true });
  } catch {
    try {
      globalThis[anahtar] = deger;
    } catch {
      /* atlanır */
    }
  }
}

/**
 * Sanal tarayıcıyı kurar.
 */
export function tarayiciKur(html) {
  const dom = new JSDOM(html, {
    url: 'https://yasarbeyzaweb.vercel.app/',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });

  const { window } = dom;

  for (const anahtar of GLOBAL_ANAHTARLAR) {
    if (window[anahtar] !== undefined) globalAyarla(anahtar, window[anahtar]);
  }
  globalAyarla('self', window);
  globalAyarla('window', window);
  globalAyarla('document', window.document);

  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({
      matches: false,
      media: '',
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
    globalAyarla('matchMedia', window.matchMedia);
  }

  // WebSocket: Node'un kendi (undici) WebSocket'i, global Event sınıfını
  // jsdom'unkiyle değiştirdiğimiz için çakışıp çöküyor. Uygulamanın canlı akış
  // aboneliği bu testte çalışmasa da olur; bu yüzden hiçbir şey yapmayan bir
  // taklit kullanılır (bağlantı kurulmaz, olay üretilmez).
  class SahteWebSocket {
    constructor() {
      this.readyState = 0;
      this.onopen = null;
      this.onclose = null;
      this.onerror = null;
      this.onmessage = null;
    }
    addEventListener() {}
    removeEventListener() {}
    send() {}
    close() {}
  }
  globalAyarla('WebSocket', SahteWebSocket);

  // jsdom'da visualViewport yok. Klavye davranışını test edebilmek için taklit
  // eklenir: yüksekliği değiştirip 'resize' olayı tetiklenebilir.
  if (!window.visualViewport) {
    const dinleyiciler = new Map();
    const gorunurAlan = {
      height: window.innerHeight || 800,
      width: window.innerWidth || 400,
      offsetTop: 0,
      scale: 1,
      addEventListener(tip, fn) {
        if (!dinleyiciler.has(tip)) dinleyiciler.set(tip, []);
        dinleyiciler.get(tip).push(fn);
      },
      removeEventListener(tip, fn) {
        const liste = dinleyiciler.get(tip) || [];
        const yer = liste.indexOf(fn);
        if (yer >= 0) liste.splice(yer, 1);
      },
      __tetikle(tip) {
        for (const fn of dinleyiciler.get(tip) || []) fn();
      },
      /** Testten klavye simülasyonu */
      __klavye(yukseklik, kaydirma = 0) {
        gorunurAlan.height = yukseklik;
        gorunurAlan.offsetTop = kaydirma;
        gorunurAlan.__tetikle('resize');
      },
    };
    window.visualViewport = gorunurAlan;
    globalAyarla('visualViewport', gorunurAlan);
  }

  const hatalar = [];
  window.addEventListener('error', (olay) => hatalar.push(String(olay.message)));
  process.on('unhandledRejection', (sebep) => hatalar.push('Yakalanmayan söz hatası: ' + sebep));

  return { window, document: window.document, hatalar };
}

/**
 * #root içine bir şey çizilene kadar bekler.
 * @param {Document} belge hedef belge (sanal tarayıcının document nesnesi)
 */
export async function cizimBekle(belge, timeoutMs = 12000) {
  if (!belge) throw new Error('cizimBekle: belge (document) parametresi gerekli');

  const baslangic = Date.now();
  const root = belge.getElementById('root');

  while (Date.now() - baslangic < timeoutMs) {
    if (root && root.innerHTML.trim().length > 80) return root.innerHTML;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return root ? root.innerHTML : '';
}

/**
 * Kısa bir süre bekler (tıklama sonrası yeniden çizim için).
 */
export async function bekle(ms = 300) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Bir nesneyi base64url'e çevirir. Uzunluk 4'ün katından 1 fazla olursa
 * base64 çözülemez; bu yüzden gerekirse JSON'a dolgu alanı eklenir.
 */
function base64urlKodla(nesne) {
  const kopya = { ...nesne };
  let kod = Buffer.from(JSON.stringify(kopya)).toString('base64url');
  let ek = 0;

  while (kod.length % 4 === 1) {
    ek += 1;
    kopya.dolgu = 'x'.repeat(ek);
    kod = Buffer.from(JSON.stringify(kopya)).toString('base64url');
  }

  return kod;
}

/**
 * Giriş yapılmış gibi sahte bir oturum yerleştirir.
 * (Sunucu tarafında geçerli değildir; amaç yalnızca arayüzü çizdirmek.)
 */
export function sahteOturumKur(window) {
  const suresi = Math.floor(Date.now() / 1000) + 86400;

  const token = [
    base64urlKodla({ alg: 'HS256', typ: 'JWT' }),
    base64urlKodla({
      sub: 'test-kullanici',
      email: 'yasar@sevgunlugu.com',
      role: 'authenticated',
      exp: suresi,
    }),
    base64urlKodla({ imza: 'test' }),
  ].join('.');

  const oturum = {
    access_token: token,
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: suresi,
    refresh_token: 'test-refresh-token',
    user: {
      id: 'test-kullanici',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'yasar@sevgunlugu.com',
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };

  window.localStorage.setItem(OTURUM_ANAHTARI, JSON.stringify(oturum));
  return oturum;
}

/**
 * Supabase çağrılarını sahte yanıtlarla karşılar ve gelen istekleri kaydeder.
 * @returns {{geriAl: () => void, istekler: Array, sifirla: () => void}}
 */
export function sahteApiKur({ fotolar = [], notlar = [], copFotolar = [], copNotlar = [] } = {}) {
  const oncekiFetch = globalThis.fetch;
  const istekler = [];

  globalThis.fetch = async (girdi, init = {}) => {
    const url = typeof girdi === 'string' ? girdi : girdi.url;
    const yontem = String(init.method || 'GET').toUpperCase();

    // İsteği kaydet (test sonrası incelenir)
    let govde = null;
    try {
      govde = typeof init.body === 'string' ? JSON.parse(init.body) : null;
    } catch {
      govde = typeof init.body === 'string' ? init.body : null;
    }
    istekler.push({ yontem, url, govde, basliklar: init.headers || {} });

    const cevap = (yanit, durum = 200, basliklar = {}) =>
      new Response(yanit === undefined ? null : JSON.stringify(yanit), {
        status: durum,
        headers: { 'content-type': 'application/json', ...basliklar },
      });

    // Sayım istekleri (HEAD) → content-range başlığı gerekir
    if (yontem === 'HEAD' && url.includes('/rest/v1/')) {
      return cevap(null, 200, { 'content-range': '0-0/3' });
    }

    // Yazma işlemleri (PATCH/POST/DELETE) → başarılı kabul edilir
    if (yontem === 'PATCH' || yontem === 'DELETE') {
      if (url.includes('/storage/v1/')) return cevap([], 200);
      return cevap([], 200);
    }

    if (url.includes('/rest/v1/photos')) {
      if (url.includes('deleted_at=not.is.null')) return cevap(copFotolar);
      if (url.includes('select=deleted_at') && !url.includes('deleted_at=')) return cevap([]);
      return cevap(fotolar);
    }

    if (url.includes('/rest/v1/notes')) {
      if (url.includes('deleted_at=not.is.null')) return cevap(copNotlar);
      if (url.includes('select=deleted_at') && !url.includes('deleted_at=')) return cevap([]);
      return cevap(notlar);
    }

    if (url.includes('/rest/v1/quiz_answers')) return cevap([]);
    if (url.includes('/rest/v1/comments') || url.includes('/rest/v1/likes')) return cevap([]);

    // İmzalı fotoğraf adresleri
    if (url.includes('/storage/v1/object/sign/')) {
      let yollar = ['test.jpg'];
      try {
        const parsed = typeof init.body === 'string' ? JSON.parse(init.body) : null;
        if (parsed?.paths) yollar = parsed.paths;
      } catch {
        /* varsayılan yol kullanılır */
      }

      return cevap(
        yollar.map((yol) => ({
          signedURL: `/object/sign/couple-photos/${yol}?token=test`,
          path: yol,
          error: null,
        }))
      );
    }

    if (url.includes('/auth/v1/')) return cevap({});
    if (url.includes('/realtime/')) return cevap({});

    return cevap([]);
  };

  return {
    geriAl: () => {
      globalThis.fetch = oncekiFetch;
    },
    istekler,
    sifirla: () => {
      istekler.length = 0;
    },
  };
}

/**
 * Metnine göre buton bulup tıklar.
 */
export function tikla(document, metin) {
  const adaylar = [...document.querySelectorAll('button, a')];
  const hedef = adaylar.find((el) => (el.textContent || '').includes(metin));
  if (!hedef) return false;
  hedef.click();
  return true;
}

/**
 * CSS seçicisine göre ilk öğeye tıklar (metinsiz butonlar için).
 */
export function tiklaSecici(document, secici) {
  const hedef = document.querySelector(secici);
  if (!hedef) return false;
  hedef.click();
  return true;
}

/**
 * React'in kontrol ettiği bir metin kutusuna yazı yazar.
 * (Doğrudan value atamak React tarafından görülmez; yerel setter kullanılır.)
 */
export function yaz(window, input, metin) {
  if (!input) return false;

  const tanimlayici = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  );

  if (tanimlayici?.set) tanimlayici.set.call(input, metin);
  else input.value = metin;

  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  return true;
}

/**
 * Sahte anı kaydı üretir (görsel alanları dahil).
 */
export function sahteFoto(no = 1) {
  return {
    id: `00000000-0000-4000-8000-00000000000${no}`,
    created_at: new Date(Date.now() - no * 86400000).toISOString(),
    url: `https://example.invalid/foto-${no}.jpg`,
    storage_path: `foto_${no}.jpg`,
    caption: `Test anısı ${no}`,
    uploaded_by: no % 2 === 0 ? 'Beyza' : 'Yaşar',
    deleted_at: null,
    latitude: null,
    longitude: null,
    location_name: null,
  };
}

export function sahteNot(no = 1) {
  return {
    id: `00000000-0000-4000-9000-00000000000${no}`,
    created_at: new Date(Date.now() - no * 3600000).toISOString(),
    sender: no % 2 === 0 ? 'Beyza' : 'Yaşar',
    content: `Test aşk notu ${no}`,
    deleted_at: null,
  };
}
