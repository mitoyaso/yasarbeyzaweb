import React, { useEffect, useState } from 'react';
import { verifyLoginCode, listVerifiedTotpFactors } from '../lib/mfa';
import { signOutUser } from '../lib/auth';
import { ShieldCheck, LogOut, AlertCircle, KeyRound } from 'lucide-react';

/**
 * Giriş sonrası ikinci adım: kimlik doğrulama uygulamasındaki 6 haneli kod.
 * Yalnızca hesabında 2FA açık olan kişiler bu ekranı görür.
 */
export default function MfaChallenge({ onVerified, onCancel }) {
  const [factorId, setFactorId] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listVerifiedTotpFactors()
      .then((factors) => {
        if (cancelled) return;
        if (factors.length > 0) {
          setFactorId(factors[0].id);
        } else {
          setError('Hesabında doğrulanmış bir iki adımlı doğrulama kaydı bulunamadı.');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Doğrulama kaydı okunamadı.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const submitCode = async (value) => {
    if (!factorId || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      await verifyLoginCode({ factorId, code: value });
      onVerified();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Kod doğrulanamadı.');
      setCode('');
      setIsSubmitting(false);
    }
  };

  const handleChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError('');
    // 6 hane tamamlanınca otomatik doğrula
    if (digits.length === 6 && factorId) submitCode(digits);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitCode(code);
  };

  const handleCancel = async () => {
    await signOutUser();
    onCancel();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-md glass-panel bg-white/85 rounded-3xl p-7 sm:p-9 shadow-2xl border border-rose-200/90 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-300/30 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-rose-950 tracking-tight font-serif mb-1">
            İki Adımlı Doğrulama
          </h1>
          <p className="text-sm text-rose-700/85 font-medium leading-relaxed">
            Kimlik doğrulama uygulamandaki (Google Authenticator vb.) 6 haneli kodu gir.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-1.5 ml-1">
              Doğrulama Kodu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={handleChange}
                disabled={isLoading || isSubmitting || !factorId}
                placeholder="000000"
                className="w-full pl-11 pr-4 py-3.5 glass-input rounded-2xl text-rose-950 text-center text-2xl font-bold tracking-[0.5em] placeholder-rose-200 focus:ring-2 focus:ring-rose-400/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isSubmitting || code.length !== 6 || !factorId}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-base shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Doğrula ve Giriş Yap</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="w-full py-2.5 rounded-2xl text-rose-500 hover:text-rose-800 hover:bg-rose-50 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Vazgeç ve çıkış yap</span>
          </button>
        </form>

        <p className="text-[11px] text-center text-rose-400/90 mt-5 leading-relaxed">
          Kodu kaybettiysen: Supabase panelinden hesabına girip 2FA kaydını kaldırabilirsin.
        </p>
      </div>
    </div>
  );
}
