import React from 'react';
import { Camera, MessageSquareHeart, Sparkles } from 'lucide-react';

export default function BottomNav({ activeTab, onSelectTab }) {
  return (
    <nav className="uygulama-alt-menu sm:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel bg-white/90 backdrop-blur-xl border-t border-rose-200/80 px-4 py-2 flex items-center justify-around shadow-2xl safe-area-pb">
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
        onClick={() => onSelectTab('us')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all cursor-pointer ${
          activeTab === 'us'
            ? 'text-rose-600 scale-105 font-bold'
            : 'text-rose-400 hover:text-rose-600'
        }`}
      >
        <Sparkles className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Biz</span>
      </button>
    </nav>
  );
}
