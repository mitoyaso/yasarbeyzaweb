// ==============================================================================
// MİNİMAL ZIP ÜRETİCİ (bağımlılık yok)
// ==============================================================================
// Neden kendi yazdık: yedekleme için harici bir kütüphane eklemek istemedik.
// ZIP'in "store" (sıkıştırmasız) yöntemi kullanılır — yedek dosyaları zaten
// JPEG olduğu için sıkıştırma kazancı yok denecek kadar azdır.
//
// Tarayıcıdan bağımsızdır: saf Uint8Array üzerinde çalışır, bu yüzden Node ile
// de test edilebilir. Tarayıcıda Blob içine sarılır.
// ==============================================================================

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date) {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    (Math.floor(date.getSeconds() / 2) & 0x1f);
  const dosDate =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { time: time & 0xffff, dosDate: dosDate & 0xffff };
}

/**
 * ZIP arşivi oluşturur (store yöntemi).
 * @param {Array<{name: string, data: Uint8Array}>} entries
 * @returns {Uint8Array}
 */
export function createZip(entries, options = {}) {
  const now = options.date instanceof Date ? options.date : new Date();
  const { time, dosDate } = toDosDateTime(now);
  const encoder = new TextEncoder();

  const localChunks = [];
  const centralRecords = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
    const checksum = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // yerel başlık imzası
    lv.setUint16(4, 20, true); // gereken sürüm
    lv.setUint16(6, 0x0800, true); // UTF-8 dosya adı bayrağı
    lv.setUint16(8, 0, true); // yöntem: 0 = store
    lv.setUint16(10, time, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, checksum, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // ek alan yok
    local.set(nameBytes, 30);

    localChunks.push(local, data);
    centralRecords.push({ nameBytes, checksum, size: data.length, offset });
    offset += local.length + data.length;
  }

  const centralChunks = [];
  let centralSize = 0;

  for (const record of centralRecords) {
    const rec = new Uint8Array(46 + record.nameBytes.length);
    const v = new DataView(rec.buffer);
    v.setUint32(0, 0x02014b50, true); // merkezi dizin imzası
    v.setUint16(4, 20, true); // üreten sürüm
    v.setUint16(6, 20, true); // gereken sürüm
    v.setUint16(8, 0x0800, true); // UTF-8 bayrağı
    v.setUint16(10, 0, true); // store
    v.setUint16(12, time, true);
    v.setUint16(14, dosDate, true);
    v.setUint32(16, record.checksum, true);
    v.setUint32(20, record.size, true);
    v.setUint32(24, record.size, true);
    v.setUint16(28, record.nameBytes.length, true);
    v.setUint32(42, record.offset, true); // yerel başlığın konumu
    rec.set(record.nameBytes, 46);

    centralChunks.push(rec);
    centralSize += rec.length;
  }

  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); // EOCD imzası
  ev.setUint16(8, centralRecords.length, true);
  ev.setUint16(10, centralRecords.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const total = offset + centralSize + end.length;
  const output = new Uint8Array(total);

  let position = 0;
  for (const chunk of localChunks) {
    output.set(chunk, position);
    position += chunk.length;
  }
  for (const chunk of centralChunks) {
    output.set(chunk, position);
    position += chunk.length;
  }
  output.set(end, position);

  return output;
}

/**
 * Metni UTF-8 bayt dizisine çevirir (arşive metin dosyası eklemek için).
 */
export function textToBytes(text) {
  return new TextEncoder().encode(text);
}
