import React, { useState } from 'react';
import PhotoCard from './PhotoCard';
import PhotoUpload from './PhotoUpload';
import PhotoLightbox from './PhotoLightbox';
import EditCaptionModal from './EditCaptionModal';
import ConfirmModal from '../ConfirmModal';
import { deletePhoto, updatePhotoCaption } from '../../lib/supabase';
import { Camera, Plus, Filter, RefreshCw } from 'lucide-react';

export default function PhotoGallery({
  photos,
  activeSender,
  isLoading,
  onRefresh,
  onPhotoUploaded,
  onPhotoDeleted,
  onPhotoUpdated,
  showToast,
}) {
  const [filterSender, setFilterSender] = useState('ALL');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [deletingPhoto, setDeletingPhoto] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingCaption, setIsUpdatingCaption] = useState(false);

  // Filtreleme
  const filteredPhotos = photos.filter((photo) => {
    if (filterSender === 'Yaşar') return photo.uploaded_by === 'Yaşar';
    if (filterSender === 'Beyza') return photo.uploaded_by === 'Beyza';
    return true;
  });

  // Fotoğraf Silme Onayı
  const handleConfirmDelete = async () => {
    if (!deletingPhoto) return;
    setIsDeleting(true);

    try {
      await deletePhoto(deletingPhoto);
      onPhotoDeleted(deletingPhoto.id);
      showToast('Anı fotoğrafı başarıyla silindi 🌸', 'success');
      setDeletingPhoto(null);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Fotoğraf silinirken bir hata oluştu.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Açıklama Güncelleme
  const handleSaveCaption = async (newCaption) => {
    if (!editingPhoto) return;
    setIsUpdatingCaption(true);

    try {
      await updatePhotoCaption(editingPhoto.id, newCaption);
      onPhotoUpdated(editingPhoto.id, newCaption);
      showToast('Açıklama başarıyla güncellendi ✨', 'success');
      setEditingPhoto(null);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Açıklama güncellenemedi.', 'error');
    } finally {
      setIsUpdatingCaption(false);
    }
  };

  return (
    <div className="w-full">
      {/* Galeri Üst Kontrol Barı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-rose-950 font-serif">
              Aşk Albümümüz
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
              {filteredPhotos.length} Anı
            </span>
          </div>
          <p className="text-xs sm:text-sm text-rose-600/80">
            Birlikte yaşadığımız en özel ve güzel anların ölümsüzleştiği yer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Yenile Butonu */}
          <button
            type="button"
            onClick={onRefresh}
            title="Fotoğrafları Yenile"
            className="p-2.5 rounded-2xl glass-panel bg-white/80 text-rose-500 hover:text-rose-800 hover:bg-white transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Yeni Anı Ekle Butonu */}
          <button
            type="button"
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="flex-1 sm:flex-none py-2.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-500/25 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {showUploadForm ? (
              <span>Yükleme Alanını Kapat</span>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Yeni Fotoğraf Yükle</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Yükleme Formu Açılır Alanı */}
      {showUploadForm && (
        <PhotoUpload
          activeSender={activeSender}
          onPhotoUploaded={(newPhoto) => {
            onPhotoUploaded(newPhoto);
            setShowUploadForm(false);
            showToast('Harika bir anı albümümüze eklendi! 💖', 'success');
          }}
          onCancel={() => setShowUploadForm(false)}
        />
      )}

      {/* Filtreleme Sekmeleri */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-rose-400 flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtre:</span>
        </span>

        {[
          { id: 'ALL', label: 'Tüm Anılarımız' },
          { id: 'Yaşar', label: '👨‍🦱 Yaşar' },
          { id: 'Beyza', label: '👩‍🦰 Beyza' },
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

      {/* Fotoğraf Grid Alanı */}
      {isLoading && photos.length === 0 ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-3 border-rose-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-rose-600">
            Anılarımız yükleniyor, lütfen bekleyin...
          </p>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-rose-200/80 my-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 mx-auto mb-4">
            <Camera className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-rose-950 font-serif mb-2">
            Henüz Fotoğraf Yok
          </h3>
          <p className="text-xs sm:text-sm text-rose-600/80 max-w-sm mx-auto mb-5">
            Bu kategoride henüz bir fotoğraf eklenmemiş. Hemen ilk anıyı yükleyerek galeriyi başlatın!
          </p>
          <button
            type="button"
            onClick={() => setShowUploadForm(true)}
            className="py-2.5 px-5 rounded-full bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 transition cursor-pointer"
          >
            İlk Fotoğrafı Yükle 📸
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredPhotos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              activeSender={activeSender}
              onOpenLightbox={(p) => setActiveLightboxPhoto(p)}
              onEditCaption={(p) => setEditingPhoto(p)}
              onDeleteRequest={(p) => setDeletingPhoto(p)}
            />
          ))}
        </div>
      )}

      {/* Lightbox / Büyütme Modalı */}
      {activeLightboxPhoto && (
        <PhotoLightbox
          photo={activeLightboxPhoto}
          onClose={() => setActiveLightboxPhoto(null)}
        />
      )}

      {/* Açıklama Düzenleme Modalı */}
      {editingPhoto && (
        <EditCaptionModal
          isOpen={Boolean(editingPhoto)}
          currentCaption={editingPhoto.caption}
          onSave={handleSaveCaption}
          onCancel={() => setEditingPhoto(null)}
          isLoading={isUpdatingCaption}
        />
      )}

      {/* Silme Onay Penceresi (Türkçe Onay Modalı) */}
      <ConfirmModal
        isOpen={Boolean(deletingPhoto)}
        title="Anıyı Sil"
        message="Bu anıyı silmek istediğine emin misin?"
        subtext="Bu işlem geri alınamaz. Fotoğraf hem Supabase Storage depolama alanından hem de veritabanından kalıcı olarak kaldırılacaktır."
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingPhoto(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
