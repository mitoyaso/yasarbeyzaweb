// ==============================================================================
// ÖN-YÜZ ÇALIŞMA (BOOT) TESTİ
// ==============================================================================
// Ne yapar: dist/ içindeki ÜRETİM derlemesini jsdom (sanal tarayıcı) içinde
// gerçekten çalıştırır ve uygulamanın ekrana çizildiğini doğrular.
//
// Neden önemli: Derlemenin başarılı olması, uygulamanın tarayıcıda açılacağını
// KANITLAMAZ. Bu test "beyaz ekran" hatalarını (modül yükleme hatası, ilk
// çizimde çökme) yakalar.
//
// Çalıştırma:  npm run test:boot     (önce: npm run build)
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const distDir = path.resolve('dist');
const htmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.log('[ATLANDI] dist/index.html yok. Önce "npm run build" çalıştırın.');
  process.exit(0);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = html.match(/<script[^>]+src="([^"]+\.js)"/);
if (!scriptMatch) {
  console.log('[HATA] index.html içinde derlenmiş JS bulunamadı.');
  process.exit(1);
}

const entryFile = path.join(distDir, scriptMatch[1].replace(/^\//, ''));

const dom = new JSDOM(html, {
  url: 'https://yasarbeyzaweb.vercel.app/',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
});

const { window } = dom;

// jsdom penceresini Node global'lerine taşı (React'in ihtiyaç duyduğu API'ler)
const globalKeys = [
  'window', 'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage',
  'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent',
  'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia',
  'DOMRect', 'SVGElement', 'Blob', 'File', 'FileReader', 'FormData', 'Headers', 'Request',
  'Response', 'screen', 'CSS', 'NodeList', 'HTMLCollection',
  // React ve tarayıcı API'leri için ek olarak gerekli olanlar:
  'MutationObserver', 'IntersectionObserver', 'ResizeObserver', 'DOMParser',
  'XMLHttpRequest', 'AbortController', 'AbortSignal', 'MessageChannel', 'MessagePort',
  'structuredClone', 'DOMTokenList', 'HTMLInputElement',
  'HTMLTextAreaElement', 'HTMLAnchorElement', 'HTMLImageElement', 'Image',
  'DocumentFragment', 'Text', 'Comment', 'Range', 'Selection', 'Storage',
];
// DİKKAT: 'queueMicrotask' ve 'performance' BİLİNÇLİ olarak listede yok —
// jsdom'un sarmalayıcıları global nesneye geri baktığı için sonsuz özyineleme
// yapıyorlar. Node'un kendi sürümleri kullanılır.

// Node'un kendi tanımladığı bazı global'ler salt-okunur olabilir (örn. navigator);
// bu yüzden defineProperty ile güvenli şekilde üzerine yazılır.
function setGlobal(key, value) {
  try {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  } catch {
    try {
      globalThis[key] = value;
    } catch {
      /* bu global atlanır */
    }
  }
}

for (const key of globalKeys) {
  if (window[key] !== undefined) setGlobal(key, window[key]);
}

setGlobal('self', window);
setGlobal('window', window);
setGlobal('document', window.document);

// jsdom'da eksik olabilecek tarayıcı API'leri için güvenli taklitler
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = () => ({
    matches: false,
    media: '',
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  globalThis.matchMedia = window.matchMedia;
}

const hatalar = [];
window.addEventListener('error', (event) => hatalar.push(String(event.message)));
process.on('unhandledRejection', (reason) => hatalar.push('Yakalanmayan söz hatası: ' + reason));

async function cizimBekle(timeoutMs = 10000) {
  const baslangic = Date.now();
  const root = window.document.getElementById('root');

  while (Date.now() - baslangic < timeoutMs) {
    if (root && root.innerHTML.trim().length > 80) return root.innerHTML;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return root ? root.innerHTML : '';
}

console.log('Ön-yüz çalışma testi başlıyor...');
console.log(`  paket: ${scriptMatch[1]}`);

let cizilen = '';
let yuklemeHatasi = null;

try {
  await import(`file://${entryFile.replace(/\\/g, '/')}`);
  cizilen = await cizimBekle();
} catch (err) {
  yuklemeHatasi = err;
  console.log('\n--- HATA YIĞINI (ilk 12 satır) ---');
  console.log(String(err.stack || err.message).split('\n').slice(0, 12).join('\n'));
  console.log('---\n');
}

console.log('\n=== SONUÇ ===');

let basarisiz = 0;
const kontrol = (ad, kosul, ek = '') => {
  if (!kosul) basarisiz += 1;
  console.log(`  ${kosul ? '[OK]  ' : '[HATA]'} ${ad}${ek ? ` — ${ek}` : ''}`);
};

kontrol('Paket hatasız yüklendi', !yuklemeHatasi, yuklemeHatasi ? String(yuklemeHatasi.message).slice(0, 120) : '');
kontrol('Uygulama ekrana çizildi (beyaz ekran yok)', cizilen.length > 80, `${cizilen.length} karakter`);

if (cizilen.length > 0) {
  kontrol('Giriş ekranı göründü', cizilen.includes('Kimsin') || cizilen.includes('Aşk Günlüğüne Giriş'));
  kontrol('Kullanıcı seçimi (Yaşar/Beyza) çizildi', cizilen.includes('Yaşar') && cizilen.includes('Beyza'));
  kontrol('Hata kalkanı devreye girmedi', !cizilen.includes('Bir aksilik oldu'));
}

if (hatalar.length > 0) {
  console.log('\n  Tarayıcı hataları:');
  for (const hata of hatalar.slice(0, 5)) console.log(`    - ${String(hata).slice(0, 140)}`);
}

console.log('');
if (basarisiz === 0) {
  console.log('SONUÇ: UYGULAMA GERÇEKTEN ÇALIŞIYOR ✅');
  process.exit(0);
} else {
  console.log(`SONUÇ: ${basarisiz} kontrol başarısız ❌`);
  if (cizilen) console.log('\nÇizilen içerik (ilk 300 karakter):\n' + cizilen.slice(0, 300));
  process.exit(1);
}
