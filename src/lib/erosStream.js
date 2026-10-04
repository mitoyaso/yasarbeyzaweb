// ==============================================================================
// EROS — AKIŞ (STREAM) AYRIŞTIRICI
// ==============================================================================
// Yapay zekâ cevabı kelime kelime (SSE biçiminde) gelir. Bu dosya gelen
// satırları çözer. SAF'tır → Node ile test edilebilir.
// ==============================================================================

/**
 * Tek bir SSE satırını çözer.
 * @param {string} satir
 * @returns {{tip: 'metin'|'bitti'|'bos', metin?: string}}
 */
export function sseSatiriniCoz(satir) {
  const kirpilmis = String(satir || '').trim();

  if (!kirpilmis || !kirpilmis.startsWith('data:')) return { tip: 'bos' };

  const veri = kirpilmis.slice(5).trim();
  if (veri === '[DONE]') return { tip: 'bitti' };

  try {
    const json = JSON.parse(veri);
    const parca = json?.choices?.[0]?.delta?.content;
    if (typeof parca === 'string' && parca.length > 0) {
      return { tip: 'metin', metin: parca };
    }
  } catch {
    // Bozuk/yarım JSON → yok sayılır (akış devam eder)
  }

  return { tip: 'bos' };
}

/**
 * Gelen ham metin parçasını işler; tamamlanmış satırları döndürür.
 * @param {string} tampon önceki çağrıdan kalan yarım satır
 * @param {string} yeni gelen metin
 * @returns {{kalan: string, olaylar: Array}}
 */
export function sseTamponuIsle(tampon, yeni) {
  const birlesik = `${tampon}${yeni}`;
  const satirlar = birlesik.split('\n');
  const kalan = satirlar.pop() || '';
  const olaylar = [];

  for (const satir of satirlar) {
    const olay = sseSatiriniCoz(satir);
    if (olay.tip !== 'bos') olaylar.push(olay);
  }

  return { kalan, olaylar };
}
