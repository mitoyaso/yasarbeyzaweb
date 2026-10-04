// ==============================================================================
// BAŞARIMLAR VE İSTATİSTİKLER
// ==============================================================================
// Tüm hesaplamalar mevcut verilerden yapılır; ek veritabanı tablosu gerekmez.
// Saf fonksiyonlar olduğu için kolayca test edilebilir.
// ==============================================================================

// Not: uzantı bilinçli olarak yazıldı — bu dosya Node ile de (test) çalışabilsin.
import { SPECIAL_DATE } from './constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function localDayKey(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  // Ay ve gün MUTLAKA iki haneye tamamlanır; aksi hâlde metin sıralaması
  // bozulur ("2026-9-30" > "2026-10-1") ve seri hesabı yanlış çıkar.
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Verilen tarihleri yerel gün anahtarlarına çevirir (tekrarsız).
 */
export function activityDayKeys(items) {
  const keys = new Set();
  for (const item of items || []) {
    if (!item?.created_at) continue;
    const key = localDayKey(item.created_at);
    if (key) keys.add(key);
  }
  return [...keys];
}

/**
 * En uzun "üst üste gün" serisini hesaplar.
 */
export function longestDailyStreak(items) {
  const keys = activityDayKeys(items).sort();
  if (keys.length === 0) return 0;

  const toTime = (key) => {
    const [year, month, day] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };

  let best = 1;
  let current = 1;

  for (let i = 1; i < keys.length; i += 1) {
    const diff = toTime(keys[i]) - toTime(keys[i - 1]);
    if (diff === DAY_MS) {
      current += 1;
      best = Math.max(best, current);
    } else if (diff !== 0) {
      current = 1;
    }
  }

  return best;
}

/**
 * Başarımlar ve istatistik kartları için özet veri üretir.
 */
export function computeStats({ counts = {}, photos = [], notes = [] } = {}) {
  const allItems = [...photos, ...notes];

  const photosBySender = { Yaşar: 0, Beyza: 0 };
  for (const photo of photos) {
    if (photo?.uploaded_by in photosBySender) photosBySender[photo.uploaded_by] += 1;
  }

  const special = new Date(SPECIAL_DATE);
  const daysTogether = Number.isNaN(special.getTime())
    ? 0
    : Math.max(0, Math.floor((Date.now() - special.getTime()) / DAY_MS));

  const timestamps = allItems
    .map((item) => new Date(item?.created_at).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  return {
    counts: {
      photos: counts.photos ?? photos.length,
      notes: counts.notes ?? notes.length,
      comments: counts.comments ?? 0,
      likes: counts.likes ?? 0,
    },
    photosBySender,
    bothUploaded: photosBySender.Yaşar > 0 && photosBySender.Beyza > 0,
    activityDayCount: activityDayKeys(allItems).length,
    longestStreak: longestDailyStreak(allItems),
    daysTogether,
    firstMemoryAt: timestamps.length ? new Date(timestamps[0]).toISOString() : null,
    lastMemoryAt: timestamps.length ? new Date(timestamps[timestamps.length - 1]).toISOString() : null,
  };
}

// ------------------------------------------------------------------------------
// BAŞARIM TANIMLARI
// ------------------------------------------------------------------------------
export const ACHIEVEMENT_DEFINITIONS = [
  {
    id: 'first-photo',
    title: 'İlk Anı',
    description: 'İlk fotoğrafınızı albüme eklediniz',
    icon: '📸',
    target: 1,
    measure: (stats) => stats.counts.photos,
  },
  {
    id: 'photo-25',
    title: 'Anı Koleksiyoncusu',
    description: '25 fotoğraf biriktirdiniz',
    icon: '🗂️',
    target: 25,
    measure: (stats) => stats.counts.photos,
  },
  {
    id: 'photo-100',
    title: 'Albüm Ustası',
    description: '100 fotoğrafa ulaştınız',
    icon: '🏆',
    target: 100,
    measure: (stats) => stats.counts.photos,
  },
  {
    id: 'first-note',
    title: 'İlk Aşk Notu',
    description: 'Birbirinize ilk notu bıraktınız',
    icon: '💌',
    target: 1,
    measure: (stats) => stats.counts.notes,
  },
  {
    id: 'note-50',
    title: 'Mektup Yazarı',
    description: '50 aşk notu yazdınız',
    icon: '🖋️',
    target: 50,
    measure: (stats) => stats.counts.notes,
  },
  {
    id: 'comment-50',
    title: 'Sohbet Ustası',
    description: 'Fotoğraflara 50 yorum yaptınız',
    icon: '💬',
    target: 50,
    measure: (stats) => stats.counts.comments,
  },
  {
    id: 'like-100',
    title: 'Kalp Yağmuru',
    description: '100 kalp bıraktınız',
    icon: '❤️',
    target: 100,
    measure: (stats) => stats.counts.likes,
  },
  {
    id: 'both-uploaders',
    title: 'İkimiz de',
    description: 'Hem Yaşar hem Beyza fotoğraf ekledi',
    icon: '👫',
    target: 1,
    measure: (stats) => (stats.bothUploaded ? 1 : 0),
  },
  {
    id: 'streak-7',
    title: '7 Günlük Seri',
    description: '7 gün üst üste anı veya not eklendi',
    icon: '🔥',
    target: 7,
    measure: (stats) => stats.longestStreak,
  },
  {
    id: 'days-100',
    title: '100 Gün',
    description: 'Birlikte 100 günü devirdiniz',
    icon: '🌱',
    target: 100,
    measure: (stats) => stats.daysTogether,
  },
  {
    id: 'days-365',
    title: '1. Yıl',
    description: 'Birlikte tam bir yıl',
    icon: '🎉',
    target: 365,
    measure: (stats) => stats.daysTogether,
  },
];

/**
 * Başarım listesini, her birinin ilerlemesiyle birlikte döner.
 */
export function computeAchievements(stats) {
  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const rawValue = definition.measure(stats);
    const value = Math.max(0, Math.min(rawValue, definition.target));
    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      icon: definition.icon,
      target: definition.target,
      value,
      percent: Math.round((value / definition.target) * 100),
      unlocked: rawValue >= definition.target,
    };
  });
}
