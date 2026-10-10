// ==============================================================================
// EROS — AKIŞ (STREAM) AYRIŞTIRICI
// ==============================================================================
// Yapay zekâ cevabı kelime kelime (SSE biçiminde) gelir. Bu dosya gelen
// satırları çözer. SAF'tır → Node ile test edilebilir.
// ==============================================================================

/**
 * Tek bir SSE satırını çözer.
 * @param {string} satir
 * @returns {{tip: 'metin'|'dusunce'|'bitti'|'hata'|'bos', metin?: string}}
 */
export function sseSatiriniCoz(satir) {
  const kirpilmis = String(satir || '').trim();

  if (!kirpilmis || !kirpilmis.startsWith('data:')) return { tip: 'bos' };

  const veri = kirpilmis.slice(5).trim();
  if (veri === '[DONE]') return { tip: 'bitti' };

  try {
    const json = JSON.parse(veri);

    // OpenAI Responses API'nin anlamsal SSE olayları
    if (json?.type === 'response.output_text.delta' && typeof json.delta === 'string') {
      return { tip: 'metin', metin: json.delta };
    }
    if (json?.type === 'response.completed') return { tip: 'bitti' };
    if (json?.type === 'error' || json?.type === 'response.failed') {
      return { tip: 'hata', mesaj: json.message || json.error?.message || json.response?.error?.message };
    }

    const delta = json?.choices?.[0]?.delta;

    // Asıl cevap metni
    if (typeof delta?.content === 'string' && delta.content.length > 0) {
      return { tip: 'metin', metin: delta.content };
    }

    // Düşünme modu AÇIKken metin ayrı alanda gelir (reasoning_content).
    // Bunu "cevap" saymıyoruz ama yok da saymıyoruz: arayüz "düşünüyor"
    // gösterebilsin ve akış boşa düşmesin.
    if (typeof delta?.reasoning_content === 'string' && delta.reasoning_content.length > 0) {
      return { tip: 'dusunce', metin: delta.reasoning_content };
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
