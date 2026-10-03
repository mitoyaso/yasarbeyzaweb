import React, { useState } from 'react';
import { formatTurkishDate, formatRelativeTime } from '../../lib/utils';
import CommentSection from './CommentSection';
import { Heart, MessageCircle, MoreVertical, Edit2, Trash2, Maximize2, Calendar } from 'lucide-react';

export default function PhotoCard({
  photo,
  activeSender,
  onOpenLightbox,
  onEditCaption,
  onDeleteRequest,
}) {
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(1);

  const isYasar = photo.uploaded_by === 'Yaşar';

  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
    }
  };

  return (
    <div className="glass-card rounded-3xl overflow-hidden border border-rose-200/70 shadow-lg glass-card-hover flex flex-col">
      {/* Üst Bilgi Başlığı */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between border-b border-rose-100/60 bg-white/40">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm ${
              isYasar ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {isYasar ? '👨‍🦱' : '👩‍🦰'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm text-rose-950">
                {photo.uploaded_by}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isYasar
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {isYasar ? '💙 Yaşar' : '💖 Beyza'}
              </span>
            </div>
            <p className="text-[10px] text-rose-400 font-medium">
              {formatRelativeTime(photo.created_at)}
            </p>
          </div>
        </div>

        {/* Menü Açılır Kutusu (Düzenle / Sil) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-full text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
            aria-label="İşlemler Menüsü"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-8 z-30 w-38 glass-panel bg-white/95 rounded-2xl p-1.5 shadow-xl border border-rose-200 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onEditCaption(photo);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-rose-800 hover:bg-rose-50 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Notu Düzenle</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDeleteRequest(photo);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Anıyı Sil</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fotoğraf Görseli */}
      <div
        className="relative group cursor-pointer overflow-hidden bg-rose-950/5 aspect-4/3 sm:aspect-square"
        onClick={() => onOpenLightbox(photo)}
      >
        <img
          src={photo.url}
          alt={photo.caption || 'Yaşar ve Beyza'}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Büyütme İkonu */}
        <div className="absolute inset-0 bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="p-3 rounded-full bg-white/90 text-rose-700 shadow-lg backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform">
            <Maximize2 className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Alt İçerik: Açıklama ve Butonlar */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        {photo.caption && (
          <p className="text-xs sm:text-sm text-rose-900 font-medium leading-relaxed mb-3 font-sans">
            {photo.caption}
          </p>
        )}

        <div>
          {/* Beğen & Yorum Butonları */}
          <div className="flex items-center justify-between pt-2 border-t border-rose-100/70">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isLiked
                    ? 'bg-rose-100 text-rose-600'
                    : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
                }`}
              >
                <Heart
                  className={`w-4 h-4 transition-transform ${
                    isLiked ? 'fill-rose-500 text-rose-500 scale-110' : ''
                  }`}
                />
                <span>{likeCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowComments(!showComments)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  showComments
                    ? 'bg-rose-100 text-rose-700'
                    : 'text-rose-400 hover:text-rose-700 hover:bg-rose-50'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>Yorumlar</span>
              </button>
            </div>

            <span className="text-[10px] text-rose-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatTurkishDate(photo.created_at)}
            </span>
          </div>

          {/* Açılır Kapanır Yorum Alanı */}
          {showComments && (
            <CommentSection
              photoId={photo.id}
              activeSender={activeSender}
            />
          )}
        </div>
      </div>
    </div>
  );
}
