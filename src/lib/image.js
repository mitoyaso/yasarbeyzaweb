// ==============================================================================
// GÖRSEL HAZIRLAMA (tarayıcı tarafı sıkıştırma + thumbnail)
// ==============================================================================
// Neden gerekli:
//   1. KOTA: Supabase ücretsiz planı 1 GB depolama veriyor. Telefon fotoğrafları
//      3-6 MB olduğu için sıkıştırma olmadan ~200 fotoğrafta dolar.
//   2. HIZ: Galeri ana görsel yerine küçük thumbnail gösterir; sayfa çok daha
//      hızlı açılır ve aylık trafik kotası korunur.
//   3. HEIC: iPhone'un HEIC dosyaları çoğu tarayıcıda gösterilemez. Burada
//      yeniden JPEG'e kodlandığı için sorun ortadan kalkar.
// ==============================================================================

const MAX_MAIN_EDGE = 1920; // ana görselin uzun kenarı (px)
const MAIN_QUALITY = 0.85;
const MAX_THUMB_EDGE = 480;
const THUMB_QUALITY = 0.8;

export const THUMB_PREFIX = 'thumb_';

/**
 * Bir dosyanın thumbnail yolunu üretir.
 * Ayrı veritabanı sütunu gerektirmemesi için adlandırma kuralı kullanılır.
 */
export function thumbPathFor(storagePath) {
  if (!storagePath) return null;
  const slash = storagePath.lastIndexOf('/');
  if (slash === -1) return THUMB_PREFIX + storagePath;
  return storagePath.slice(0, slash + 1) + THUMB_PREFIX + storagePath.slice(slash + 1);
}

/**
 * Dosyayı çizilebilir bir kaynağa çevirir (EXIF yönü korunur).
 */
async function loadDrawable(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Desteklenmiyorsa aşağıdaki yedek yola düşülür
    }
  }

  return await new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('GORSEL_ACILAMADI'));
    };
    img.src = objectUrl;
  });
}

function drawToJpegBlob(source, maxEdge, quality) {
  const sourceWidth = source.width || source.naturalWidth;
  const sourceHeight = source.height || source.naturalHeight;

  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('SIKISTIRILAMADI'));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve({ blob, width: targetWidth, height: targetHeight });
        else reject(new Error('SIKISTIRILAMADI'));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Yükleme için ana görseli ve thumbnail'i hazırlar.
 * @returns {Promise<{main: {blob: Blob, width: number, height: number}, thumb: {blob: Blob, width: number, height: number}}>}
 */
export async function prepareImageForUpload(file) {
  let source;
  try {
    source = await loadDrawable(file);
  } catch {
    throw new Error(
      'Bu fotoğraf tarayıcın tarafından açılamadı. (iPhone HEIC dosyaları bazı tarayıcılarda desteklenmez.) ' +
        'Lütfen fotoğrafı JPG veya PNG olarak tekrar dene.'
    );
  }

  try {
    const main = await drawToJpegBlob(source, MAX_MAIN_EDGE, MAIN_QUALITY);
    const thumb = await drawToJpegBlob(source, MAX_THUMB_EDGE, THUMB_QUALITY);
    return { main, thumb };
  } finally {
    if (typeof source.close === 'function') source.close();
  }
}

/**
 * Yalnızca thumbnail üretir.
 * Eski (önizlemesi olmayan) fotoğraflara sonradan önizleme eklemek için kullanılır.
 */
export async function createThumbnailFor(blob) {
  const source = await loadDrawable(blob);
  try {
    return await drawToJpegBlob(source, MAX_THUMB_EDGE, THUMB_QUALITY);
  } finally {
    if (typeof source.close === 'function') source.close();
  }
}
