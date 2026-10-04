// ==============================================================================
// SERVICE WORKER — Çevrimdışı kabuk + varlık önbelleği
// ==============================================================================
// Amaç: siteyi telefona kurulabilir (PWA) yapmak ve zayıf bağlantıda hızlı açmak.
//
// GÜVENLİK KURALI: Supabase'e giden HİÇBİR istek önbelleğe alınmaz.
// (Veriler kişiye özel ve imzalı URL'ler süreli; önbelleğe almak hem güvenlik
//  hem de tazelik açısından yanlış olur.)
// ==============================================================================

const VERSION = 'v2';
const SHELL_CACHE = `sev-shell-${VERSION}`;
const ASSET_CACHE = `sev-asset-${VERSION}`;
const FONT_CACHE = `sev-font-${VERSION}`;

// Uygulama kabuğu: internet olmasa da açılabilsin
const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch((err) => console.warn('[sw] kabuk önbelleğe alınamadı:', err))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !key.endsWith(VERSION)).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Ağ öncelikli: yeni sürüm çıkınca hemen alınsın, çevrimdışıysa önbellekten açılsın
async function networkFirstShell(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put('/index.html', response.clone());
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match('/index.html')) || (await cache.match('/')) || Response.error();
  }
}

// Önce önbellek, arkada tazele
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type !== 'opaque') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Supabase (veritabanı, auth, storage): ASLA önbelleğe alma
  if (
    url.hostname.endsWith('supabase.co') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/storage/')
  ) {
    return;
  }

  // Kendi sitemizin dosyaları
  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(networkFirstShell(request));
      return;
    }
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  // Google Fonts
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
  }
});
