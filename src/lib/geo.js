// ==============================================================================
// ANI HARİTASI — SAF YARDIMCILAR
// ==============================================================================
// Koordinat okuma, merkez/yakınlaştırma hesabı ve etiketleme.
// Bilinçli olarak HİÇBİR ŞEY import etmez; Node ile test edilebilir.
//
// Veritabanı: photos tablosuna eklenen latitude / longitude / location_name
// sütunları (bkz. Faz 3 SQL betiği). Sütunlar yoksa bu bölüm gizlenir.
// ==============================================================================

export const TURKIYE_MERKEZ = { lat: 39.0, lng: 35.0 };

/**
 * Veritabanından gelen değeri koordinata çevirir.
 * Boş / geçersiz değerlerde null döner (0 geçerli bir koordinattır).
 */
export function toCoord(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Bu anının konumu var mı?
 */
export function hasLocation(photo) {
  return toCoord(photo?.latitude) !== null && toCoord(photo?.longitude) !== null;
}

/**
 * Konumu olan anılar.
 */
export function geotaggedPhotos(photos) {
  return (photos || []).filter(hasLocation);
}

/**
 * Konumu henüz eklenmemiş, konum eklenebilecek anılar.
 */
export function photosWithoutLocation(photos) {
  return (photos || []).filter(
    (photo) =>
      photo?.storage_path &&
      !/^(demo|local)/i.test(photo.storage_path) &&
      !hasLocation(photo)
  );
}

/**
 * Haritanın açılacağı merkez: anıların ortalaması; hiç yoksa Türkiye merkezi.
 */
export function mapCenter(photos, fallback = TURKIYE_MERKEZ) {
  const noktalar = geotaggedPhotos(photos);
  if (noktalar.length === 0) return { ...fallback };

  const toplam = noktalar.reduce(
    (acc, photo) => ({
      lat: acc.lat + toCoord(photo.latitude),
      lng: acc.lng + toCoord(photo.longitude),
    }),
    { lat: 0, lng: 0 }
  );

  return { lat: toplam.lat / noktalar.length, lng: toplam.lng / noktalar.length };
}

/**
 * Kaç anı varsa ona uygun yakınlaştırma seviyesi.
 */
export function mapZoom(photos) {
  const adet = geotaggedPhotos(photos).length;
  if (adet === 0) return 6;
  if (adet === 1) return 13;
  if (adet <= 3) return 10;
  if (adet <= 10) return 8;
  return 6;
}

/**
 * Konumun okunabilir adı: kullanıcı bir isim verdiyse o, yoksa koordinatlar.
 */
export function locationLabel(photo) {
  const isim = String(photo?.location_name || '').trim();
  if (isim) return isim;

  const lat = toCoord(photo?.latitude);
  const lng = toCoord(photo?.longitude);
  if (lat === null || lng === null) return 'Konum yok';

  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}

/**
 * Konumları isme göre gruplar (harita altındaki liste için).
 */
export function groupByLocation(photos) {
  const gruplar = new Map();

  for (const photo of geotaggedPhotos(photos)) {
    const etiket = locationLabel(photo);
    if (!gruplar.has(etiket)) gruplar.set(etiket, []);
    gruplar.get(etiket).push(photo);
  }

  return [...gruplar.entries()]
    .map(([etiket, items]) => ({ etiket, photos: items, adet: items.length }))
    .sort((a, b) => b.adet - a.adet);
}
