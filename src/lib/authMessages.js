// ==============================================================================
// HATA MESAJLARI (Türkçeleştirme)
// ==============================================================================
// Supabase'in döndürdüğü teknik hata kodlarını kullanıcıya gösterilecek
// anlaşılır Türkçe metinlere çevirir.
//
// Bu dosya bilinçli olarak HİÇBİR ŞEY import etmez: böylece tarayıcı
// ortamına ihtiyaç duymadan (Node ile test edilerek) doğrulanabilir.
// ==============================================================================

// ------------------------------------------------------------------------------
// GİRİŞ / OTURUM HATALARI
// ------------------------------------------------------------------------------
export const AUTH_ERROR_MESSAGES = {
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

const NETWORK_MESSAGE = 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.';

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
    return NETWORK_MESSAGE;
  }

  return error.message || 'Giriş yapılamadı. Lütfen tekrar dene.';
}

// ------------------------------------------------------------------------------
// İKİ ADIMLI DOĞRULAMA (2FA) HATALARI
// ------------------------------------------------------------------------------
export const MFA_ERROR_MESSAGES = {
  mfa_verification_failed: 'Kod hatalı. Uygulamadaki güncel kodu gir.',
  mfa_challenge_expired: 'Kodun süresi doldu. Yeni bir kod gir.',
  invalid_code: 'Kod hatalı. Uygulamadaki güncel kodu gir.',
  too_many_requests: 'Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar dene.',
  over_request_rate_limit: 'Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar dene.',
  insufficient_aal: 'İki adımlı doğrulama tamamlanmadı. Lütfen kodu tekrar gir.',
};

export const MFA_DISABLED_MESSAGE =
  'İki adımlı doğrulama Supabase panelinde KAPALI. ' +
  'Authentication → Multi-Factor Auth bölümünden TOTP seçeneğini etkinleştirip tekrar dene.';

export function translateMfaError(error) {
  if (!error) return 'İki adımlı doğrulama sırasında bilinmeyen bir hata oluştu.';

  const code = error.code || '';
  if (MFA_ERROR_MESSAGES[code]) return MFA_ERROR_MESSAGES[code];

  const message = String(error.message || '').toLowerCase();

  if (message.includes('mfa is not enabled') || message.includes('mfa_not_enabled')) {
    return MFA_DISABLED_MESSAGE;
  }
  if (message.includes('invalid') && message.includes('code')) {
    return MFA_ERROR_MESSAGES.invalid_code;
  }
  if (message.includes('expired')) return MFA_ERROR_MESSAGES.mfa_challenge_expired;
  if (message.includes('rate limit') || message.includes('too many')) {
    return MFA_ERROR_MESSAGES.too_many_requests;
  }
  if (message.includes('failed to fetch')) return NETWORK_MESSAGE;

  return error.message || 'İki adımlı doğrulama başarısız oldu.';
}
