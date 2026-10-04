import React, { useState } from 'react';
import { Edit3, X, Check } from 'lucide-react';
import { useModalA11y } from '../../lib/useModalA11y';

export default function EditCaptionModal({
  isOpen,
  currentCaption,
  onSave,
  onCancel,
  isLoading = false,
}) {
  const [caption, setCaption] = useState(currentCaption || '');

  // Escape ile kapanma + odak tuzağı (kanca koşulsuz çağrılmalı)
  const dialogRef = useModalA11y({ isOpen, onClose: onCancel });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(caption.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Anı Notunu Düzenle"
        className="w-full max-w-md glass-panel bg-white/95 rounded-3xl p-6 shadow-2xl border border-rose-200 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-rose-950 font-serif">
              Anı Notunu Düzenle
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-full text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-1.5 ml-1">
              Fotoğraf Açıklaması
            </label>
            <textarea
              rows="3"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Yeni anı notunu buraya yaz..."
              className="w-full p-3.5 glass-input rounded-2xl text-rose-950 placeholder-rose-300 text-sm font-medium resize-none"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="py-2.5 px-4 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 hover:from-rose-600 hover:to-pink-600 transition flex items-center gap-1.5"
            >
              {isLoading ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
