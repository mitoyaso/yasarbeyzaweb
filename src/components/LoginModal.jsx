import React, { useState } from 'react';
import { AUTH_ACCOUNTS, SENDERS } from '../lib/constants';
import { signInWithName } from '../lib/auth';
import { triggerHeartConfetti } from '../lib/utils';
import { Heart, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginModal({ onLoginSuccess }) {
  const [selectedName, setSelectedName] = useState(SENDERS.YASAR);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Lütfen şifreni gir.');
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await signInWithName(selectedName, password);
      triggerHeartConfetti();
      onLoginSuccess(session);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Giriş yapılamadı. Lütfen tekrar dene.');
      setPassword('');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-md glass-panel bg-white/80 rounded-3xl p-7 sm:p-9 shadow-2xl border border-rose-200/90 relative overflow-hidden">
        {/* Üst Dekoratif Işıltı */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-300/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-pink-300/30 rounded-full blur-2xl pointer-events-none" />

        {/* Başlık ve İkon */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-400 text-white shadow-lg shadow-rose-500/30 mb-4 animate-heart-pulse">
            <Heart className="w-8 h-8 fill-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-rose-950 tracking-tight font-serif mb-1">
            Yaşar &amp; Beyza
          </h1>
          <p className="text-xs uppercase tracking-widest text-rose-500 font-semibold mb-2">
            ÖZEL AŞK GÜNLÜĞÜ
          </p>
          <p className="text-sm text-rose-700/80 font-medium">
            Anılarımızı görmek için kim olduğunu seç ve şifreni gir.
          </p>
        </div>

        {/* Hata Bildirimi */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Giriş Formu */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-2 ml-1">
              Kimsin?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {AUTH_ACCOUNTS.map((account) => {
                const isActive = selectedName === account.name;
                return (
                  <button
                    key={account.name}
                    type="button"
                    onClick={() => {
                      setSelectedName(account.name);
                      setError('');
                    }}
                    disabled={isSubmitting}
                    aria-pressed={isActive}
                    className={`py-3.5 px-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                      isActive
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-transparent shadow-lg shadow-rose-500/25 scale-[1.02]'
                        : 'bg-white/70 text-rose-800 border-rose-200 hover:bg-white'
                    }`}
                  >
                    <span className="text-base">{account.emoji}</span>
                    <span>{account.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-1.5 ml-1">
              Şifren
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                required
                autoComplete="current-password"
                disabled={isSubmitting}
                className="w-full pl-11 pr-11 py-3.5 glass-input rounded-2xl text-rose-950 placeholder-rose-300 text-sm font-medium focus:ring-2 focus:ring-rose-400/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-rose-400 hover:text-rose-600 cursor-pointer"
                aria-label={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-base shadow-xl shadow-rose-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-80 disabled:cursor-wait"
          >
            {isSubmitting ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Aşk Günlüğüne Giriş Yap</span>
                <Heart className="w-4 h-4 fill-white group-hover:scale-125 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-center text-rose-400/90 mt-5 leading-relaxed">
          Giriş bilgileri Supabase Auth ile güvenli şekilde doğrulanır. Şifren bu sayfada
          veya sitede hiçbir yerde saklanmaz.
        </p>
      </div>
    </div>
  );
}
