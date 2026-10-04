import { useEffect } from 'react';

const SINIF = 'tam-ekran-katman';

/**
 * Tam ekran bir pencere (Eros sohbeti, sinema modu...) açıkken uygulamanın
 * üst/alt menülerini gizler.
 *
 * Neden gerekli: Telefonda klavye açıldığında sabit konumlu alt menü
 * ("Anılar / Aşk Notları / Biz") klavyenin üstüne gelip sohbet kutusunu
 * kapatıyordu. Menü gizlenince bu çakışma tamamen ortadan kalkar.
 */
export function useTamEkranKatman() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    document.body.classList.add(SINIF);
    return () => document.body.classList.remove(SINIF);
  }, []);
}
