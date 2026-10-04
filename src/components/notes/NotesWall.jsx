import React, { useState } from 'react';
import NoteCard from './NoteCard';
import ConfirmModal from '../ConfirmModal';
import { addNote, deleteNote } from '../../lib/supabase';
import { triggerHeartConfetti } from '../../lib/utils';
import { MessageSquareHeart, Send, Filter, RefreshCw } from 'lucide-react';

export default function NotesWall({
  notes,
  activeSender,
  isLoading,
  onRefresh,
  onNoteAdded,
  onNoteDeleted,
  showToast,
}) {
  const [content, setContent] = useState('');
  const [filterSender, setFilterSender] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingNote, setDeletingNote] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtreleme
  const filteredNotes = notes.filter((n) => {
    if (filterSender === 'Yaşar') return n.sender === 'Yaşar';
    if (filterSender === 'Beyza') return n.sender === 'Beyza';
    return true;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const newNote = await addNote({
        sender: activeSender,
        content: content.trim(),
      });
      triggerHeartConfetti();
      onNoteAdded(newNote);
      setContent('');
      showToast('Aşk notun panoya asıldı sevgilim! 💌💖', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Not eklenirken hata oluştu.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingNote) return;
    setIsDeleting(true);

    try {
      const sonuc = await deleteNote(deletingNote.id);
      onNoteDeleted(deletingNote.id);
      showToast(
        sonuc?.softDeleted
          ? 'Not çöp kutusuna taşındı 💌 30 gün içinde geri alabilirsin'
          : 'Not panodan kaldırıldı.',
        'success'
      );
      setDeletingNote(null);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Not silinemedi.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const quickMessages = [
    'Seni çok seviyorum canım sevgilim 💖',
    'Bugün aklımdan hiç çıkmadın... 🌸',
    'İyi ki hayatımdasın birtanem ✨',
    'Seninle geçen her saniye masal gibi 🕊️',
  ];

  return (
    <div className="w-full">
      {/* Başlık ve Bilgi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-rose-950 font-serif">
              Aşk Notları ve Duvarımız
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
              {filteredNotes.length} Not
            </span>
          </div>
          <p className="text-xs sm:text-sm text-rose-600/80">
            Birbirimize bırakacağımız en tatlı, en samimi mesajlar.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          title="Notları Yenile"
          className="self-start sm:self-center p-2.5 rounded-2xl glass-panel bg-white/80 text-rose-500 hover:text-rose-800 hover:bg-white transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Yeni Not Yazma Alanı */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-rose-200/80 shadow-xl mb-8 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <MessageSquareHeart className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-rose-950 font-serif">
              Sevgiline Bir Aşk Notu Bırak
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100/80 text-rose-800">
            <span>Yazan:</span>
            <span className="font-bold text-rose-600">
              {activeSender === 'Yaşar' ? '👨‍🦱 Yaşar' : '👩‍🦰 Beyza'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            rows="3"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`${activeSender === 'Yaşar' ? 'Beyza\'ya' : 'Yaşar\'a'} kalbinden geçenleri yaz... 💌`}
            className="w-full p-4 glass-input rounded-2xl text-rose-950 placeholder-rose-300 text-sm font-medium resize-none"
          />

          {/* Hızlı Romantik Öneriler */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-rose-400 font-bold shrink-0">Öneri:</span>
            {quickMessages.map((msg, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setContent(msg)}
                className="shrink-0 px-3 py-1 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 transition border border-rose-100/80 font-medium"
              >
                {msg}
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className={`py-3 px-6 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${
                !content.trim() || isSubmitting
                  ? 'bg-rose-200 text-rose-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-rose-500/25 active:scale-95 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Notu Duvara As</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Filtreleme */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-rose-400 flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtre:</span>
        </span>

        {[
          { id: 'ALL', label: 'Tüm Notlar' },
          { id: 'Yaşar', label: '👨‍🦱 Yaşar\'ın Notları' },
          { id: 'Beyza', label: '👩‍🦰 Beyza\'nın Notları' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterSender(tab.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filterSender === tab.id
                ? 'bg-rose-600 text-white shadow-sm'
                : 'glass-panel bg-white/70 text-rose-700 hover:bg-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notlar Grid / Akışı */}
      {isLoading && notes.length === 0 ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-3 border-rose-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-rose-600">
            Aşk notları yükleniyor...
          </p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-rose-200/80 my-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 mx-auto mb-4">
            <MessageSquareHeart className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-rose-950 font-serif mb-2">
            Henüz Bir Not Bırakılmamış
          </h3>
          <p className="text-xs sm:text-sm text-rose-600/80 max-w-sm mx-auto mb-4">
            Birbirinize söylemek istediğiniz o güzel sözleri duvara asarak aşkınızı tazeleyin!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onDeleteRequest={(n) => setDeletingNote(n)}
            />
          ))}
        </div>
      )}

      {/* Not Silme Onay Modalı */}
      <ConfirmModal
        isOpen={Boolean(deletingNote)}
        title="Aşk Notunu Sil"
        message="Bu aşk notunu duvardan kaldırmak istediğine emin misin?"
        subtext="Bu not panodan kalıcı olarak silinecektir."
        confirmText="Evet, Kaldır"
        cancelText="Vazgeç"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingNote(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
