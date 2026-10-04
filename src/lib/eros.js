// ==============================================================================
// EROS — İSTEMCİ TARAFI
// ==============================================================================
// Tarayıcıdan kendi sunucumuza (/api/eros) istek atar. Yapay zekâ anahtarı
// burada YOKTUR; yalnızca giriş yapmış kullanıcının oturum jetonu gönderilir.
// ==============================================================================

import { getCurrentSession } from './auth';
import { isSupabaseConfigured, supabase } from './supabase';
import { sseTamponuIsle } from './erosStream';
import { erosSistemPromptu, uygulamaVerisiOzetle } from './erosPersona';

export const EROS_GECMIS_ANAHTARI = 'sev_eros_sohbet_v1';

// ------------------------------------------------------------------------------
// HAFIZA (çift profili)
// ------------------------------------------------------------------------------
let profilCache = null;
let profilKontrolEdildi = false;

/**
 * Eros'un hafızasını getirir (WhatsApp dökümünden çıkarılan profil).
 * eros_memory tablosu yoksa boş döner; Eros o zaman sorular sorarak öğrenir.
 */
export async function getErosProfili() {
  if (!isSupabaseConfigured) return '';
  if (profilKontrolEdildi) return profilCache || '';

  profilKontrolEdildi = true;

  try {
    const { data, error } = await supabase
      .from('eros_memory')
      .select('baslik, icerik')
      .order('sira', { ascending: true });

    if (error) {
      // Tablo henüz yok → sorun değil
      console.warn('Eros hafızası okunamadı (tablo olmayabilir):', error.message);
      profilCache = '';
      return '';
    }

    profilCache = (data || [])
      .map((satir) => (satir.baslik ? `## ${satir.baslik}\n${satir.icerik}` : satir.icerik))
      .join('\n\n');

    return profilCache;
  } catch (hata) {
    console.warn('Eros hafızası okunamadı:', hata);
    profilCache = '';
    return '';
  }
}

export async function setErosProfili(metin) {
  // Hafıza güncellendiğinde önbelleği tazele
  profilCache = metin || '';
  profilKontrolEdildi = true;
}

// ------------------------------------------------------------------------------
// SOHBET GEÇMİŞİ (yerel)
// ------------------------------------------------------------------------------
export function gecmisiOku() {
  try {
    const ham = localStorage.getItem(EROS_GECMIS_ANAHTARI);
    const veri = ham ? JSON.parse(ham) : [];
    return Array.isArray(veri) ? veri : [];
  } catch {
    return [];
  }
}

export function gecmisiYaz(mesajlar) {
  try {
    // Yalnızca son 40 mesaj saklanır (yer kaplamasın)
    localStorage.setItem(EROS_GECMIS_ANAHTARI, JSON.stringify(mesajlar.slice(-40)));
  } catch (hata) {
    console.warn('Eros geçmişi kaydedilemedi:', hata);
  }
}

export function gecmisiTemizle() {
  try {
    localStorage.removeItem(EROS_GECMIS_ANAHTARI);
  } catch {
    /* yok say */
  }
}

// ------------------------------------------------------------------------------
// İSTEK
// ------------------------------------------------------------------------------
/**
 * Eros'a mesaj gönderir ve cevabı kelime kelime akıtır.
 *
 * @param {object} parametreler
 * @param {Array}  parametreler.gecmis       [{rol, icerik}] biçiminde önceki mesajlar
 * @param {string} parametreler.yazan        Şu an yazan kişi
 * @param {Array}  parametreler.photos       Uygulamadaki anılar (özet için)
 * @param {Array}  parametreler.notes        Uygulamadaki notlar (özet için)
 * @param {(parca: string) => void} parametreler.onParca akan metin parçası
 * @param {AbortSignal} parametreler.signal
 * @returns {Promise<string>} tamamlanmış cevap
 */
export async function erosaSor({
  gecmis = [],
  yazan = '',
  photos = [],
  notes = [],
  onParca,
  signal,
} = {}) {
  const oturum = await getCurrentSession();
  const jeton = oturum?.access_token;

  if (!jeton) {
    throw new Error('Eros ile konuşmak için siteye giriş yapmalısın.');
  }

  const profil = await getErosProfili();
  const sistem = erosSistemPromptu({
    profil,
    uygulamaVerisi: uygulamaVerisiOzetle({ photos, notes }),
    yazan,
    tarih: new Date().toISOString().slice(0, 10),
  });

  const cevap = await fetch('/api/eros', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jeton}`,
    },
    body: JSON.stringify({
      sistem,
      mesajlar: gecmis.map((mesaj) => ({
        rol: mesaj.rol === 'eros' ? 'assistant' : 'user',
        icerik: mesaj.icerik,
      })),
    }),
    signal,
  });

  if (!cevap.ok) {
    let aciklama = `Eros şu an cevap veremedi (${cevap.status}).`;
    try {
      const govde = await cevap.json();
      if (govde?.hata) aciklama = govde.hata;
    } catch {
      /* JSON değilse varsayılan mesaj kalır */
    }
    throw new Error(aciklama);
  }

  if (!cevap.body) {
    throw new Error('Eros boş cevap döndü.');
  }

  const okuyucu = cevap.body.getReader();
  const cozucu = new TextDecoder();
  let tampon = '';
  let tamMetin = '';

  for (;;) {
    const { value, done } = await okuyucu.read();
    if (done) break;

    const { kalan, olaylar } = sseTamponuIsle(tampon, cozucu.decode(value, { stream: true }));
    tampon = kalan;

    for (const olay of olaylar) {
      if (olay.tip === 'metin') {
        tamMetin += olay.metin;
        if (onParca) onParca(olay.metin);
      } else if (olay.tip === 'bitti') {
        return tamMetin;
      }
    }
  }

  return tamMetin;
}
