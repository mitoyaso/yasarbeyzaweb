// ==============================================================================
// ÇÖP KUTUSU — SAF YARDIMCILAR
// ==============================================================================
// Geri alınabilir silme: kayıt gerçekten silinmez, "silindi" olarak işaretlenir.
// 30 gün içinde geri getirilebilir.
//
// Bilinçli olarak HİÇBİR ŞEY import etmez; Node ile test edilebilir.
// ==============================================================================

export const TRASH_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Çöpteki bir kaydın kaç günü kaldı (0 = süresi doldu).
 * Tarih okunamazsa tam süre kabul edilir (kaydı erken silmemek için).
 */
export function daysLeftInTrash(deletedAt, now = Date.now()) {
  if (!deletedAt) return TRASH_RETENTION_DAYS;

  const silinme = new Date(deletedAt).getTime();
  if (!Number.isFinite(silinme)) return TRASH_RETENTION_DAYS;

  const gecenGun = Math.floor((now - silinme) / DAY_MS);
  return Math.max(0, TRASH_RETENTION_DAYS - gecenGun);
}

/**
 * Çöpteki kaydın saklama süresi doldu mu?
 */
export function isTrashExpired(deletedAt, now = Date.now()) {
  if (!deletedAt) return false;
  return daysLeftInTrash(deletedAt, now) === 0;
}

/**
 * Çöp kutusu özeti: kaç kayıt var, kaçının süresi doldu.
 */
export function trashStats(items, now = Date.now()) {
  const liste = items || [];
  return {
    toplam: liste.length,
    suresiGecen: liste.filter((item) => isTrashExpired(item?.deleted_at, now)).length,
  };
}

/**
 * Kalan günü kullanıcıya gösterilecek metne çevirir.
 */
export function daysLeftLabel(deletedAt, now = Date.now()) {
  const kalan = daysLeftInTrash(deletedAt, now);
  if (kalan <= 0) return 'Süresi doldu';
  if (kalan === 1) return 'Son 1 gün';
  return `${kalan} gün kaldı`;
}

/**
 * Çöp kutusunu tarihe göre sıralar (en son silinen başta).
 */
export function sortTrash(items) {
  return [...(items || [])].sort((a, b) => {
    const aT = new Date(a?.deleted_at || 0).getTime();
    const bT = new Date(b?.deleted_at || 0).getTime();
    return bT - aT;
  });
}
