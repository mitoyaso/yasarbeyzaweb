import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getCounts, backfillMissingThumbnails, isLocationAvailable } from '../../lib/supabase';
import { isQuizAvailable, fetchQuizAnswers, quizProgress } from '../../lib/quiz';
import QuizModal from './QuizModal';
import MemoryMap from './MemoryMap';
import { computeStats, computeAchievements } from '../../lib/achievements';
import { exportDataOnly, exportFullBackup } from '../../lib/backup';
import MemoryGame from './MemoryGame';
import MovieMode from './MovieMode';
import SecurityPanel from './SecurityPanel';
import NotificationSettings from './NotificationSettings';
import {
  Camera,
  MessageSquareHeart,
  Heart,
  Trophy,
  Gamepad2,
  Film,
  Archive,
  Download,
  RefreshCw,
  Lock,
  CheckCircle2,
  Flame,
  CalendarHeart,
  Loader2,
  ShieldCheck,
  Zap,
  Sparkles,
  Map as MapIcon,
} from 'lucide-react';

const LAST_BACKUP_KEY = 'yasar_beyza_last_backup_v1';
const BACKUP_REMINDER_DAYS = 30;

function formatDateTime(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UsPanel({
  photos = [],
  notes = [],
  showToast,
  activeSender = 'Yaşar',
  onPhotoPatched,
}) {
  const [counts, setCounts] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [isMovieOpen, setIsMovieOpen] = useState(false);
  const [backup, setBackup] = useState({ running: false, message: '' });
  const [thumbs, setThumbs] = useState({ running: false, message: '' });
  const [quizAvailable, setQuizAvailable] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizRows, setQuizRows] = useState([]);
  const [locationAvailable, setLocationAvailable] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState(() => localStorage.getItem(LAST_BACKUP_KEY));
  // Yaş hesaplaması için "şimdi" değeri bir kez alınır (render sırasında impure çağrı olmasın)
  const [nowTs] = useState(() => Date.now());

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      setCounts(await getCounts());
    } catch (err) {
      console.error(err);
      if (showToast) showToast('İstatistikler alınamadı: ' + err.message, 'error');
    } finally {
      setIsLoadingStats(false);
    }
  }, [showToast]);

  // İlk yükleme: effect içinde senkron setState yapmadan, söz zinciriyle
  useEffect(() => {
    let cancelled = false;

    getCounts()
      .then((data) => {
        if (!cancelled) setCounts(data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStats(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Quiz bölümü yalnızca quiz_answers tablosu varsa gösterilir
  // (Faz 3 SQL'i çalıştırılmadıysa bölüm tamamen gizli kalır).
  const refreshQuiz = useCallback(async () => {
    try {
      setQuizRows(await fetchQuizAnswers());
    } catch (err) {
      console.warn('Quiz cevapları okunamadı:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    isQuizAvailable()
      .then((ok) => {
        if (cancelled || !ok) return undefined;
        setQuizAvailable(true);
        return fetchQuizAnswers().then((rows) => {
          if (!cancelled) setQuizRows(rows);
        });
      })
      .catch((err) => console.warn('Quiz kontrolü başarısız:', err));

    return () => {
      cancelled = true;
    };
  }, []);

  // Anı haritası yalnızca latitude/longitude sütunları varsa gösterilir.
  useEffect(() => {
    let cancelled = false;

    isLocationAvailable()
      .then((ok) => {
        if (!cancelled && ok) setLocationAvailable(true);
      })
      .catch((err) => console.warn('Konum özelliği kontrolü başarısız:', err));

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(
    () => computeStats({ counts: counts ?? {}, photos, notes }),
    [counts, photos, notes]
  );

  const achievements = useMemo(() => computeAchievements(stats), [stats]);
  const unlockedCount = achievements.filter((item) => item.unlocked).length;

  const quizDurum = useMemo(
    () => quizProgress(quizRows, activeSender),
    [quizRows, activeSender]
  );

  const backupAge = useMemo(() => {
    if (!lastBackupAt) return null;
    const date = new Date(lastBackupAt);
    if (Number.isNaN(date.getTime())) return null;
    return Math.floor((nowTs - date.getTime()) / (24 * 60 * 60 * 1000));
  }, [lastBackupAt, nowTs]);

  const needsBackup = lastBackupAt === null || (backupAge !== null && backupAge >= BACKUP_REMINDER_DAYS);

  const markBackedUp = () => {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_BACKUP_KEY, now);
    setLastBackupAt(now);
  };

  const handleFullBackup = async () => {
    if (backup.running) return;
    setBackup({ running: true, message: 'Hazırlanıyor...' });

    try {
      const result = await exportFullBackup({
        onProgress: ({ mesaj }) => setBackup({ running: true, message: mesaj }),
      });

      markBackedUp();
      setBackup({ running: false, message: '' });

      if (showToast) {
        const eksik = result.missingCount > 0 ? ` (${result.missingCount} dosya indirilemedi)` : '';
        showToast(`Yedek indirildi: ${result.photos} fotoğraf, ${result.notes} not${eksik} 💾`, 'success');
      }
    } catch (err) {
      console.error(err);
      setBackup({ running: false, message: '' });
      if (showToast) showToast('Yedek alınamadı: ' + err.message, 'error');
    }
  };

  const handleDataOnly = async () => {    if (backup.running) return;
    setBackup({ running: true, message: 'Veriler hazırlanıyor...' });

    try {
      const result = await exportDataOnly();
      markBackedUp();
      setBackup({ running: false, message: '' });
      if (showToast) {
        showToast(
          `Veri yedeği indirildi: ${result.photos} fotoğraf kaydı, ${result.notes} not, ${result.comments} yorum 📄`,
          'success'
        );
      }
    } catch (err) {
      console.error(err);
      setBackup({ running: false, message: '' });
      if (showToast) showToast('Veri yedeği alınamadı: ' + err.message, 'error');
    }
  };

  // Eski fotoğraflar için önizleme (thumbnail) üretimi
  const handleThumbnailBackfill = async () => {
    if (thumbs.running) return;
    setThumbs({ running: true, message: 'Fotoğraflar kontrol ediliyor...' });

    try {
      const result = await backfillMissingThumbnails({
        onProgress: ({ mesaj }) => setThumbs({ running: true, message: mesaj }),
      });

      setThumbs({ running: false, message: '' });

      if (showToast) {
        if (result.eksikOlan === 0) {
          showToast('Tüm fotoğrafların önizlemesi zaten var ✅', 'success');
        } else if (result.basarisiz > 0) {
          showToast(
            `${result.olusturulan} önizleme oluşturuldu, ${result.basarisiz} tanesi başarısız oldu.`,
            'info'
          );
        } else {
          showToast(`${result.olusturulan} fotoğraf için önizleme oluşturuldu ⚡`, 'success');
        }
      }
    } catch (err) {
      console.error(err);
      setThumbs({ running: false, message: '' });
      if (showToast) showToast('Önizleme oluşturulamadı: ' + err.message, 'error');
    }
  };

  const statCards = [
    { id: 'photos', label: 'Anı', value: stats.counts.photos, icon: Camera, tone: 'from-rose-500 to-pink-500' },
    { id: 'notes', label: 'Aşk Notu', value: stats.counts.notes, icon: MessageSquareHeart, tone: 'from-pink-500 to-fuchsia-500' },
    { id: 'comments', label: 'Yorum', value: stats.counts.comments, icon: MessageSquareHeart, tone: 'from-fuchsia-500 to-purple-500' },
    { id: 'likes', label: 'Kalp', value: stats.counts.likes, icon: Heart, tone: 'from-rose-600 to-red-500' },
  ];

  return (
    <div className="w-full space-y-8">
      {/* Başlık */}
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-extrabold text-rose-950 font-serif mb-1">
          Bizim Köşemiz
        </h2>
        <p className="text-xs sm:text-sm text-rose-600/80">
          İstatistiklerimiz, başarımlarımız, oyunlarımız ve yedeklerimiz bir arada.
        </p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="glass-card rounded-3xl p-4 border border-rose-200/70 text-center relative overflow-hidden"
            >
              <div
                className={`w-10 h-10 mx-auto rounded-2xl bg-gradient-to-tr ${card.tone} flex items-center justify-center text-white shadow-md mb-2`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-extrabold text-rose-950 leading-none">
                {isLoadingStats && counts === null ? '—' : card.value}
              </p>
              <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider mt-1">
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Süre ve seri bilgisi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-rose-200/70 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <CalendarHeart className="w-4 h-4" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-rose-950 leading-none">
              {stats.daysTogether} gün
            </p>
            <p className="text-[11px] text-rose-500 font-semibold">birlikte geçen süre</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-rose-200/70 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-rose-950 leading-none">
              {stats.longestStreak} gün
            </p>
            <p className="text-[11px] text-rose-500 font-semibold">en uzun seri</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-rose-200/70 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-rose-950 leading-none">
              {unlockedCount}/{achievements.length}
            </p>
            <p className="text-[11px] text-rose-500 font-semibold">kazanılan başarım</p>
          </div>
        </div>
      </div>

      {/* Başarımlar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base sm:text-lg font-bold text-rose-950 font-serif flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Başarımlar
          </h3>
          <button
            type="button"
            onClick={loadStats}
            title="Yenile"
            className="p-2 rounded-xl text-rose-500 hover:text-rose-800 hover:bg-rose-100/60 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl p-3.5 border flex items-center gap-3 transition ${
                item.unlocked
                  ? 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-300 shadow-sm'
                  : 'bg-white/60 border-rose-100'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                  item.unlocked ? 'bg-white shadow-sm' : 'bg-rose-50 grayscale opacity-60'
                }`}
              >
                {item.unlocked ? item.icon : <Lock className="w-4 h-4 text-rose-300" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p
                    className={`text-sm font-bold truncate ${
                      item.unlocked ? 'text-rose-950' : 'text-rose-400'
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.unlocked && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-rose-500/90 truncate">{item.description}</p>

                {!item.unlocked && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-rose-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-400"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-rose-400 tabular-nums">
                      {item.value}/{item.target}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Eğlence */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-rose-950 font-serif mb-3 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-rose-500" />
          Eğlence
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsGameOpen(true)}
            className="glass-card glass-card-hover rounded-3xl p-5 border border-rose-200/70 text-left cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md mb-3">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <p className="font-bold text-rose-950 mb-0.5">Anı Eşleştirme Oyunu</p>
            <p className="text-[11px] sm:text-xs text-rose-600/80 leading-relaxed">
              Kendi fotoğraflarınızla hafıza oyunu. Eşleri en az hamlede bul!
            </p>
          </button>

          <button
            type="button"
            onClick={() => setIsMovieOpen(true)}
            className="glass-card glass-card-hover rounded-3xl p-5 border border-rose-200/70 text-left cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-purple-500 flex items-center justify-center text-white shadow-md mb-3">
              <Film className="w-5 h-5" />
            </div>
            <p className="font-bold text-rose-950 mb-0.5">Bizim Filmimiz</p>
            <p className="text-[11px] sm:text-xs text-rose-600/80 leading-relaxed">
              Anılarınız tam ekran slayt gösterisi olsun. Kendi şarkınızı da seçebilirsiniz.
            </p>
          </button>

          {quizAvailable && (
            <button
              type="button"
              onClick={() => setIsQuizOpen(true)}
              className="glass-card glass-card-hover rounded-3xl p-5 border border-rose-200/70 text-left cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-md mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="font-bold text-rose-950 mb-0.5">Birbirini Tanıma Testi</p>
              <p className="text-[11px] sm:text-xs text-rose-600/80 leading-relaxed">
                {quizDurum.tamamlanan}/{quizDurum.toplam} soru tamamlandı · Tahminlerin
                eşleşirse puan kazanırsın.
              </p>
            </button>
          )}

          {locationAvailable && (
            <button
              type="button"
              onClick={() => setIsMapOpen(true)}
              className="glass-card glass-card-hover rounded-3xl p-5 border border-rose-200/70 text-left cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-md mb-3">
                <MapIcon className="w-5 h-5" />
              </div>
              <p className="font-bold text-rose-950 mb-0.5">Anı Haritası</p>
              <p className="text-[11px] sm:text-xs text-rose-600/80 leading-relaxed">
                Anılarınızın yerlerini haritada görün; konum eklemek için haritada dokunun.
              </p>
            </button>
          )}
        </div>
      </div>

      {/* Yedekleme */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-rose-950 font-serif mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Anılarımızı Koru
        </h3>

        <div
          className={`glass-card rounded-3xl p-5 border ${
            needsBackup ? 'border-amber-300' : 'border-rose-200/70'
          }`}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-rose-950 mb-0.5">
                Anıların bir kopyasını kendi cihazına indir
              </p>
              <p className="text-[11px] sm:text-xs text-rose-600/85 leading-relaxed">
                Anılar bulutta tek kopya hâlinde duruyor. Bu yedek, tüm fotoğraf dosyalarını ve
                notları bir ZIP arşivi olarak telefonuna/bilgisayarına indirir.
              </p>

              <p className="text-[11px] font-semibold mt-2">
                {lastBackupAt ? (
                  <span className={needsBackup ? 'text-amber-600' : 'text-emerald-600'}>
                    Son yedek: {formatDateTime(lastBackupAt)}
                    {backupAge !== null && ` (${backupAge} gün önce)`}
                    {needsBackup && ' — yenilemek iyi olur'}
                  </span>
                ) : (
                  <span className="text-amber-600">Henüz hiç yedek alınmadı</span>
                )}
              </p>
            </div>
          </div>

          {backup.running && (
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 rounded-xl px-3 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{backup.message}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleFullBackup}
              disabled={backup.running}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
            >
              <Download className="w-4 h-4" />
              <span>Tam Yedek İndir (ZIP)</span>
            </button>

            <button
              type="button"
              onClick={handleDataOnly}
              disabled={backup.running}
              className="py-3 px-4 rounded-2xl bg-white border border-rose-200 text-rose-700 font-bold text-xs sm:text-sm hover:bg-rose-50 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
            >
              <Download className="w-4 h-4" />
              <span>Sadece Veriler (JSON)</span>
            </button>
          </div>

          {/* Bakım */}
          <div className="mt-4 pt-4 border-t border-rose-100">
            <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-2">
              Bakım
            </p>
            <p className="text-[11px] text-rose-600/85 leading-relaxed mb-2.5">
              Küçük önizleme özelliği eklenmeden önce yüklenen fotoğraflar tam boy yüklenir.
              Bu buton onlar için önizleme üretir; galeri belirgin şekilde hızlanır ve
              aylık trafik kotası korunur.
            </p>

            {thumbs.running && (
              <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 rounded-xl px-3 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{thumbs.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleThumbnailBackfill}
              disabled={thumbs.running}
              className="py-2.5 px-4 rounded-2xl bg-white border border-rose-200 text-rose-700 font-bold text-xs hover:bg-rose-50 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Eski fotoğraflara önizleme ekle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Güvenlik */}
      <SecurityPanel showToast={showToast} />

      {/* Bildirimler */}
      <NotificationSettings showToast={showToast} />

      {isGameOpen && (
        <MemoryGame
          photos={photos}
          showToast={showToast}
          onClose={() => setIsGameOpen(false)}
        />
      )}

      {isMovieOpen && <MovieMode photos={photos} onClose={() => setIsMovieOpen(false)} />}

      {isQuizOpen && (
        <QuizModal
          sender={activeSender}
          onClose={() => {
            setIsQuizOpen(false);
            refreshQuiz();
          }}
        />
      )}

      {isMapOpen && (
        <MemoryMap
          photos={photos}
          showToast={showToast}
          onPhotoUpdated={onPhotoPatched}
          onClose={() => setIsMapOpen(false)}
        />
      )}
    </div>
  );
}
