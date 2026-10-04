import React from 'react';
import { Trash2, X } from 'lucide-react';
import { useModalA11y } from '../lib/useModalA11y';

export default function ConfirmModal({
  isOpen,
  title = 'Anıyı Sil',
  message = 'Bu anıyı silmek istediğine emin misin?',
  subtext = 'Bu işlem geri alınamaz ve hem fotoğraflardan hem veritabanından kalıcı olarak silinecektir.',
  confirmText = 'Evet, Sil',
  cancelText = 'Vazgeç',
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  // Escape ile kapanma + odak tuzağı (kanca koşulsuz çağrılmalı)
  const dialogRef = useModalA11y({ isOpen, onClose: onCancel });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm glass-panel bg-white/95 rounded-3xl p-6 shadow-2xl border border-rose-200/80 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-inner">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 rounded-full text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-xl font-bold text-rose-950 mb-2">{title}</h3>
        <p className="text-sm font-medium text-rose-800/90 mb-2">{message}</p>
        <p className="text-xs text-rose-400/90 mb-6 leading-relaxed">{subtext}</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl border border-rose-200 text-rose-700 font-semibold text-sm hover:bg-rose-50 active:scale-95 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold text-sm shadow-lg shadow-rose-500/25 active:scale-95 transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
