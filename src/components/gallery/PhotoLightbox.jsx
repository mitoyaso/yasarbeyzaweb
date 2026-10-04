import React from 'react';
import { formatTurkishDate } from '../../lib/utils';
import { useModalA11y } from '../../lib/useModalA11y';
import { X, Download, Heart, Calendar } from 'lucide-react';

export default function PhotoLightbox({ photo, onClose }) {
  // Escape ile kapanma + odak tuzağı + kaydırma kilidi (kanca koşulsuz çağrılmalı)
  const dialogRef = useModalA11y({ isOpen: Boolean(photo), onClose });

  if (!photo) return null;

  const isYasar = photo.uploaded_by === 'Yaşar';

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Anı Görünümü"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Üst Kapatma ve İndirme Çubuğu */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <a
          href={photo.url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition"
          title="Orijinal Fotoğrafı İndir"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition"
          title="Kapat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-4xl max-h-[92vh] flex flex-col items-center justify-center relative">
        <img
          src={photo.url}
          alt={photo.caption || 'Yaşar ve Beyza Anısı'}
          className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl border border-white/10"
        />

        {/* Alt Açıklama Kutusu */}
        <div className="w-full mt-3 p-4 rounded-2xl bg-white/15 backdrop-blur-lg border border-white/20 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isYasar ? 'bg-blue-500/80 text-white' : 'bg-rose-500/80 text-white'
                }`}
              >
                {isYasar ? '👨‍🦱 Yaşar yükledi' : '👩‍🦰 Beyza yükledi'}
              </span>
              <span className="text-xs text-rose-200 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatTurkishDate(photo.created_at)}
              </span>
            </div>
            {photo.caption && (
              <p className="text-sm font-medium text-white/95 leading-relaxed">
                "{photo.caption}"
              </p>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-1.5 text-xs text-rose-200">
            <Heart className="w-4 h-4 fill-rose-400 text-rose-400 animate-pulse" />
            <span>Sonsuz Aşk</span>
          </div>
        </div>
      </div>
    </div>
  );
}
