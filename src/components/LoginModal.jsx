import React, { useState } from 'react';
import { AUTH_CREDENTIALS, IS_AUTH_ENV_SET } from '../lib/constants';
import { triggerHeartConfetti } from '../lib/utils';
import { Heart, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!IS_AUTH_ENV_SET) {
      setError('⚠️ Ortam değişkenleri okunamadı! Lütfen terminalde çalışan Vite sunucusunu kapatıp tekrar başlat (npm run dev). .env dosyası sadece başlangıçta okunur.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      if (
        cleanUser === AUTH_CREDENTIALS.KULLANICI_ADI.toLowerCase() &&
        cleanPass === AUTH_CREDENTIALS.SIFRE
      ) {
        triggerHeartConfetti();
        onLoginSuccess();
      } else {
        setError('Kullanıcı adı veya şifre hatalı! Lütfen tekrar deneyin sevgilim 💔');
        setIsSubmitting(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-md glass-panel bg-white/80 rounded-3xl p-7 sm:p-9 shadow-2xl border border-rose-200/90 relative overflow-hidden">
        {/* Üst Dekoratif Işıltı */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-300/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-pink-300/30 rounded-full blur-2xl pointer-events-none" />

        {/* Başlık ve İkon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-400 text-white shadow-lg shadow-rose-500/30 mb-4 animate-heart-pulse">
            <Heart className="w-8 h-8 fill-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-rose-950 tracking-tight font-serif mb-1">
            Yaşar & Beyza
          </h1>
          <p className="text-xs uppercase tracking-widest text-rose-500 font-semibold mb-2">
            ÖZEL AŞK GÜNLÜĞÜ
          </p>
          <p className="text-sm text-rose-700/80 font-medium">
            Birbirimize ait anıları ve aşk dolu notları görmek için lütfen giriş yapın.
          </p>
        </div>

        {/* Hata Bildirimi */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2 animate-in fade-in duration-200">
            <span className="shrink-0 text-base">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Giriş Formu */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-1.5 ml-1">
              Kullanıcı Adı
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=""
                required
                autoComplete="username"
                className="w-full pl-11 pr-4 py-3.5 glass-input rounded-2xl text-rose-950 placeholder-rose-300 text-sm font-medium focus:ring-2 focus:ring-rose-400/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-1.5 ml-1">
              Özel Şifre
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
                className="w-full pl-11 pr-11 py-3.5 glass-input rounded-2xl text-rose-950 placeholder-rose-300 text-sm font-medium focus:ring-2 focus:ring-rose-400/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-rose-400 hover:text-rose-600"
                aria-label={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-base shadow-xl shadow-rose-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
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
      </div>
    </div>
  );
}
