import React, { useState } from 'react';
import { sifreDegistir } from '../lib/auth';
import { sifreHatasi, sifreGucu, sifreGucuEtiketi } from '../lib/passwordRules';
import { useModalA11y } from '../lib/useModalA11y';
import { X, Loader2, ShieldCheck, Eye, EyeOff, KeyRound } from 'lucide-react';

/**
 * Şifre Değiştir / Şifre Belirle penceresi.
 *
 * @param {boolean} ilkGiris true ise "kendi şifreni belirle" akışı gösterilir
 *                          ve "daha sonra" bağlantısı çıkmaz.
 */
export default function PasswordModal({ onClose, showToast, ilkGiris = false, kisiAdi = '' }) {
  const dialogRef = useModalA11y({ onClose });

  const [mevcut, setMevcut] = useState('');
  const [yeni, setYeni] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [goster, setGoster] = useState(false);
  const [hata, setHata] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const guc = sifreGucu(yeni);

  const gonder = async (event) => {
    event.preventDefault();

    const kuralHatasi = sifreHatasi({ mevcut, yeni, tekrar });
    if (kuralHatasi) {
      setHata(kuralHatasi);
      return;
    }

    setKaydediliyor(true);
    setHata('');

    try {
      await sifreDegistir(mevcut, yeni);
      if (showToast) {
        showToast('Şifren değiştirildi. Artık yalnızca sen biliyorsun 🔐', 'success');
      }
      onClose();
    } catch (err) {
      console.error(err);
      setHata(err.message || 'Şifre değiştirilemedi.');
      if (showToast) showToast(err.message || 'Şifre değiştirilemedi.', 'error');
    } finally {
      setKaydediliyor(false);
    }
  };

  const alanSinifi =
    'w-full px-3.5 py-3 rounded-2xl border border-rose-200 text-base text-rose-950 placeholder-rose-300 focus:outline-none focus:border-rose-400';

  return (
    <div className="fixed inset-0 z-[95] bg-rose-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <form
        ref={dialogRef}
        onSubmit={gonder}
        role="dialog"
        aria-modal="true"
        aria-label={ilkGiris ? 'Şifre Belirle' : 'Şifre Değiştir'}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-200 overflow-hidden my-auto"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <p className="font-extrabold text-sm">
                {ilkGiris ? 'Kendi Şifreni Belirle' : 'Şifre Değiştir'}
              </p>
              <p className="text-[11px] text-white/85">
                {ilkGiris
                  ? 'İlk giriş: şifreni yalnızca sen bil'
                  : 'Yeni şifren yalnızca sana ait olur'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-2 rounded-full bg-white/15 hover:bg-white/30 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          {ilkGiris && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
              <strong>{kisiAdi ? kisiAdi + ', ' : ''}şifreni kendin belirle.</strong> Böylece
              <strong> diğerin senin şifreni bilmez</strong> ve özel sohbetleriniz birbirinden
              ayrı kalır. İlk girişte eski (ortak) şifreni girip yenisini oluşturman yeterli.
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-rose-800 mb-1">
              Mevcut şifren
            </label>
            <input
              type={goster ? 'text' : 'password'}
              value={mevcut}
              onChange={(event) => setMevcut(event.target.value)}
              autoComplete="current-password"
              className={alanSinifi}
              placeholder="Şu anki şifren"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-rose-800 mb-1">
              Yeni şifren
            </label>
            <div className="relative">
              <input
                type={goster ? 'text' : 'password'}
                value={yeni}
                onChange={(event) => setYeni(event.target.value)}
                autoComplete="new-password"
                className={alanSinifi}
                placeholder="En az 8 karakter, harf + rakam"
              />
              <button
                type="button"
                onClick={() => setGoster((onceki) => !onceki)}
                aria-label={goster ? 'Şifreyi gizle' : 'Şifreyi göster'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 cursor-pointer"
              >
                {goster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {yeni.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-rose-100 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      guc <= 1
                        ? 'bg-red-400 w-1/4'
                        : guc === 2
                          ? 'bg-amber-400 w-2/4'
                          : guc === 3
                            ? 'bg-lime-400 w-3/4'
                            : 'bg-emerald-500 w-full'
                    }`}
                  />
                </div>
                <span className="text-[10px] font-bold text-rose-500">
                  {sifreGucuEtiketi(guc)}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-rose-800 mb-1">
              Yeni şifren (tekrar)
            </label>
            <input
              type={goster ? 'text' : 'password'}
              value={tekrar}
              onChange={(event) => setTekrar(event.target.value)}
              autoComplete="new-password"
              className={alanSinifi}
              placeholder="Yeni şifreni tekrar yaz"
            />
          </div>

          {hata && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {hata}
            </div>
          )}

          <button
            type="submit"
            disabled={kaydediliyor}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-extrabold text-sm shadow-lg shadow-rose-500/25 hover:from-rose-600 hover:to-pink-600 transition disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
          >
            {kaydediliyor ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>{kaydediliyor ? 'Kaydediliyor...' : 'Şifremi Değiştir'}</span>
          </button>

          {!ilkGiris && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold text-rose-400 hover:text-rose-600 cursor-pointer"
            >
              Vazgeç
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
