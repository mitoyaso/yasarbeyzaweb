import React, { useState, useEffect } from 'react';
import { formatTurkishDate, formatRelativeTime } from '../../lib/utils';
import { getLikes, toggleLike } from '../../lib/supabase';
import CommentSection from './CommentSection';
import { Heart, MessageCircle, MoreVertical, Edit2, Trash2, Maximize2, Calendar } from 'lucide-react';

export default function PhotoCard({
  photo,
  activeSender,
  showToast,
  onOpenLightbox,
  onEditCaption,
  onDeleteRequest,
}) {
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isLoadingLikes, setIsLoadingLikes] = useState(true);

  const isYasar = photo.uploaded_by === 'Yaşar';

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoadingLikes(true);
      try {
        const data = await getLikes(photo.id, activeSender);
        if (mounted) {
          setIsLiked(data.likedByMe);
          setLikeCount(data.total);
        }
      } catch (err) {
        console.error('Beğeni yükleme hatası:', err);
      } finally {
        if (mounted) setIsLoadingLikes(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [photo.id, activeSender]);

  const handleLike = async () => {
    if (isLikeLoading) return;
    setIsLikeLoading(true);

    const prevLiked = isLiked;
    const prevCount = likeCount;

    setIsLiked(!prevLiked);
    setLikeCount((prev) => (!prevLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const result = await toggleLike(photo.id, activeSender);
      setIsLiked(result.likedByMe);
      setLikeCount(result.total);
      if (showToast) {
        showToast(
          result.likedByMe ? 'Fotoğrafı beğendin! 💖' : 'Beğeni geri alındı',
          'info'
        );
      }
    } catch (err) {
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      console.error('Beğeni hatası:', err);
      if (showToast) {
        showToast(err.message || 'Beğeni işlemi başarısız oldu, tekrar deneyin.', 'error');
      }
    } finally {
      setIsLikeLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl overflow-hidden border border-rose-200/70 shadow-lg glass-card-hover flex flex-col">
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

      <div
        className="relative group cursor-pointer overflow-hidden bg-rose-950/5 aspect-4/3 sm:aspect-square"
        onClick={() => onOpenLightbox(photo)}
      >
        <img
          src={photo.thumb_url || photo.url}
          alt={photo.caption || 'Yaşar ve Beyza'}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            // Thumbnail bulunamazsa (eski fotoğraflar) tam boy görsele düş
            if (photo.url && event.currentTarget.src !== photo.url) {
              event.currentTarget.src = photo.url;
            }
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        <div className="absolute inset-0 bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="p-3 rounded-full bg-white/90 text-rose-700 shadow-lg backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform">
            <Maximize2 className="w-5 h-5" />
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        {photo.caption && (
          <p className="text-xs sm:text-sm text-rose-900 font-medium leading-relaxed mb-3 font-sans">
            {photo.caption}
          </p>
        )}

        <div>
          <div className="flex items-center justify-between pt-2 border-t border-rose-100/70">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLike}
                disabled={isLoadingLikes || isLikeLoading}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isLiked
                    ? 'bg-rose-100 text-rose-600'
                    : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
                } ${(isLoadingLikes || isLikeLoading) ? 'opacity-70 cursor-wait' : ''}`}
                title={isLiked ? 'Beğeniyi geri al' : 'Bu fotoğrafı beğen'}
              >
                <Heart
                  className={`w-4 h-4 transition-transform ${
                    isLiked ? 'fill-rose-500 text-rose-500 scale-110' : ''
                  } ${isLikeLoading ? 'animate-pulse' : ''}`}
                />
                <span>{isLoadingLikes ? '...' : likeCount}</span>
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

          {showComments && (
            <CommentSection
              photoId={photo.id}
              activeSender={activeSender}
              showToast={showToast}
            />
          )}
        </div>
      </div>
    </div>
  );
}
