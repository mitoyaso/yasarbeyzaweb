// ==============================================================================
// EROS — SOHBET ODALARI (ortak + kişiye özel)
// ==============================================================================
// Kayıtlar Supabase'de tutulur. ÖZEL odalar RLS ile korunur: Beyza'nın özel
// odasını Yaşar teknik olarak da sorgulayamaz (ve tersi). Ortak oda ikisine açık.
//
// eros_messages tablosu yoksa bu katman "null" döner ve arayüz yerel kayda
// (localStorage) düşer; yani özellik SQL çalıştırılmadan da çalışır.
// ==============================================================================

import { isSupabaseConfigured, supabase } from './supabase';

export const ORTAK_ODA = 'ortak';
export const OZEL_ODA = 'ozel';

/** Arayüzde gösterilecek oda bilgileri */
export const ODA_BILGISI = {
  ortak: {
    ad: 'Ortak Oda',
    aciklama: 'İkiniz de görür ve yazabilirsiniz',
    ikon: '💞',
  },
  ozel: {
    ad: 'Bana Özel',
    aciklama: 'Yalnızca sen görürsün, diğeri erişemez',
    ikon: '🔒',
  },
};

const YEREL_ANAHTAR = 'sev_eros_sohbet_v2';

/** Tablo yoksa sohbet yerel olarak saklanır (oda bazlı). */
export function yerelOku(odaTuru) {
  try {
    const ham = localStorage.getItem(`${YEREL_ANAHTAR}_${odaTuru}`);
    const veri = ham ? JSON.parse(ham) : [];
    return Array.isArray(veri) ? veri : [];
  } catch {
    return [];
  }
}

export function yerelYaz(odaTuru, mesajlar) {
  try {
    localStorage.setItem(`${YEREL_ANAHTAR}_${odaTuru}`, JSON.stringify(mesajlar.slice(-40)));
  } catch (hata) {
    console.warn('Yerel sohbet kaydedilemedi:', hata);
  }
}

export function yerelTemizle(odaTuru) {
  try {
    localStorage.removeItem(`${YEREL_ANAHTAR}_${odaTuru}`);
  } catch {
    /* yok say */
  }
}

// Ekran adı → veritabanı oda anahtarı (e-posta ön ekleriyle aynı olmalı)
const KISI_ODA = { Yaşar: 'yasar', Beyza: 'beyza' };

export function kisiOdaAnahtari(yazan) {
  return KISI_ODA[yazan] || 'yasar';
}

/** Arayüzdeki oda türünü veritabanı anahtarına çevirir. */
export function odaAnahtari(odaTuru, yazan) {
  return odaTuru === ORTAK_ODA ? ORTAK_ODA : kisiOdaAnahtari(yazan);
}

let sohbetVar = null;
let kontrolZamani = 0;

/**
 * eros_messages tablosu var mı? (Yoksa yerel kayda düşülür.)
 */
export async function sohbetKullanilabilir() {
  if (!isSupabaseConfigured) return false;
  if (sohbetVar === true) return true;
  if (sohbetVar === false && Date.now() - kontrolZamani < 60000) return false;

  try {
    const { error } = await supabase.from('eros_messages').select('id').limit(1);
    sohbetVar = !error;
  } catch {
    sohbetVar = false;
  }

  kontrolZamani = Date.now();
  return sohbetVar;
}

/**
 * Bir odanın son mesajlarını getirir (eskiden yeniye).
 * @returns {Promise<Array|null>} null → tablo yok (yerel kayıt kullanılmalı)
 */
export async function sohbetYukle(oda, adet = 60) {
  if (!isSupabaseConfigured) return null;
  if (!(await sohbetKullanilabilir())) return null;

  const { data, error } = await supabase
    .from('eros_messages')
    .select('id, gonderen, rol, icerik, created_at')
    .eq('oda', oda)
    .order('created_at', { ascending: true })
    .limit(adet);

  if (error) {
    console.warn('Sohbet yüklenemedi:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Odaya mesaj ekler.
 */
export async function sohbetMesajiEkle({ oda, gonderen, rol, icerik }) {
  if (!isSupabaseConfigured || !icerik?.trim()) return null;
  if (!(await sohbetKullanilabilir())) return null;

  const { data, error } = await supabase
    .from('eros_messages')
    .insert([{ oda, gonderen, rol, icerik: icerik.trim() }])
    .select('id, gonderen, rol, icerik, created_at')
    .limit(1);

  if (error) {
    console.warn('Mesaj kaydedilemedi:', error.message);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Bir odanın tüm mesajlarını siler.
 */
export async function sohbetTemizle(oda) {
  if (!isSupabaseConfigured) return false;
  if (!(await sohbetKullanilabilir())) return false;

  const { error } = await supabase.from('eros_messages').delete().eq('oda', oda);
  return !error;
}

/**
 * Odadaki yeni mesajları canlı dinler (ortak odada iki cihaz için).
 * @returns {() => void} dinlemeyi durduran fonksiyon
 */
export function sohbetDinle(oda, geriCagri) {
  if (!isSupabaseConfigured) return () => {};

  let kanal = null;

  try {
    kanal = supabase
      .channel(`eros-oda-${oda}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'eros_messages', filter: `oda=eq.${oda}` },
        (payload) => geriCagri?.(payload?.new)
      )
      .subscribe();
  } catch (hata) {
    console.warn('Sohbet canlı dinlenemedi:', hata);
  }

  return () => {
    if (kanal) supabase.removeChannel(kanal);
  };
}
