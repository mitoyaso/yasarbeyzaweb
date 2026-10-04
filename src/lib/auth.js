// ==============================================================================
// SUPABASE AUTH YARDIMCILARI
// ==============================================================================
// Giriş/çıkış işlemleri burada toplanır. Ön yüzde şifre karşılaştırması YAPILMAZ;
// şifre doğrulaması tamamen Supabase tarafında gerçekleşir.

import { supabase, isSupabaseConfigured } from './supabase';
import { emailForName, nameForEmail } from './constants';

// Supabase'in döndürdüğü hata kodlarını anlaşılır Türkçe mesajlara çevirir.
const AUTH_ERROR_MESSAGES = {
  invalid_credentials: 'Şifre hatalı. Lütfen tekrar dene. 💔',
  email_not_confirmed:
    'Bu hesap henüz onaylanmamış. Supabase panelinde (Authentication → Users) hesabı onaylaman gerekiyor.',
  user_not_found: 'Bu hesap Supabase panelinde tanımlı değil.',
  user_banned: 'Bu hesap devre dışı bırakılmış.',
  too_many_requests: 'Çok fazla deneme yapıldı. Lütfen birkaç dakika bekleyip tekrar dene.',
  over_request_rate_limit: 'Çok fazla deneme yapıldı. Lütfen birkaç dakika bekleyip tekrar dene.',
  over_email_send_rate_limit: 'Çok fazla e-posta istendi. Lütfen biraz bekle.',
  validation_failed: 'Girilen bilgiler geçersiz.',
  weak_password: 'Şifre çok zayıf. Daha güçlü bir şifre belirle.',
  session_not_found: 'Oturum bulunamadı, lütfen tekrar giriş yap.',
  refresh_token_not_found: 'Oturumun süresi dolmuş, lütfen tekrar giriş yap.',
};

/**
 * Supabase Auth hatasını kullanıcıya gösterilecek Türkçe metne çevirir.
 */
export function translateAuthError(error) {
  if (!error) return 'Bilinmeyen bir giriş hatası oluştu.';

  const code = error.code || '';
  if (AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];

  const message = String(error.message || '').toLowerCase();

  if (message.includes('invalid login credentials')) return AUTH_ERROR_MESSAGES.invalid_credentials;
  if (message.includes('email not confirmed')) return AUTH_ERROR_MESSAGES.email_not_confirmed;
  if (message.includes('rate limit') || message.includes('too many')) {
    return AUTH_ERROR_MESSAGES.too_many_requests;
  }
  if (error.status === 429) return AUTH_ERROR_MESSAGES.too_many_requests;
  if (message.includes('failed to fetch') || message.includes('networkerror')) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.';
  }

  return error.message || 'Giriş yapılamadı. Lütfen tekrar dene.';
}

/**
 * Seçilen kişi adı + şifre ile Supabase Auth'a giriş yapar.
 * Başarılı olursa oturum nesnesini döner.
 */
export async function signInWithName(name, password) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase yapılandırılmadığı için giriş yapılamıyor.');
  }

  const email = emailForName(name);
  if (!email) {
    throw new Error('Lütfen kim olduğunu seç (Yaşar veya Beyza).');
  }

  // Şifrenin başındaki/sonundaki boşluklar kullanıcı hatası olabileceği için kırpılır.
  const cleanPassword = String(password || '').trim();
  if (!cleanPassword) {
    throw new Error('Lütfen şifreni gir.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: cleanPassword,
  });

  if (error) {
    console.error('Giriş hatası:', error.message);
    throw new Error(translateAuthError(error));
  }

  // GÜVENLİK: Sadece tanımlı hesaplar (Yaşar / Beyza) girebilir.
  // Dışarıdan biri kendi hesabını açmış olsa bile burada oturumu kapatılır ve
  // veritabanı politikaları da zaten onu tanımaz.
  const signedInName = nameForEmail(data?.user?.email);
  if (!signedInName) {
    await supabase.auth.signOut();
    throw new Error(
      'Bu hesap günlüğe tanımlı değil. Yalnızca Yaşar ve Beyza\'nın hesapları giriş yapabilir.'
    );
  }

  return data.session;
}

/**
 * Oturumu kapatır.
 */
export async function signOutUser() {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn('Çıkış yapılırken uyarı oluştu:', error.message);
  }
}

/**
 * Tarayıcıda kayıtlı aktif oturumu okur (sayfa yenilendiğinde oturumu geri yükler).
 */
export async function getCurrentSession() {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Oturum okunamadı:', error.message);
      return null;
    }
    return data?.session ?? null;
  } catch (err) {
    console.error('Oturum okuma hatası:', err);
    return null;
  }
}

/**
 * Oturum değişikliklerini dinler (giriş, çıkış, token yenileme).
 * Dönen fonksiyon çağrılarak dinleme bırakılır.
 */
export function subscribeToAuthChanges(callback) {
  if (!isSupabaseConfigured) return () => {};

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ?? null);
  });

  return () => {
    if (data?.subscription?.unsubscribe) data.subscription.unsubscribe();
  };
}

/**
 * Oturumdan görünen adı ("Yaşar" / "Beyza") çıkarır.
 * Tanımlı olmayan bir hesapla giriş yapılmışsa null döner.
 */
export function displayNameFromSession(session) {
  return nameForEmail(session?.user?.email);
}

/**
 * Uygulamada Supabase Auth'un etkin olup olmadığı.
 */
export function isAuthConfigured() {
  return isSupabaseConfigured;
}
