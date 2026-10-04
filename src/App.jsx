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
import InstallPrompt from './components/InstallPrompt';
import UsPanel from './components/us/UsPanel';
import MfaChallenge from './components/MfaChallenge';
import PasswordModal from './components/PasswordModal';
import { STORAGE_KEYS, SENDERS } from './lib/constants';
import { getPhotos, getNotes, isSupabaseConfigured } from './lib/supabase';
import {
  getCurrentSession,
  subscribeToAuthChanges,
  signOutUser,
  displayNameFromSession,
  sifreKisiselMi,
} from './lib/auth';
import { isMfaChallengeRequired } from './lib/mfa';
import { subscribeToLiveChanges } from './lib/realtime';
import { showLocalNotification, isPageHidden } from './lib/notifications';
import { Camera, MessageSquareHeart, Heart, AlertTriangle, Sparkles } from 'lucide-react';

export default function App() {
  // Aktif Supabase Auth oturumu (giriş yapan kullanıcı)
  const [session, setSession] = useState(null);

  // Oturumun tarayıcıdan geri yüklenmesi tamamlandı mı?
  const [isAuthReady, setIsAuthReady] = useState(!isSupabaseConfigured);

  // İki adımlı doğrulama (2FA) gerekiyor mu? (hesabında 2FA açıksa true)
  const [mfaRequired, setMfaRequired] = useState(false);

  // Şifre penceresi: ilk girişte "kendi şifreni belirle", sonra istenirse
  const [sifrePenceresi, setSifrePenceresi] = useState({ acik: false, ilkGiris: false });

  // Aktif Gönderen: GİRİŞ YAPILAN HESABA göre belirlenir (Yaşar veya Beyza).
  // Artık kullanıcı tarafından değiştirilemez; hangi hesapla girildiyse öyle kalır.
  const activeSender = displayNameFromSession(session) || SENDERS.YASAR;

  // Aktif Sekme ('photos' | 'notes' | 'counter')
  const [activeTab, setActiveTab] = useState('photos');

  // Veriler ve Durumlar
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Supabase yapılandırılmadıysa (demo modu) giriş aranmaz.
  const isAuthenticated = !isSupabaseConfigured || Boolean(session);

  // ---------------------------------------------------------------------------
  // OTURUM YÖNETİMİ (Supabase Auth)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Eski sürümden kalan "giriş yapıldı" bayrağını temizle; artık geçersiz.
    localStorage.removeItem(STORAGE_KEYS.LEGACY_IS_AUTHENTICATED);

    if (!isSupabaseConfigured) {
      // Demo modunda giriş aranmaz; isAuthReady zaten true olarak başlar.
      return undefined;
    }

    let isCancelled = false;

    getCurrentSession().then(async (restored) => {
      if (isCancelled) return;

      setSession(restored);

      // İlk girişte herkes kendi şifresini belirlesin (diğeri bilmesin)
      if (restored && !sifreKisiselMi(restored)) {
        setSifrePenceresi({ acik: true, ilkGiris: true });
      }

      if (restored) {
        // Hesabında 2FA açıksa oturum henüz tam doğrulanmamıştır (aal1).
        try {
          const needsChallenge = await isMfaChallengeRequired();
          if (!isCancelled) setMfaRequired(needsChallenge);
        } catch (err) {
          console.warn('2FA durumu kontrol edilemedi:', err);
        }
      }

      if (!isCancelled) setIsAuthReady(true);
    });

    const unsubscribe = subscribeToAuthChanges((nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

  // Giriş Başarılı Olduğunda
  const handleLoginSuccess = async (newSession) => {
    setSession(newSession ?? null);

    // İlk giriş: şifresini kendisi belirlesin
    if (newSession && !sifreKisiselMi(newSession)) {
      setSifrePenceresi({ acik: true, ilkGiris: true });
    }

    // Hesabında 2FA açıksa ikinci adım (kod) istenir.
    try {
      const needsChallenge = await isMfaChallengeRequired();
      if (needsChallenge) {
        setMfaRequired(true);
        showToast('Son adım: doğrulama kodunu gir 🛡️', 'info');
        return;
      }
    } catch (err) {
      console.warn('2FA durumu kontrol edilemedi:', err);
    }

    showToast('Hoş geldin aşkım! Seni çok seviyorum 💖', 'success');
  };

  // İki adımlı doğrulama tamamlandığında
  const handleMfaVerified = () => {
    setMfaRequired(false);
    showToast('Doğrulama başarılı, hoş geldin! 💖', 'success');
  };

  // İki adımlı doğrulamadan vazgeçilirse
  const handleMfaCancelled = () => {
    setMfaRequired(false);
    setSession(null);
  };

  // Çıkış Yap
  const handleLogout = async () => {
    await signOutUser();
    setSession(null);
    setPhotos([]);
    setNotes([]);
    setIsLoadingPhotos(true);
    setIsLoadingNotes(true);
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

  // Çöp kutusundan geri getirme sonrası verileri tazele
  const handleDataRestored = useCallback(() => {
    fetchPhotos();
    fetchNotes();
  }, [fetchPhotos, fetchNotes]);

  useEffect(() => {
    let isCancelled = false;

    if (isAuthenticated) {      getPhotos()
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

  // ---------------------------------------------------------------------------
  // CANLI AKIŞ (Realtime): partnerin eklediği yeni anı/not anında düşsün
  // (Veritabanında Realtime yayını açık değilse sessizce bekler, hata vermez.)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated || !isSupabaseConfigured) return undefined;

    const benimAdim = displayNameFromSession(session);

    const unsubscribe = subscribeToLiveChanges({
      onDegisim: async ({ tablo, olay, yeni }) => {
        try {
          if (tablo === 'photos') {
            const data = await getPhotos();
            setPhotos(data);

            // Bildirim YALNIZCA yeni kayıt eklendiğinde gösterilir.
            // (Düzenleme/silme de olay üretir; onlarda "yeni anı ekledi" demek yanlış olur.)
            const ekleyen = yeni?.uploaded_by;
            if (olay === 'INSERT' && ekleyen && benimAdim && ekleyen !== benimAdim) {
              const mesaj = `${ekleyen} yeni bir anı ekledi 💖`;
              showToast(mesaj, 'info');

              // Sekme arka plandaysa sistem bildirimi de göster
              if (isPageHidden()) {
                const sonFoto = data.find((item) => item.id === yeni?.id) ?? data[0];
                showLocalNotification({
                  title: 'Aşk Günlüğü 💖',
                  body: mesaj,
                  icon: sonFoto?.thumb_url || '/icon-192.png',
                });
              }
            }
          } else if (tablo === 'notes') {
            const data = await getNotes();
            setNotes(data);

            const yazan = yeni?.sender;
            if (olay === 'INSERT' && yazan && benimAdim && yazan !== benimAdim) {
              const mesaj = `${yazan} yeni bir aşk notu bıraktı 💌`;
              showToast(mesaj, 'info');

              if (isPageHidden()) {
                showLocalNotification({
                  title: 'Aşk Günlüğü 💖',
                  body: mesaj,
                  icon: '/icon-192.png',
                });
              }
            }
          }
        } catch (err) {
          console.warn('Canlı akış güncellemesi başarısız:', err);
        }
      },
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, session]);

  // ---------------------------------------------------------------------------
  // YEDEK TAZELEME: Sekmeye geri dönüldüğünde verileri yenile
  // (Canlı akış herhangi bir nedenle çalışmasa bile ekran taze kalır.
  //  Zamanlayıcı yok; yalnızca kullanıcı sekmeye döndüğünde ve en fazla
  //  30 saniyede bir istek yapılır.)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated || !isSupabaseConfigured) return undefined;

    let sonTazeleme = Date.now();

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - sonTazeleme < 30000) return;
      sonTazeleme = Date.now();

      getPhotos()
        .then((data) => setPhotos(data))
        .catch((err) => console.warn('Sekmeye dönüşte fotoğraflar tazelenemedi:', err));

      getNotes()
        .then((data) => setNotes(data))
        .catch((err) => console.warn('Sekmeye dönüşte notlar tazelenemedi:', err));
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated]);

  // Oturum henüz geri yüklenmediyse kısa bir bekleme ekranı göster
  if (!isAuthReady) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <FloatingHearts />
        <div className="text-center relative z-10">
          <span className="inline-block w-8 h-8 border-3 border-rose-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-rose-600">Aşk günlüğü açılıyor...</p>
        </div>
      </div>
    );
  }

  // Giriş yapılmamışsa Giriş Ekranını Göster
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen">
        <FloatingHearts />
        <LoginModal onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Hesabında iki adımlı doğrulama açıksa kodu iste
  if (mfaRequired) {
    return (
      <div className="relative min-h-screen">
        <FloatingHearts />
        <MfaChallenge onVerified={handleMfaVerified} onCancel={handleMfaCancelled} />
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

          <button
            type="button"
            onClick={() => setActiveTab('us')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'us'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25 scale-[1.02]'
                : 'glass-panel bg-white/70 text-rose-800 hover:bg-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Bizim Köşemiz</span>
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

        {activeTab === 'us' && (
          <UsPanel
            photos={photos}
            notes={notes}
            showToast={showToast}
            activeSender={activeSender}
            onPhotoPatched={(photoId, patch) =>
              setPhotos((prev) =>
                prev.map((item) => (item.id === photoId ? { ...item, ...patch } : item))
              )
            }
            onDataRestored={handleDataRestored}
            onSifreDegistir={() => setSifrePenceresi({ acik: true, ilkGiris: false })}
          />
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
      />

      {/* Supabase Bilgilendirme ve Kurulum Modalı */}
      <SupabaseInfoModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />

      {/* Telefona kurulum daveti (PWA) */}
      <InstallPrompt />

      {/* Şifre penceresi: ilk girişte zorunlu öneri, sonra isteğe bağlı */}
      {sifrePenceresi.acik && !mfaRequired && (
        <PasswordModal
          ilkGiris={sifrePenceresi.ilkGiris}
          kisiAdi={activeSender}
          showToast={showToast}
          onClose={() => setSifrePenceresi({ acik: false, ilkGiris: false })}
        />
      )}
    </div>
  );
}
