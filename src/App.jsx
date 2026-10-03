import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import LoginModal from './components/LoginModal';
import FloatingHearts from './components/FloatingHearts';
import LoveCounter from './components/LoveCounter';
import PhotoGallery from './components/gallery/PhotoGallery';
import NotesWall from './components/notes/NotesWall';
import Toast from './components/Toast';
import SupabaseInfoModal from './components/SupabaseInfoModal';
import { STORAGE_KEYS, SENDERS } from './lib/constants';
import { getPhotos, getNotes, isSupabaseConfigured } from './lib/supabase';
import { Camera, MessageSquareHeart, Heart, AlertTriangle } from 'lucide-react';

export default function App() {
  // Giriş Durumu
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === 'true';
  });

  // Aktif Gönderen (Yaşar veya Beyza)
  const [activeSender, setActiveSender] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SENDER) || SENDERS.YASAR;
  });

  // Aktif Sekme ('photos' | 'notes' | 'counter')
  const [activeTab, setActiveTab] = useState('photos');

  // Veriler ve Durumlar
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Giriş Başarılı Olduğunda
  const handleLoginSuccess = () => {
    localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
    setIsAuthenticated(true);
    showToast('Hoş geldin aşkım! Seni çok seviyorum 💖', 'success');
  };

  // Çıkış Yap
  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    setIsAuthenticated(false);
  };

  // Göndereni Değiştir
  const handleToggleSender = (newSender) => {
    setActiveSender(newSender);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SENDER, newSender);
    showToast(`Aktif Gönderen: ${newSender} olarak ayarlandı ✨`, 'info');
  };

  // Toast Bildirimi Göster
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Fotoğrafları Getir
  const fetchPhotos = useCallback(async () => {
    setIsLoadingPhotos(true);
    try {
      const data = await getPhotos();
      setPhotos(data);
    } catch (err) {
      console.error(err);
      showToast('Fotoğraflar alınamadı: ' + err.message, 'error');
    } finally {
      setIsLoadingPhotos(false);
    }
  }, []);

  // Notları Getir
  const fetchNotes = useCallback(async () => {
    setIsLoadingNotes(true);
    try {
      const data = await getNotes();
      setNotes(data);
    } catch (err) {
      console.error(err);
      showToast('Notlar alınamadı: ' + err.message, 'error');
    } finally {
      setIsLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (isAuthenticated) {
      getPhotos()
        .then((data) => {
          if (!isCancelled) {
            setPhotos(data);
            setIsLoadingPhotos(false);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            setIsLoadingPhotos(false);
            showToast('Fotoğraflar alınamadı: ' + err.message, 'error');
          }
        });

      getNotes()
        .then((data) => {
          if (!isCancelled) {
            setNotes(data);
            setIsLoadingNotes(false);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            setIsLoadingNotes(false);
            showToast('Notlar alınamadı: ' + err.message, 'error');
          }
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated]);

  // Giriş yapılmamışsa Giriş Ekranını Göster
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen">
        <FloatingHearts />
        <LoginModal onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative pb-20 sm:pb-10">
      {/* Arka Plan Uçuşan Kalpler */}
      <FloatingHearts />

      {/* Toast Bildirim Kutusu */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Üst Gezinme Çubuğu */}
      <Navbar
        activeSender={activeSender}
        onToggleSender={handleToggleSender}
        onLogout={handleLogout}
        onOpenConfigInfo={() => setShowConfigModal(true)}
      />

      {/* Supabase Bağlantı Uyarısı Banner'ı (Girilmediyse Bilgi Verir) */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-100/90 border-b border-amber-200 text-amber-900 px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Demo Modu: Supabase anahtarları henüz girilmedi. Veriler yerel hafızada saklanıyor.
          </span>
          <button
            onClick={() => setShowConfigModal(true)}
            className="underline text-amber-950 font-bold hover:text-amber-800 ml-1 cursor-pointer"
          >
            Nasıl Bağlanır?
          </button>
        </div>
      )}

      {/* Ana İçerik */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 z-10">
        {/* Romantik Aşk Sayacı ve Günün Sözü */}
        <LoveCounter />

        {/* Masaüstü Sekme Seçici Butonları */}
        <div className="hidden sm:flex items-center justify-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'photos'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25 scale-[1.02]'
                : 'glass-panel bg-white/70 text-rose-800 hover:bg-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Fotoğraf Galerisi ({photos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25 scale-[1.02]'
                : 'glass-panel bg-white/70 text-rose-800 hover:bg-white'
            }`}
          >
            <MessageSquareHeart className="w-4 h-4" />
            <span>Aşk Notları Duvarı ({notes.length})</span>
          </button>
        </div>

        {/* Sekme İçerikleri */}
        {activeTab === 'photos' && (
          <PhotoGallery
            photos={photos}
            activeSender={activeSender}
            isLoading={isLoadingPhotos}
            onRefresh={fetchPhotos}
            onPhotoUploaded={(newPhoto) => setPhotos((prev) => [newPhoto, ...prev])}
            onPhotoDeleted={(photoId) =>
              setPhotos((prev) => prev.filter((p) => p.id !== photoId))
            }
            onPhotoUpdated={(photoId, newCaption) =>
              setPhotos((prev) =>
                prev.map((p) => (p.id === photoId ? { ...p, caption: newCaption } : p))
              )
            }
            showToast={showToast}
          />
        )}

        {activeTab === 'notes' && (
          <NotesWall
            notes={notes}
            activeSender={activeSender}
            isLoading={isLoadingNotes}
            onRefresh={fetchNotes}
            onNoteAdded={(newNote) => setNotes((prev) => [newNote, ...prev])}
            onNoteDeleted={(noteId) =>
              setNotes((prev) => prev.filter((n) => n.id !== noteId))
            }
            showToast={showToast}
          />
        )}

        {activeTab === 'counter' && (
          <div className="sm:hidden mt-2">
            <NotesWall
              notes={notes}
              activeSender={activeSender}
              isLoading={isLoadingNotes}
              onRefresh={fetchNotes}
              onNoteAdded={(newNote) => setNotes((prev) => [newNote, ...prev])}
              onNoteDeleted={(noteId) =>
                setNotes((prev) => prev.filter((n) => n.id !== noteId))
              }
              showToast={showToast}
            />
          </div>
        )}
      </main>

      {/* Alt Bilgi / Footer */}
      <footer className="w-full text-center py-6 text-xs text-rose-600/70 border-t border-rose-200/50 mt-10">
        <p className="flex items-center justify-center gap-1.5 font-medium">
          <span>Yaşar</span>
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
          <span>Beyza</span>
          <span className="text-rose-300">•</span>
          <span className="font-script text-base text-rose-600">Sonsuza Dek Birlikte</span>
        </p>
      </footer>

      {/* Mobil Öncelikli Alt Gezinme Çubuğu */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeSender={activeSender}
        onToggleSender={handleToggleSender}
      />

      {/* Supabase Bilgilendirme ve Kurulum Modalı */}
      <SupabaseInfoModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
}
