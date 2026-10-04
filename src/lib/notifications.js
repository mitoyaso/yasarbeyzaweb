// ==============================================================================
// TARAYICI BİLDİRİMLERİ (Notification API)
// ==============================================================================
// Amaç: Sekme arka plandayken partnerin yeni bir anı/not eklediğini telefonun
// veya bilgisayarın bildirim alanından haber vermek.
//
// NOT: Gerçek "arka planda çalışan" bildirim (site kapalıyken) için sunucu
// tarafı bir gönderici gerekir; buradaki bildirimler site açıkken çalışır.
//
// iPhone'da bildirimler yalnızca site ANA EKRANA EKLENDİKTEN sonra çalışır.
// ==============================================================================

/**
 * Bildirim izni durumu: 'granted' | 'denied' | 'default' | 'unsupported'
 */
export function notificationPermission() {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function notificationsSupported() {
  return notificationPermission() !== 'unsupported';
}

/**
 * Kullanıcıdan bildirim izni ister.
 * @returns {Promise<'granted'|'denied'|'default'|'unsupported'>}
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.warn('Bildirim izni istenemedi:', err);
    return 'denied';
  }
}

/**
 * Bildirim gösterir.
 * Android'de sayfa içinden oluşturulan bildirimler çalışmadığı için önce
 * service worker üzerinden denenir (site kurulmuşsa hazırdır).
 * @returns {Promise<boolean>} gösterildi mi
 */
export async function showLocalNotification({ title, body, icon, tag }) {
  if (notificationPermission() !== 'granted') return false;

  const options = {
    body,
    icon,
    badge: icon,
    tag: tag || 'sev-gunlugu',
    renotify: true,
  };

  try {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker?.getRegistration) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.showNotification) {
        await registration.showNotification(title, options);
        return true;
      }
    }
  } catch (err) {
    console.warn('Service worker bildirimi gösterilemedi, sayfa bildirimi denenecek:', err);
  }

  try {
    const notification = new Notification(title, options);
    setTimeout(() => notification.close?.(), 9000);
    return true;
  } catch (err) {
    console.warn('Bildirim gösterilemedi:', err);
    return false;
  }
}

/**
 * Sekme arka planda mı? (Bildirimi yalnızca o zaman göstermek için)
 */
export function isPageHidden() {
  if (typeof document === 'undefined') return false;
  return document.visibilityState === 'hidden';
}
