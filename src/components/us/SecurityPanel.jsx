import React, { useCallback, useEffect, useState } from 'react';
import {
  listVerifiedTotpFactors,
  startTotpEnrollment,
  confirmTotpEnrollment,
  disableTotp,
} from '../../lib/mfa';
import {
  ShieldCheck,
  ShieldOff,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Smartphone,
  KeyRound,
} from 'lucide-react';

/**
 * Güvenlik ayarları: iki adımlı doğrulama (2FA) açma / kapatma.
 */
export default function SecurityPanel({ showToast }) {
  const [factors, setFactors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setFactors(await listVerifiedTotpFactors());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listVerifiedTotpFactors()
      .then((data) => {
        if (!cancelled) setFactors(data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isEnabled = factors.length > 0;

  const handleStart = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await startTotpEnrollment();
      setEnrollment(data);
      setCode('');
    } catch (err) {
      console.error(err);
      setError(err.message || '2FA kurulumu başlatılamadı.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (event) => {
    event.preventDefault();
    if (!enrollment || code.length !== 6) return;

    setBusy(true);
    setError('');
    try {
      await confirmTotpEnrollment({ factorId: enrollment.id, code });
      setEnrollment(null);
      setCode('');
      await load();
      if (showToast) showToast('İki adımlı doğrulama açıldı! Bundan sonra girişte kod istenecek 🛡️', 'success');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Kod doğrulanamadı.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (!factors[0]) return;
    setBusy(true);
    setError('');
    try {
      await disableTotp(factors[0].id);
      await load();
      if (showToast) showToast('İki adımlı doğrulama kapatıldı.', 'info');
    } catch (err) {
      console.error(err);
      setError(err.message || '2FA kapatılamadı.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopySecret = async () => {
    if (!enrollment?.secret) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Kopyalanamadı, kodu elle yazabilirsin.');
    }
  };

  return (
    <div>
      <h3 className="text-base sm:text-lg font-bold text-rose-950 font-serif mb-3 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        Güvenlik
      </h3>

      <div
        className={`glass-card rounded-3xl p-5 border ${
          isEnabled ? 'border-emerald-300' : 'border-rose-200/70'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-rose-600 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Durum kontrol ediliyor...</span>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  isEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'
                }`}
              >
                {isEnabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-rose-950 mb-0.5">
                  İki Adımlı Doğrulama {isEnabled ? '— AÇIK' : '— kapalı'}
                </p>
                <p className="text-[11px] sm:text-xs text-rose-600/85 leading-relaxed">
                  {isEnabled
                    ? 'Girişte şifrenden sonra telefonundaki uygulamadan 6 haneli kod istenir. Şifren birine geçse bile hesabına girilemez.'
                    : 'Şifrenin yanına ikinci bir adım ekler: telefonundaki kimlik doğrulama uygulamasından alınan 6 haneli kod.'}
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Kurulum akışı */}
            {enrollment ? (
              <div className="mt-4 p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
                <p className="text-xs font-bold text-rose-900 mb-2 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  1. Telefonuna bir doğrulama uygulaması kur (Google Authenticator, Authy…)
                </p>
                <p className="text-xs font-bold text-rose-900 mb-3">
                  2. Aşağıdaki kare kodu uygulamayla tara
                </p>

                {enrollment.qrCode ? (
                  <div className="bg-white rounded-2xl p-3 w-fit mx-auto shadow-sm border border-rose-100">
                    <img
                      src={enrollment.qrCode}
                      alt="2FA kurulum kare kodu"
                      className="w-40 h-40"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-rose-500 text-center">
                    Kare kod alınamadı; aşağıdaki gizli anahtarı elle girebilirsin.
                  </p>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 text-[10px] sm:text-xs bg-white rounded-xl px-3 py-2 border border-rose-200 text-rose-800 break-all font-mono">
                    {enrollment.secret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="p-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                    title="Gizli anahtarı kopyala"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <form onSubmit={handleConfirm} className="mt-4">
                  <p className="text-xs font-bold text-rose-900 mb-1.5">
                    3. Uygulamanın gösterdiği 6 haneli kodu gir
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-rose-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={(event) =>
                          setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        placeholder="000000"
                        disabled={busy}
                        className="w-full pl-9 pr-3 py-2.5 glass-input rounded-xl text-rose-950 text-center text-lg font-bold tracking-[0.3em] placeholder-rose-200"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busy || code.length !== 6}
                      className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Onayla'}
                    </button>
                  </div>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setEnrollment(null);
                    setCode('');
                    setError('');
                  }}
                  className="mt-3 text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Kurulumu iptal et
                </button>
              </div>
            ) : (
              <div className="mt-4">
                {isEnabled ? (
                  <button
                    type="button"
                    onClick={handleDisable}
                    disabled={busy}
                    className="py-2.5 px-4 rounded-2xl bg-white border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
                    <span>İki adımlı doğrulamayı kapat</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={busy}
                    className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600 transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>İki adımlı doğrulamayı aç</span>
                  </button>
                )}
              </div>
            )}

            <p className="mt-3 text-[10px] text-rose-400 leading-relaxed">
              Not: Bu özellik için Supabase panelinde <strong>Authentication → Multi-Factor Auth</strong>{' '}
              bölümünden TOTP etkin olmalıdır. Kapalıysa kurulum başlatıldığında uyarı görürsün.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
