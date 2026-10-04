import React, { useState, useEffect } from 'react';
import { getComments, addComment, deleteComment } from '../../lib/supabase';
import { formatRelativeTime } from '../../lib/utils';
import { MessageCircle, Send, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CommentSection({ photoId, activeSender, showToast }) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadComments() {
      setErrorMsg('');
      try {
        const data = await getComments(photoId);
        if (isMounted) setComments(data);
      } catch (err) {
        console.error('Yorum yükleme hatası:', err);
        if (isMounted) setErrorMsg('Yorumlar yüklenemedi. Sayfayı yenilemeyi deneyin.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadComments();
    return () => {
      isMounted = false;
    };
  }, [photoId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!activeSender) {
      setErrorMsg('Gönderen seçilmemiş. Lütfen üst menüden Yaşar / Beyza seçimini yapın.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const newComment = await addComment({
        photoId,
        sender: activeSender,
        commentText: commentText.trim(),
      });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      setSuccessMsg('Yorumun başarıyla gönderildi! 💌');
      if (showToast) {
        showToast('Yorumun eklendi, çok tatlı! 💖', 'success');
      }
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Yorum ekleme hatası:', err);
      setErrorMsg(err.message || 'Yorum gönderilemedi, tekrar deneyin sevgilim.');
      if (showToast) {
        showToast(err.message || 'Yorum gönderilemedi!', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (showToast) {
        showToast('Yorum silindi', 'info');
      }
    } catch (err) {
      console.error('Yorum silinemedi:', err);
      setErrorMsg(err.message || 'Yorum silinemedi.');
      if (showToast) {
        showToast(err.message || 'Yorum silinemedi!', 'error');
      }
    }
  };

  const handleQuickEmoji = (emoji) => {
    setCommentText((prev) => prev + ' ' + emoji);
  };

  return (
    <div className="pt-3 border-t border-rose-100 mt-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>Yorumlar & Mesajlar ({comments.length})</span>
        </h4>
      </div>

      {errorMsg && (
        <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <p>{errorMsg}</p>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              className="mt-1 text-red-600 underline underline-offset-2 font-bold hover:text-red-800 cursor-pointer"
            >
              Hata mesajını kapat
            </button>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <p>{successMsg}</p>
        </div>
      )}

      {isLoading ? (
        <div className="py-4 text-center text-xs text-rose-400">
          Yorumlar yükleniyor...
        </div>
      ) : comments.length === 0 ? (
        <div className="py-3 text-center rounded-2xl bg-rose-50/50 border border-rose-100/60 mb-3">
          <p className="text-xs text-rose-600 font-medium">
            Henüz yorum yapılmamış. İlk aşk mesajını sen bırak! 💌
          </p>
        </div>
      ) : (
        <div className="space-y-2 mb-3 max-h-56 overflow-y-auto pr-1">
          {comments.map((comment) => {
            const isYasar = comment.sender === 'Yaşar';
            const canDelete = comment.sender === activeSender;
            return (
              <div
                key={comment.id}
                className="group p-2.5 rounded-2xl bg-rose-50/70 border border-rose-100/80 flex items-start justify-between gap-2 text-xs"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        isYasar
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-rose-200/80 text-rose-800'
                      }`}
                    >
                      {isYasar ? '👨‍🦱 Yaşar' : '👩‍🦰 Beyza'}
                    </span>
                    <span className="text-[10px] text-rose-400">
                      {formatRelativeTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-rose-950 font-medium leading-relaxed pl-0.5">
                    {comment.comment_text}
                  </p>
                </div>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    title="Kendi yorumunu sil"
                    className="opacity-0 group-hover:opacity-100 text-rose-300 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-sm">
        {['💖', '😍', '💍', '🌸', '✨', '☕', '🌹', '🥰'].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleQuickEmoji(emoji)}
            className="hover:scale-125 transition-transform p-0.5 cursor-pointer"
            title="Emoji ekle"
          >
            {emoji}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={`Bir yorum yaz (${activeSender || 'Gönderen seç'})...`}
          disabled={isSubmitting}
          className="flex-1 px-3 py-2 text-xs glass-input rounded-xl text-rose-950 placeholder-rose-300 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!commentText.trim() || isSubmitting || !activeSender}
          className="p-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer shadow-sm"
          title="Yorum Gönder"
        >
          {isSubmitting ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </form>
    </div>
  );
}
