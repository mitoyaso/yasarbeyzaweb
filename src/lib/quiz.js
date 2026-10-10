// ==============================================================================
// BİRBİRİNİ TANIMA TESTİ (QUİZ) — VERİTABANI İŞLEMLERİ
// ==============================================================================
// Sorular, anahtarlar ve puanlama quizCore.js içindedir (saf mantık, test edilir).
// Burada yalnızca Supabase okuma/yazma işlemleri bulunur.
//
// Veritabanı: public.quiz_answers (question_key, sender, answer)
// Tablo yoksa (Faz 3 SQL'i çalıştırılmadıysa) isQuizAvailable() false döner ve
// arayüz bu bölümü hiç göstermez.
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabase';

export {
  QUIZ_SENDERS,
  QUIZ_QUESTIONS,
  createQuizRound,
  SELF_SUFFIX,
  GUESS_SUFFIX,
  selfKey,
  guessKey,
  normalizeAnswer,
  computeQuizScore,
  quizProgress,
} from './quizCore.js';

/**
 * Test bölümü kullanılabilir mi? (quiz_answers tablosu var mı)
 */
export async function isQuizAvailable() {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from('quiz_answers').select('id').limit(1);
    if (error) return false;
    return true;
  } catch (err) {
    console.warn('Quiz kullanılabilirliği kontrol edilemedi:', err);
    return false;
  }
}

export async function fetchQuizAnswers() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('quiz_answers')
    .select('question_key, sender, answer');

  if (error) throw new Error('Test cevapları alınamadı: ' + error.message);
  return data || [];
}

/** AI tarafından oluşturulan son ortak soru turunu getirir. */
export async function fetchLatestQuizRound() {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('quiz_rounds')
    .select('id, questions, created_by, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Yeni tablo henüz eklenmediyse eski sabit test çalışmaya devam etsin.
    if (error.code === '42P01' || error.code === 'PGRST205') return null;
    throw new Error('Son soru turu alınamadı: ' + error.message);
  }

  if (!data || !Array.isArray(data.questions)) return null;
  return data;
}

export async function isQuizRoundsAvailable() {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('quiz_rounds').select('id').limit(1);
  return !error;
}

/** Yeni ortak soru turunu iki kişinin de görebilmesi için Supabase'e kaydeder. */
export async function saveQuizRound({ questions, createdBy }) {
  if (!isSupabaseConfigured) throw new Error('Soru turu kaydetmek için Supabase bağlantısı gerekli.');

  const { data, error } = await supabase
    .from('quiz_rounds')
    .insert({ questions, created_by: createdBy })
    .select('id, questions, created_by, created_at')
    .single();

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error('Ortak soru turları için Supabase veritabanı güncellemesi gerekiyor.');
    }
    throw new Error('Yeni soru turu kaydedilemedi: ' + error.message);
  }

  return data;
}

/**
 * Cevapları kaydeder (varsa günceller).
 */
export async function saveQuizAnswers(rows) {
  if (!isSupabaseConfigured) throw new Error('Supabase bağlı değil.');
  if (!Array.isArray(rows) || rows.length === 0) return true;

  const { error } = await supabase
    .from('quiz_answers')
    .upsert(rows, { onConflict: 'question_key,sender' });

  if (error) throw new Error('Cevaplar kaydedilemedi: ' + error.message);
  return true;
}
