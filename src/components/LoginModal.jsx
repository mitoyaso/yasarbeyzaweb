import React, { useState } from 'react';
import { getAuthCredentials, isAuthEnvSet } from '../lib/constants';
import { triggerHeartConfetti } from '../lib/utils';
import { Heart, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const envInfo = isAuthEnvSet();

    // Geliştirme modunda debug log (guvenli: icerik gostermez, sadece uzunluk)
    console.log('[LoginModal DEBUG] env okunan degerler:', {
      usernameLen: envInfo.usernameLength,
      passwordLen: envInfo.passwordLength,
      ok: envInfo.ok,
      usernameFirstChar: envInfo.usernameFirstChar,
    });

    if (!envInfo.ok) {
      setError(
        <div className="space-y-2 leading-relaxed">
          <div className="font-bold text-base">⚠️ Ortam değişkenleri henüz okunamadı!</div>
          <div className="bg-white/60 rounded-lg p-2.5 text-xs font-mono space-y-0.5">
            <div>• Okunan kullanıcı adı uzunluğu: <span className="font-bold text-rose-900">{envInfo.usernameLength}</span> (olması gereken: 10)</div>
            <div>• Okunan şifre uzunluğu: <span className="font-bold text-rose-900">{envInfo.passwordLength}</span> (olması gereken: 14)</div>
            <div>• Durum: <span className="font-bold">{envInfo.ok ? '✅ OK' : '❌ BOŞ / EKSİK'}</span></div>
          </div>
          <div className="mt-2">
            <div className="font-bold mb-1">‼️ ÇÖZÜM (sırayla yap):</div>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
              <li>Terminalde çalışan Vite penceresini bul ve Ctrl+C ile KAPAT</li>
              <li>Tekrar <code className="bg-white/70 px-1.5 py-0.5 rounded">npm run dev</code> yaz ve çalıştır</li>
              <li>Yeni gelen http://localhost:... adresinden sayfayı aç</li>
              <li>Son olarak sayfayı F5 ile yenile</li>
            </ol>
          </div>
          <div className="text-xs italic mt-2 opacity-90">
            .env dosyaları SADECE uygulama BAŞLARKEN okunur, sadece tarayıcıda F5 atmak YETMEZ!
          </div>
        </div>
      );
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const creds = getAuthCredentials();
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      // Debug - yazılan değerlerin uzunluklari (guvenli: icerik yok)
      console.log('[LoginModal DEBUG] giris karsilastirma:', {
        girilenUserLen: cleanUser.length,
        girilenPassLen: cleanPass.length,
        beklenenUserLen: creds.KULLANICI_ADI.length,
        beklenenPassLen: creds.SIFRE.length,
        userMatch: cleanUser === creds.KULLANICI_ADI.toLowerCase(),
        passMatch: cleanPass === creds.SIFRE,
      });

      if (
        cleanUser === creds.KULLANICI_ADI.toLowerCase() &&
        cleanPass === creds.SIFRE
      ) {
        triggerHeartConfetti();
        onLoginSuccess();
      } else {
        setError(
          <div className="space-y-2 leading-relaxed">
            <div className="font-bold text-base">💔 Kullanıcı adı veya şifre hatalı!</div>
            <div className="bg-white/60 rounded-lg p-2.5 text-xs">
              <div className="font-bold mb-1">DEBUG:</div>
              <div>• Girdiğin kullanıcı adı uzunluğu: {cleanUser.length}</div>
              <div>• Girdiğin şifre uzunluğu: {cleanPass.length}</div>
              <div>• Beklenen kullanıcı adı uzunluğu: {creds.KULLANICI_ADI.length}</div>
              <div>• Beklenen şifre uzunluğu: {creds.SIFRE.length}</div>
              <div className="mt-1.5 text-[11px] italic opacity-80">
                İpucu: Şifren 14 haneli, kullanıcı adın 10 haneli. Türkçe karakter olmadan yazdığına emin ol!
              </div>
            </div>
          </div>
        );
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
