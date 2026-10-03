import React from 'react';
import { Camera, MessageSquareHeart, Sparkles } from 'lucide-react';

export default function BottomNav({ activeTab, onSelectTab, activeSender, onToggleSender }) {
  const isYasar = activeSender === 'Yaşar';

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel bg-white/90 backdrop-blur-xl border-t border-rose-200/80 px-4 py-2 flex items-center justify-around shadow-2xl safe-area-pb">
      <button
        type="button"
        onClick={() => onSelectTab('photos')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all cursor-pointer ${
          activeTab === 'photos'
            ? 'text-rose-600 scale-105 font-bold'
            : 'text-rose-400 hover:text-rose-600'
        }`}
      >
        <Camera className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Anılar</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('notes')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all cursor-pointer ${
          activeTab === 'notes'
            ? 'text-rose-600 scale-105 font-bold'
            : 'text-rose-400 hover:text-rose-600'
        }`}
      >
        <MessageSquareHeart className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Aşk Notları</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('counter')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all cursor-pointer ${
          activeTab === 'counter'
            ? 'text-rose-600 scale-105 font-bold'
            : 'text-rose-400 hover:text-rose-600'
        }`}
      >
        <Sparkles className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Sayaç</span>
      </button>

      {/* Hızlı Gönderen Değiştirici */}
      <button
        type="button"
        onClick={() => onToggleSender(isYasar ? 'Beyza' : 'Yaşar')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all cursor-pointer ${
          isYasar ? 'text-blue-600 font-bold' : 'text-pink-600 font-bold'
        }`}
        title="Göndereni Değiştir"
      >
        <span className="text-base leading-none mb-0.5">{isYasar ? '👨‍🦱' : '👩‍🦰'}</span>
        <span className="text-[10px]">{activeSender}</span>
      </button>
    </nav>
  );
}
