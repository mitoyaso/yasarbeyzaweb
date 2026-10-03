import React, { useState, useRef } from 'react';
import { uploadPhoto } from '../../lib/supabase';
import { triggerHeartConfetti, formatBytes } from '../../lib/utils';
import { UploadCloud, Image as ImageIcon, X, Sparkles, AlertCircle } from 'lucide-react';

export default function PhotoUpload({ activeSender, onPhotoUploaded, onCancel }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      setError('Lütfen yalnızca geçerli bir fotoğraf dosyası (JPG, PNG, WebP) yükleyin.');
      return;
    }

    // Maksimum dosya boyutu: 15MB
    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('Fotoğraf boyutu 15MB\'dan küçük olmalıdır.');
      return;
    }

    setError('');
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl('');
    setCaption('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Lütfen yüklenecek bir fotoğraf seçin.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const newPhoto = await uploadPhoto({
        file,
        caption: caption.trim(),
        uploadedBy: activeSender,
      });

      triggerHeartConfetti();
      onPhotoUploaded(newPhoto);
      handleReset();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Fotoğraf yüklenirken beklenmeyen bir hata oluştu.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full glass-card rounded-3xl p-5 sm:p-7 border border-rose-200/80 shadow-xl mb-8 relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
            <UploadCloud className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-bold text-rose-950 font-serif">
            Yeni Anı Fotoğrafı Yükle
          </h3>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100/70 text-rose-800">
          <span>Yükleyen:</span>
          <span className="font-bold text-rose-600">
            {activeSender === 'Yaşar' ? '👨‍🦱 Yaşar' : '👩‍🦰 Beyza'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fotoğraf Seçme / Sürükle Bırak Alanı */}
        {!previewUrl ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] ${
              isDragging
                ? 'border-rose-500 bg-rose-100/50 scale-[1.01]'
                : 'border-rose-300/80 bg-rose-50/40 hover:bg-rose-50/80 hover:border-rose-400'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileChange(e.target.files[0])}
              accept="image/*"
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-rose-500 mb-3 group-hover:scale-110 transition-transform">
              <ImageIcon className="w-8 h-8" />
            </div>
            <p className="text-base font-bold text-rose-900 mb-1">
              Fotoğrafı Buraya Sürükleyin
            </p>
            <p className="text-xs text-rose-500 font-medium mb-3">
              veya galeriden seçmek için tıklayın
            </p>
            <button
              type="button"
              className="py-2 px-5 rounded-full bg-white border border-rose-200 text-rose-700 text-xs font-bold shadow-sm hover:bg-rose-50 transition pointer-events-none"
            >
              📁 Dosya Seç
            </button>
            <span className="text-[11px] text-rose-400/80 mt-2">
              JPG, PNG, WebP formatları (Maks. 15 MB)
            </span>
          </div>
        ) : (
          /* Önizleme Alanı */
          <div className="relative rounded-3xl overflow-hidden border border-rose-200 bg-rose-950/5">
            <img
              src={previewUrl}
              alt="Yükleme Önizlemesi"
              className="w-full max-h-[360px] object-contain rounded-2xl"
            />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-rose-800 shadow">
                {formatBytes(file?.size)}
              </span>
              <button
                type="button"
                onClick={handleReset}
                disabled={isUploading}
                className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 shadow-md transition cursor-pointer"
                title="Fotoğrafı Kaldır"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Açıklama / Anı Notu Girişi */}
        <div>
          <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-1.5 ml-1">
            Anı Notu & Açıklama (İsteğe Bağlı)
          </label>
          <textarea
            rows="2"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Bu anı ile ilgili güzel bir hatıra veya romantik bir not ekle..."
            disabled={isUploading}
            className="w-full p-3.5 glass-input rounded-2xl text-rose-950 placeholder-rose-300 text-sm font-medium resize-none"
          />
        </div>

        {/* Butonlar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isUploading}
              className="py-2.5 px-5 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 transition"
            >
              Vazgeç
            </button>
          )}

          <button
            type="submit"
            disabled={!file || isUploading}
            className={`py-3 px-6 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${
              !file || isUploading
                ? 'bg-rose-200 text-rose-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-rose-500/25 active:scale-95 cursor-pointer'
            }`}
          >
            {isUploading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Supabase'e Yükleniyor...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Anıyı Galeriye Ekle</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
