import React, { useState } from 'react';
import {
  notificationPermission,
  requestNotificationPermission,
  notificationsSupported,
} from '../../lib/notifications';
import { Bell, BellOff, BellRing, Loader2, Smartphone, AlertCircle } from 'lucide-react';

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.navigator.standalone === true
  );
}

/**
 * Bildirim ayarları: partner yeni bir anı/not eklediğinde haber ver.
 */
export default function NotificationSettings({ showToast }) {
  const [permission, setPermission] = useState(() => notificationPermission());
  const [busy, setBusy] = useState(false);
  const [installed] = useState(() => isStandalone());

  const supported = notificationsSupported();
  const isGranted = permission === 'granted';
  const isDenied = permission === 'denied';

  const handleEnable = async () => {
    setBusy(true);
    const result = await requestNotificationPermission();
    setPermission(result);
    setBusy(false);

    if (!showToast) return;
    if (result === 'granted') {
      showToast('Bildirimler açıldı! Yeni anılarda haber vereceğiz 🔔', 'success');
    } else if (result === 'denied') {
      showToast('Bildirim izni verilmedi. Tarayıcı ayarlarından açabilirsin.', 'info');
    } else {
      showToast('Bildirim izni sonuçlanmadı, tekrar deneyebilirsin.', 'info');
    }
  };

  return (
    <div>
      <h3 className="text-base sm:text-lg font-bold text-rose-950 font-serif mb-3 flex items-center gap-2">
        <BellRing className="w-4 h-4 text-rose-500" />
        Bildirimler
      </h3>

      <div
        className={`glass-card rounded-3xl p-5 border ${
          isGranted ? 'border-emerald-300' : 'border-rose-200/70'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isGranted ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'
            }`}
          >
            {isGranted ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-rose-950 mb-0.5">
              {supported
                ? isGranted
                  ? 'Bildirimler açık'
                  : 'Bildirimler kapalı'
                : 'Bu tarayıcı bildirimleri desteklemiyor'}
            </p>
            <p className="text-[11px] sm:text-xs text-rose-600/85 leading-relaxed">
              Partnerin yeni bir anı veya not eklediğinde, site arka planda olsa bile
              telefonunun/bilgisayarının bildirim alanından haber veririz.
            </p>
          </div>
        </div>

        {/* iPhone ve kurulmamış uygulama uyarısı */}
        {supported && !installed && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium flex items-start gap-2">
            <Smartphone className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              iPhone'da bildirimler yalnızca site <strong>ana ekrana eklendikten</strong> sonra
              çalışır. Önce kurulum davetindeki adımları tamamla.
            </span>
          </div>
        )}

        {isDenied && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              İzin daha önce reddedilmiş. Tarayıcı adres çubuğundaki kilit simgesine tıklayıp
              bildirim iznini "İzin ver" yapabilirsin.
            </span>
          </div>
        )}

        {supported && !isGranted && (
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="mt-4 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow-md shadow-rose-500/25 hover:from-rose-600 hover:to-pink-600 transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            <span>Bildirimlere izin ver</span>
          </button>
        )}
      </div>
    </div>
  );
}
