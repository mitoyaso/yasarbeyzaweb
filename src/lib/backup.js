// ==============================================================================
// YEDEKLEME / DIŞA AKTARMA
// ==============================================================================
// İki seçenek sunulur:
//   1) Sadece veri (JSON)  — çok hızlı, metin tabanlı yedek
//   2) Tam yedek (ZIP)     — tüm veri + bütün fotoğraf dosyaları
//
// Neden önemli: anılar tek bir yerde (Supabase) duruyor. Proje silinir veya
// bozulursa her şey gider; bu özellik anıların bir kopyasını size verir.
// ==============================================================================

import { getAllDataForBackup, createPhotoSignedUrl } from './supabase';
import { createZip, textToBytes } from './zip';

const SENDER_SLUG = {
  Yaşar: 'yasar',
  Beyza: 'beyza',
};

function slugSender(name) {
  return SENDER_SLUG[name] || 'bilinmeyen';
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export function dateStamp(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dateTimeStamp(date = new Date()) {
  return `${dateStamp(date)}_${pad(date.getHours())}${pad(date.getMinutes())}`;
}

/**
 * Tarayıcıda dosya indirmeyi başlatır.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Sadece veriyi JSON olarak indirir (fotoğraf dosyaları hariç).
 */
export async function exportDataOnly() {
  const data = await getAllDataForBackup();

  const payload = {
    olusturma_zamani: new Date().toISOString(),
    surum: 1,
    aciklama: 'Yaşar & Beyza Aşk Günlüğü veri yedeği (fotoğraf dosyaları dahil değildir)',
    notlar: data.notes,
    fotograflar: data.photos,
    yorumlar: data.comments,
    begeniler: data.likes,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });

  downloadBlob(blob, `ask-gunlugu-veri-${dateStamp()}.json`);

  return {
    notes: data.notes.length,
    photos: data.photos.length,
    comments: data.comments.length,
    likes: data.likes.length,
  };
}

function buildReadme({ photoCount, missingCount, createdAt }) {
  return [
    'YAŞAR & BEYZA — SONSUZ AŞK GÜNLÜĞÜ YEDEĞİ',
    '=========================================',
    '',
    `Yedek tarihi      : ${createdAt.toLocaleString('tr-TR')}`,
    `Fotoğraf sayısı   : ${photoCount}`,
    missingCount > 0 ? `İndirilemeyen dosya: ${missingCount}` : null,
    '',
    'Bu arşivin içinde ne var?',
    '  veriler.json  → Tüm notlar, fotoğraf kayıtları, yorumlar ve beğeniler',
    '  fotograflar/  → Albümdeki tüm fotoğraf dosyaları (tam boy)',
    '',
    'Fotoğraf dosyalarının adı şu kalıptadır:',
    '  <tarih>_<kim-yükledi>_<orijinal-dosya-adi>',
    '',
    'Örnek: 2026-10-03_yasar_foto_1791055691419_tz79nt2.jpeg',
    '',
    'veriler.json içindeki "fotograflar" listesindeki "dosya" alanı,',
    'her kaydın hangi dosyaya karşılık geldiğini gösterir.',
    '',
    'Sevgilerle 💖 Yaşar ❤ Beyza',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

/**
 * Tüm veriyi ve fotoğraf dosyalarını ZIP olarak indirir.
 * @param {{onProgress?: (bilgi: {adim: string, mesaj: string, tamamlanan?: number, toplam?: number}) => void}} options
 */
export async function exportFullBackup({ onProgress } = {}) {
  const bildir = (adim, mesaj, tamamlanan, toplam) => {
    if (typeof onProgress === 'function') onProgress({ adim, mesaj, tamamlanan, toplam });
  };

  bildir('veri', 'Veriler hazırlanıyor...');
  const data = await getAllDataForBackup();

  const entries = [];
  const fileByPhotoId = new Map();
  let missingCount = 0;

  const total = data.photos.length;
  for (let index = 0; index < total; index += 1) {
    const photo = data.photos[index];
    bildir('foto', `Fotoğraflar indiriliyor (${index + 1}/${total})`, index, total);

    try {
      const signedUrl = await createPhotoSignedUrl(photo.storage_path, 900);
      if (!signedUrl) {
        missingCount += 1;
        continue;
      }

      const response = await fetch(signedUrl);
      if (!response.ok) {
        missingCount += 1;
        continue;
      }

      const buffer = await response.arrayBuffer();
      const fileName = `fotograflar/${dateStamp(new Date(photo.created_at))}_${slugSender(
        photo.uploaded_by
      )}_${photo.storage_path}`;

      entries.push({ name: fileName, data: new Uint8Array(buffer) });
      fileByPhotoId.set(photo.id, fileName);
    } catch (err) {
      console.warn('Fotoğraf yedeklenemedi:', photo.storage_path, err);
      missingCount += 1;
    }
  }

  bildir('paket', 'Yedek arşivi oluşturuluyor...');

  const createdAt = new Date();

  const veri = {
    olusturma_zamani: createdAt.toISOString(),
    surum: 1,
    notlar: data.notes,
    fotograflar: data.photos.map((photo) => ({
      ...photo,
      dosya: fileByPhotoId.get(photo.id) || null,
    })),
    yorumlar: data.comments,
    begeniler: data.likes,
  };

  entries.push({
    name: 'veriler.json',
    data: textToBytes(JSON.stringify(veri, null, 2)),
  });

  entries.push({
    name: 'OKUBENI.txt',
    data: textToBytes(
      buildReadme({ photoCount: fileByPhotoId.size, missingCount, createdAt })
    ),
  });

  const zipBytes = createZip(entries, { date: createdAt });
  const blob = new Blob([zipBytes], { type: 'application/zip' });
  const fileName = `ask-gunlugu-yedek-${dateTimeStamp(createdAt)}.zip`;

  downloadBlob(blob, fileName);
  bildir('bitti', 'Yedek indirildi 💖', total, total);

  return {
    fileName,
    bytes: zipBytes.length,
    photos: fileByPhotoId.size,
    missingCount,
    notes: data.notes.length,
    comments: data.comments.length,
    likes: data.likes.length,
  };
}
