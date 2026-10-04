import React from 'react';
import { formatTurkishDate, formatRelativeTime } from '../../lib/utils';
import { Heart, Trash2, Calendar } from 'lucide-react';

export default function NoteCard({
  note,
  onDeleteRequest,
  likeCount = 0,
  likedByMe = false,
  showLikes = false,
  isLikeBusy = false,
  onToggleLike,
}) {
  const isYasar = note.sender === 'Yaşar';

  return (
    <div
      className={`glass-card rounded-3xl p-5 sm:p-6 border transition-all duration-300 relative flex flex-col justify-between group ${
        isYasar
          ? 'border-blue-200/80 bg-gradient-to-br from-white/90 via-blue-50/30 to-indigo-50/20'
          : 'border-rose-200/80 bg-gradient-to-br from-white/90 via-rose-50/30 to-pink-50/20'
      } hover:shadow-xl hover:-translate-y-1`}
    >
      {/* Üst Kısım: Gönderen ve Tarih */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center text-base shadow-sm ${
              isYasar ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {isYasar ? '👨‍🦱' : '👩‍🦰'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-rose-950 font-serif">
                {note.sender}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isYasar
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {isYasar ? '💙 Yaşar' : '💖 Beyza'}
              </span>
            </div>
            <p className="text-[10px] text-rose-400 font-medium">
              {formatRelativeTime(note.created_at)}
            </p>
          </div>
        </div>

        {/* Silme Butonu */}
        <button
          type="button"
          onClick={() => onDeleteRequest(note)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl text-rose-300 hover:text-red-500 hover:bg-rose-50 transition cursor-pointer"
          title="Notu Sil"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Not Metni */}
      <div className="my-2 flex-1">
        <p className="text-sm sm:text-base text-rose-950 font-medium leading-relaxed whitespace-pre-wrap font-sans">
          {note.content}
        </p>
      </div>

      {/* Alt Kısım: Beğeni ve Tam Tarih */}
      <div className="pt-3 border-t border-rose-100/70 flex items-center justify-between mt-3 text-xs">
        <span className="text-[11px] text-rose-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatTurkishDate(note.created_at)}
        </span>

        {showLikes && (
          <button
            type="button"
            onClick={() => onToggleLike?.(note)}
            disabled={isLikeBusy}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              likedByMe
                ? 'bg-rose-100 text-rose-600'
                : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
            } ${isLikeBusy ? 'opacity-70 cursor-wait' : ''}`}
            title={likedByMe ? 'Beğeniyi geri al' : 'Kalbe dokun'}
          >
            <Heart
              className={`w-4 h-4 transition-transform ${
                likedByMe ? 'fill-rose-500 text-rose-500 scale-110' : ''
              }`}
            />
            <span>{likeCount}</span>
          </button>
        )}
      </div>
    </div>
  );
}
