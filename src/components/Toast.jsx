import React, { useEffect } from 'react';
import { AlertCircle, Heart, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const isError = type === 'error';

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`flex items-center gap-3 p-4 rounded-2xl shadow-xl backdrop-blur-md border ${
          isError
            ? 'bg-rose-900/90 text-white border-rose-700/50'
            : 'bg-white/95 text-rose-950 border-rose-200/80 shadow-rose-500/10'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            isError ? 'bg-rose-800 text-rose-200' : 'bg-rose-100 text-rose-600'
          }`}
        >
          {isError ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500 animate-pulse" />
          )}
        </div>

        <p className="flex-1 text-sm font-medium">{message}</p>

        <button
          onClick={onClose}
          className="p-1 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
