import React from 'react';
import { SENDERS } from '../lib/constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { Heart, LogOut, Database } from 'lucide-react';

export default function Navbar({
  activeSender,
  onToggleSender,
  onLogout,
  onOpenConfigInfo,
}) {
  const isYasar = activeSender === SENDERS.YASAR;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel bg-white/80 backdrop-blur-xl border-b border-rose-200/70 shadow-sm safe-area-pt">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-2">
        {/* Logo ve İsimler */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20 animate-heart-pulse shrink-0">
            <Heart className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl text-rose-950 tracking-tight font-serif">
                Yaşar & Beyza
              </span>
              <span className="text-rose-500 font-script text-xl sm:text-2xl">Aşkı</span>
            </div>
            <p className="text-[10px] sm:text-xs text-rose-400 font-semibold tracking-wider uppercase">
              Sonsuz Anılar & Notlar
            </p>
          </div>
        </div>

        {/* Sağ Alan: Gönderen Seçici & Durum & Çıkış */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Supabase Durum Rozeti */}
          <button
            onClick={onOpenConfigInfo}
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
              isSupabaseConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
            title={
              isSupabaseConfigured
                ? 'Supabase veritabanı ve depolama aktif'
                : 'Supabase anahtarları girilmedi (Demo Modu aktif)'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <Database className="w-3 h-3" />
            <span>{isSupabaseConfigured ? 'Supabase Bağlı' : 'Demo Modu'}</span>
          </button>

          {/* Aktif Gönderen Seçici Buton / Rozet */}
          <div className="relative flex items-center p-1 rounded-2xl bg-rose-100/70 border border-rose-200/90 shadow-inner">
            <button
              type="button"
              onClick={() => onToggleSender(SENDERS.YASAR)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isYasar
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                  : 'text-rose-700 hover:text-blue-700'
              }`}
            >
              <span>👨‍🦱</span>
              <span className="hidden xs:inline">Yaşar</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleSender(SENDERS.BEYZA)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                !isYasar
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25 scale-[1.02]'
                  : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              <span>👩‍🦰</span>
              <span className="hidden xs:inline">Beyza</span>
            </button>
          </div>

          {/* Çıkış Yap Butonu */}
          <button
            type="button"
            onClick={onLogout}
            title="Güvenli Çıkış Yap"
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-rose-500 hover:text-rose-800 hover:bg-rose-100/60 transition cursor-pointer flex items-center gap-1 text-xs sm:text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </div>
    </header>
  );
}
