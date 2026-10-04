// ==============================================================================
// İKİ ADIMLI DOĞRULAMA (2FA / TOTP) YARDIMCILARI
// ==============================================================================
// Google Authenticator, Authy, Microsoft Authenticator gibi uygulamalarla
// çalışan 6 haneli kod tabanlı ikinci adım.
//
// ÖNEMLİ: Bu özelliğin çalışması için Supabase panelinde etkinleştirilmesi
// gerekir:  Authentication -> Multi-Factor Auth -> TOTP
// Etkin değilken uygulama hata vermez, yalnızca "kapalı" bilgisini gösterir.
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabase';

const MFA_ERROR_MESSAGES = {
  mfa_verification_failed: 'Kod hatalı. Uygulamadaki güncel kodu gir.',
  mfa_challenge_expired: 'Kodun süresi doldu. Yeni bir kod gir.',
  invalid_code: 'Kod hatalı. Uygulamadaki güncel kodu gir.',
  too_many_requests: 'Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar dene.',
  over_request_rate_limit: 'Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar dene.',
  insufficient_aal: 'İki adımlı doğrulama tamamlanmadı. Lütfen kodu tekrar gir.',
};

/**
 * Supabase'in MFA hatasını anlaşılır Türkçe metne çevirir.
 */
export function translateMfaError(error) {
  if (!error) return 'İki adımlı doğrulama sırasında bilinmeyen bir hata oluştu.';

  const code = error.code || '';
  if (MFA_ERROR_MESSAGES[code]) return MFA_ERROR_MESSAGES[code];

  const message = String(error.message || '').toLowerCase();

  if (message.includes('mfa is not enabled') || message.includes('mfa_not_enabled')) {
    return (
      'İki adımlı doğrulama Supabase panelinde KAPALI. ' +
      'Authentication → Multi-Factor Auth bölümünden TOTP seçeneğini etkinleştirip tekrar dene.'
    );
  }
  if (message.includes('invalid') && message.includes('code')) {
    return MFA_ERROR_MESSAGES.invalid_code;
  }
  if (message.includes('expired')) return MFA_ERROR_MESSAGES.mfa_challenge_expired;
  if (message.includes('rate limit') || message.includes('too many')) {
    return MFA_ERROR_MESSAGES.too_many_requests;
  }
  if (message.includes('failed to fetch')) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.';
  }

  return error.message || 'İki adımlı doğrulama başarısız oldu.';
}

/**
 * Oturumun doğrulama seviyesi (aal1 = sadece şifre, aal2 = şifre + kod).
 */
export async function getAssuranceLevel() {
  const fallback = { currentLevel: 'aal1', nextLevel: 'aal1' };
  if (!isSupabaseConfigured) return fallback;

  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
      console.warn('Doğrulama seviyesi okunamadı:', error.message);
      return fallback;
    }
    return {
      currentLevel: data?.currentLevel ?? 'aal1',
      nextLevel: data?.nextLevel ?? 'aal1',
    };
  } catch (err) {
    console.warn('Doğrulama seviyesi hatası:', err);
    return fallback;
  }
}

/**
 * Bu oturum için ikinci adım (kod) gerekiyor mu?
 */
export async function isMfaChallengeRequired() {
  const { currentLevel, nextLevel } = await getAssuranceLevel();
  return currentLevel === 'aal1' && nextLevel === 'aal2';
}

/**
 * Kullanıcının doğrulanmış TOTP faktörlerini döner.
 */
export async function listVerifiedTotpFactors() {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      console.warn('2FA faktörleri okunamadı:', error.message);
      return [];
    }
    const totp = data?.totp ?? [];
    return totp.filter((factor) => factor.status === 'verified');
  } catch (err) {
    console.warn('2FA faktör listesi hatası:', err);
    return [];
  }
}

/**
 * Kurulumu yarıda kalmış (doğrulanmamış) faktörleri temizler.
 * Aynı isimle yeni kurulum yapılabilmesi için gereklidir.
 */
export async function removeUnverifiedFactors() {
  if (!isSupabaseConfigured) return;

  try {
    const { data } = await supabase.auth.mfa.listFactors();
    const all = [...(data?.totp ?? []), ...(data?.all ?? [])];
    const unverified = all.filter((factor) => factor.status !== 'verified');

    for (const factor of unverified) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id }).catch(() => {});
    }
  } catch (err) {
    console.warn('Doğrulanmamış 2FA faktörleri temizlenemedi:', err);
  }
}

/**
 * Yeni TOTP kurulumu başlatır.
 * @returns {Promise<{id: string, secret: string, qrCode: string, uri: string}>}
 */
export async function startTotpEnrollment(friendlyName = 'Sev-Ask-Gunlugu') {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase yapılandırılmadığı için 2FA kurulamıyor.');
  }

  // Önceki yarım kalmış denemeleri temizle (aynı isim çakışmasın)
  await removeUnverifiedFactors();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  });

  if (error) {
    console.error('2FA kurulum hatası:', error.message);
    throw new Error(translateMfaError(error));
  }

  return {
    id: data?.id,
    secret: data?.totp?.secret ?? '',
    qrCode: data?.totp?.qr_code ?? '',
    uri: data?.totp?.uri ?? '',
  };
}

/**
 * Kurulumu, uygulamadan alınan 6 haneli kodla tamamlar.
 */
export async function confirmTotpEnrollment({ factorId, code }) {
  const cleanCode = String(code || '').replace(/\s/g, '');
  if (!factorId || !cleanCode) {
    throw new Error('Lütfen uygulamadaki 6 haneli kodu gir.');
  }

  const { data, error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: cleanCode,
  });

  if (error) {
    console.error('2FA doğrulama hatası:', error.message);
    throw new Error(translateMfaError(error));
  }

  return data;
}

/**
 * Giriş sırasında ikinci adımı doğrular.
 */
export async function verifyLoginCode({ factorId, code }) {
  const cleanCode = String(code || '').replace(/\s/g, '');
  if (!factorId || !cleanCode) {
    throw new Error('Lütfen uygulamadaki 6 haneli kodu gir.');
  }

  const { data, error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: cleanCode,
  });

  if (error) {
    console.error('Giriş kodu doğrulanamadı:', error.message);
    throw new Error(translateMfaError(error));
  }

  return data;
}

/**
 * İki adımlı doğrulamayı kapatır.
 */
export async function disableTotp(factorId) {
  if (!factorId) throw new Error('Kapatılacak 2FA kaydı bulunamadı.');

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    console.error('2FA kapatma hatası:', error.message);
    throw new Error(translateMfaError(error));
  }
}
