// ==============================================================================
// CANLI AKIŞ (Supabase Realtime)
// ==============================================================================
// Amaç: Yaşar bir anı eklediğinde Beyza'nın ekranına sayfa yenilemeden düşsün.
//
// ÖNEMLİ: Bu özelliğin çalışması için tabloların Realtime yayınına eklenmiş
// olması gerekir (bkz. supabase/migrations/20261005_phase3_trash_map_realtime_quiz.sql).
// Yayın açık değilse hiçbir olay gelmez; uygulama sessizce normal çalışmaya
// devam eder, hata vermez.
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabase';

const IZLENEN_TABLOLAR = ['photos', 'notes', 'comments', 'likes'];

/**
 * Veritabanı değişikliklerini dinler.
 * @param {{onDegisim?: (bilgi: {tablo: string, olay: string, yeni: object, eski: object}) => void,
 *          onDurum?: (durum: string) => void}} options
 * @returns {() => void} dinlemeyi bırakan fonksiyon
 */
export function subscribeToLiveChanges({ onDegisim, onDurum } = {}) {
  if (!isSupabaseConfigured) return () => {};

  let channel;
  try {
    channel = supabase.channel('sev-canli-akis');

    for (const tablo of IZLENEN_TABLOLAR) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tablo },
        (payload) => {
          if (typeof onDegisim === 'function') {
            onDegisim({
              tablo,
              olay: payload.eventType,
              yeni: payload.new ?? null,
              eski: payload.old ?? null,
            });
          }
        }
      );
    }

    channel.subscribe((durum) => {
      if (typeof onDurum === 'function') onDurum(durum);
    });
  } catch (err) {
    console.warn('Canlı akış başlatılamadı:', err);
    return () => {};
  }

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (err) {
      console.warn('Canlı akış kapatılamadı:', err);
    }
  };
}
