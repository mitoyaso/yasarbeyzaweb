import React, { useEffect, useState } from 'react';
import { Download, X, Share, Smartphone } from 'lucide-react';

const DISMISS_KEY = 'yasar_beyza_install_dismissed_v1';
const DISMISS_DAYS = 14;

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.navigator.standalone === true
  );
}

/**
 * "Telefonuna kur" daveti.
 * Android/Chrome'da gerçek kurulum penceresini açar, iOS Safari'de
 * (o tarayıcı böyle bir olay vermediği için) kendi yönergesini gösterir.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  // Cihaz tipi render sırasında belirlenir (effect içinde setState gerektirmez)
  const [isIos] = useState(() => /iPhone|iPad|iPod/i.test(window.navigator.userAgent || ''));

  useEffect(() => {
    if (isStandalone()) return undefined;

    // Son 14 gün içinde kapatıldıysa tekrar gösterme
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
      return undefined;
    }

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };

    const handleInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    // iOS'ta beforeinstallprompt olayı yok; kısa bir gecikmeyle yönergeyi göster
    let timer = null;
    if (isIos && !isStandalone()) {
      timer = setTimeout(() => setVisible(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      if (timer) clearTimeout(timer);
    };
  }, [isIos]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setVisible(false);
    } catch (err) {
      console.warn('Kurulum penceresi kapatılamadı:', err);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 bottom-20 sm:bottom-6 z-40 px-4 pointer-events-none">
      <div className="max-w-md mx-auto glass-panel bg-white/95 rounded-3xl p-4 shadow-2xl border border-rose-200 pointer-events-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white shrink-0 shadow-md shadow-rose-500/30">
            <Smartphone className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-rose-950 mb-0.5">
              Aşk günlüğünü telefonuna kur 💖
            </p>

            {isIos ? (
              <p className="text-[11px] sm:text-xs text-rose-700/90 leading-relaxed">
                Safari'de alttaki <Share className="w-3 h-3 inline -mt-0.5" /> <strong>Paylaş</strong>{' '}
                düğmesine bas, sonra <strong>“Ana Ekrana Ekle”</strong> seçeneğini seç.
              </p>
            ) : (
              <p className="text-[11px] sm:text-xs text-rose-700/90 leading-relaxed">
                Ana ekranına ikon eklenir, tam ekran açılır — tıpkı bir uygulama gibi.
              </p>
            )}

            <div className="flex items-center gap-2 mt-2.5">
              {!isIos && deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="py-1.5 px-3.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow-md shadow-rose-500/25 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Kur</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleDismiss}
                className="py-1.5 px-3 rounded-full text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
              >
                Şimdi değil
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Kapat"
            className="p-1 rounded-full text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
