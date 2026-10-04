import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getDeletedPhotos,
  getDeletedNotes,
  restorePhoto,
  restoreNote,
  purgePhoto,
  purgeNote,
} from '../../lib/supabase';
import { trashStats, daysLeftLabel, sortTrash, isTrashExpired } from '../../lib/trashCore';
import { useModalA11y } from '../../lib/useModalA11y';
import {
  X,
  Trash2,
  RotateCcw,
  Loader2,
  Image as ImageIcon,
  MessageSquareHeart,
  AlertTriangle,
  Check,
} from 'lucide-react';

/**
 * Çöp Kutusu: silinen anılar ve notlar 30 gün boyunca burada bekler.
 * Buradan geri getirilebilir ya da kalıcı olarak silinebilir.
 */
export default function TrashPanel({ onClose, onRestored, showToast }) {
  const dialogRef = useModalA11y({ onClose });

  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [isPurgingExpired, setIsPurgingExpired] = useState(false);
  const [confirmExpired, setConfirmExpired] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [silinenFotolar, silinenNotlar] = await Promise.all([
        getDeletedPhotos(),
        getDeletedNotes(),
      ]);
      setPhotos(sortTrash(silinenFotolar));
      setNotes(sortTrash(silinenNotlar));
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Çöp kutusu okunamadı.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [silinenFotolar, silinenNotlar] = await Promise.all([
          getDeletedPhotos(),
          getDeletedNotes(),
        ]);
        if (cancelled) return;
        setPhotos(sortTrash(silinenFotolar));
        setNotes(sortTrash(silinenNotlar));
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err.message || 'Çöp kutusu okunamadı.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const ozet = useMemo(
    () => trashStats([...photos, ...notes]),
    [photos, notes]
  );

  const handleRestore = async (tur, item) => {
    setBusyId(item.id);
    try {
      if (tur === 'photo') await restorePhoto(item.id);
      else await restoreNote(item.id);

      if (showToast) showToast('Geri getirildi 💖', 'success');
      await load();
      onRestored?.();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Geri getirilemedi.', 'error');
    } finally {
      setBusyId(null);
      setConfirmingId(null);
    }
  };

  const handlePurge = async (tur, item) => {
    if (confirmingId !== item.id) {
      setConfirmingId(item.id);
      return;
    }

    setBusyId(item.id);
    try {
      if (tur === 'photo') await purgePhoto(item);
      else await purgeNote(item.id);

      if (showToast) showToast('Kalıcı olarak silindi.', 'info');
      await load();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Kalıcı silme başarısız.', 'error');
    } finally {
      setBusyId(null);
      setConfirmingId(null);
    }
  };

  // Saklama süresi dolmuş kayıtları tek seferde kalıcı olarak siler.
  // (Otomatik silme YOKTUR: bu işlem yalnızca kullanıcı onayıyla yapılır.)
  const handlePurgeExpired = async () => {
    if (!confirmExpired) {
      setConfirmExpired(true);
      return;
    }

    const suresiGecenFotolar = photos.filter((photo) => isTrashExpired(photo.deleted_at));
    const suresiGecenNotlar = notes.filter((note) => isTrashExpired(note.deleted_at));

    setIsPurgingExpired(true);
    let silinen = 0;

    for (const photo of suresiGecenFotolar) {
      try {
        await purgePhoto(photo);
        silinen += 1;
      } catch (err) {
        console.error('Kalıcı silme hatası:', err);
      }
    }

    for (const note of suresiGecenNotlar) {
      try {
        await purgeNote(note.id);
        silinen += 1;
      } catch (err) {
        console.error('Kalıcı silme hatası (not):', err);
      }
    }

    setIsPurgingExpired(false);
    setConfirmExpired(false);

    if (showToast) {
      showToast(
        silinen > 0 ? `${silinen} kayıt kalıcı olarak silindi.` : 'Silinecek kayıt bulunamadı.',
        silinen > 0 ? 'info' : 'success'
      );
    }

    await load();
  };

  const renderPhoto = (photo) => (    <div
      key={photo.id}
      className="flex items-center gap-3 p-3 rounded-2xl border border-rose-100 bg-white/70"
    >
      <img
        src={photo.thumb_url || photo.url}
        alt={photo.caption || 'Silinen anı'}
        loading="lazy"
        className="w-14 h-14 rounded-xl object-cover shrink-0 grayscale-[35%]"
      />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-rose-950 truncate">
          {photo.caption || 'İsimsiz anı'}
        </p>
        <p className="text-[10px] text-rose-500">
          {photo.uploaded_by || ''} · {daysLeftLabel(photo.deleted_at)}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => handleRestore('photo', photo)}
          disabled={busyId === photo.id}
          className="py-1.5 px-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer disabled:opacity-60"
        >
          {busyId === photo.id ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RotateCcw className="w-3 h-3" />
          )}
          <span>Geri al</span>
        </button>

        <button
          type="button"
          onClick={() => handlePurge('photo', photo)}
          disabled={busyId === photo.id}
          className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-60 ${
            confirmingId === photo.id
              ? 'bg-red-600 text-white border border-red-600'
              : 'bg-white border border-rose-200 text-red-600 hover:bg-red-50'
          }`}
          title="Kalıcı olarak sil"
        >
          <Trash2 className="w-3 h-3" />
          <span>{confirmingId === photo.id ? 'Emin misin?' : 'Sil'}</span>
        </button>
      </div>
    </div>
  );

  const renderNote = (note) => (
    <div
      key={note.id}
      className="flex items-start gap-3 p-3 rounded-2xl border border-rose-100 bg-white/70"
    >
      <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 shrink-0">
        <MessageSquareHeart className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-rose-800 leading-relaxed line-clamp-3">{note.content}</p>
        <p className="text-[10px] text-rose-500 mt-1">
          {note.sender || ''} · {daysLeftLabel(note.deleted_at)}
        </p>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => handleRestore('note', note)}
          disabled={busyId === note.id}
          className="py-1.5 px-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer disabled:opacity-60"
        >
          {busyId === note.id ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RotateCcw className="w-3 h-3" />
          )}
          <span>Geri al</span>
        </button>

        <button
          type="button"
          onClick={() => handlePurge('note', note)}
          disabled={busyId === note.id}
          className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-60 ${
            confirmingId === note.id
              ? 'bg-red-600 text-white border border-red-600'
              : 'bg-white border border-rose-200 text-red-600 hover:bg-red-50'
          }`}
        >
          <Trash2 className="w-3 h-3" />
          <span>{confirmingId === note.id ? 'Emin misin?' : 'Sil'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-rose-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Çöp Kutusu"
        className="w-full max-w-xl glass-panel bg-white/95 rounded-3xl shadow-2xl border border-rose-200 my-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-rose-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-rose-950 font-serif">Çöp Kutusu</h3>
              <p className="text-[11px] text-rose-500 font-medium">
                {ozet.toplam} kayıt · 30 gün boyunca geri alınabilir
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-2 rounded-full text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-10 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-rose-400 mx-auto mb-2" />
              <p className="text-xs text-rose-500 font-medium">Çöp kutusu açılıyor...</p>
            </div>
          ) : ozet.toplam === 0 ? (
            <div className="py-10 text-center">
              <div className="w-14 h-14 rounded-3xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-rose-950 mb-1">Çöp kutusu boş</p>
              <p className="text-[11px] text-rose-500">
                Silinen anılar ve notlar 30 gün boyunca burada bekler.
              </p>
            </div>
          ) : (
            <>
              {ozet.suresiGecen > 0 && (
                <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {ozet.suresiGecen} kaydın 30 günlük saklama süresi doldu. Yer açmak için
                      kalıcı olarak silebilirsin. <strong>Kendiliğinden silinmez.</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handlePurgeExpired}
                    disabled={isPurgingExpired}
                    className={`mt-2.5 py-2 px-3 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                      confirmExpired
                        ? 'bg-red-600 text-white'
                        : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    {isPurgingExpired ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {confirmExpired
                        ? 'Emin misin? Geri alınamaz'
                        : `Süresi dolanları kalıcı sil (${ozet.suresiGecen})`}
                    </span>
                  </button>
                </div>
              )}

              {photos.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Anılar ({photos.length})
                  </p>
                  <div className="space-y-2">{photos.map(renderPhoto)}</div>
                </div>
              )}

              {notes.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MessageSquareHeart className="w-3.5 h-3.5" />
                    Notlar ({notes.length})
                  </p>
                  <div className="space-y-2">{notes.map(renderNote)}</div>
                </div>
              )}

              <p className="text-[10px] text-rose-400 text-center mt-4 leading-relaxed">
                <Trash2 className="w-3 h-3 inline -mt-0.5" /> ile kalıcı silinen kayıtlar bir daha
                geri getirilemez ve fotoğrafları depolama alanından da kaldırılır.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
