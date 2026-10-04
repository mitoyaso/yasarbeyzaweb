import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatTurkishDate } from '../../lib/utils';
import {
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Music,
  Music2,
  Maximize,
  Heart,
} from 'lucide-react';

const SLIDE_MS = 6000;

/**
 * "Bizim Filmimiz" — anılarınızı müzik eşliğinde tam ekran slayt gösterisi
 * olarak oynatır. Müzik olarak telefondaki/bilgisayardaki bir şarkı seçilebilir
 * (şarkı yüklenmez, yalnızca o an çalınır).
 */
export default function MovieMode({ photos, onClose }) {
  const slides = useMemo(
    () => (photos || []).filter((photo) => photo?.url),
    [photos]
  );

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [musicName, setMusicName] = useState('');
  const [musicFailed, setMusicFailed] = useState(false);

  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);
  const musicInputRef = useRef(null);

  const current = slides[index];

  const goNext = useCallback(() => {
    setIndex((value) => (slides.length ? (value + 1) % slides.length : 0));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setIndex((value) => (slides.length ? (value - 1 + slides.length) % slides.length : 0));
  }, [slides.length]);

  // Otomatik ilerleme
  useEffect(() => {
    if (!isPlaying || slides.length < 2) return undefined;
    const timer = setTimeout(goNext, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, index, slides.length, goNext]);

  // Klavye kısayolları
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') goNext();
      else if (event.key === 'ArrowLeft') goPrev();
      else if (event.key === ' ') {
        event.preventDefault();
        setIsPlaying((value) => !value);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, onClose]);

  // Tam ekran denemesi (tarayıcı engellerse sessizce yok sayılır)
  useEffect(() => {
    let entered = false;
    (async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          entered = true;
        }
      } catch {
        /* kullanıcı izni gerekebilir, sorun değil */
      }
    })();

    return () => {
      if (entered && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Kapanırken müziği durdur ve geçici adresi serbest bırak
  useEffect(
    () => () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    },
    []
  );

  const handleMusicPick = (file) => {
    if (!file) return;

    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    const url = URL.createObjectURL(file);
    audioUrlRef.current = url;

    setMusicName(file.name.replace(/\.[^.]+$/, ''));
    setMusicFailed(false);

    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.volume = 0.7;
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => setMusicFailed(true));
    }
  };

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio || !musicName) {
      musicInputRef.current?.click();
      return;
    }
    if (audio.paused) {
      audio.play().catch(() => setMusicFailed(true));
    } else {
      audio.pause();
    }
    setMusicFailed(false);
  };

  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-rose-950/95 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-white font-medium mb-4">Gösterilecek fotoğraf yok. 📸</p>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-full bg-white text-rose-600 text-sm font-bold cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Görsel Alanı */}
      <div className="relative flex-1 overflow-hidden">
        <img
          key={current.id}
          src={current.url}
          alt={current.caption || 'Anımız'}
          className="w-full h-full object-contain animate-kenburns"
        />

        {/* Üst Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-white/90">
            <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
            <span className="font-script text-xl sm:text-2xl">Bizim Filmimiz</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={musicInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(event) => handleMusicPick(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={toggleMusic}
              title={musicName ? `Müzik: ${musicName}` : 'Müzik seç'}
              className={`p-2 rounded-full transition cursor-pointer ${
                musicName
                  ? 'bg-rose-500/90 text-white'
                  : 'bg-white/15 text-white/80 hover:bg-white/25'
              }`}
            >
              {musicName ? <Music2 className="w-4 h-4" /> : <Music className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
              title="Tam ekran"
              className="p-2 rounded-full bg-white/15 text-white/80 hover:bg-white/25 transition cursor-pointer"
            >
              <Maximize className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="p-2 rounded-full bg-white/15 text-white/80 hover:bg-white/25 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alt Bilgi ve Kontroller */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pt-10 bg-gradient-to-t from-black/80 to-transparent">
          <div className="max-w-2xl mx-auto text-center mb-3">
            {current.caption && (
              <p className="text-white text-sm sm:text-base font-medium leading-relaxed mb-1">
                {current.caption}
              </p>
            )}
            <p className="text-white/60 text-[11px] sm:text-xs">
              {formatTurkishDate(current.created_at)}
              {current.uploaded_by ? ` • ${current.uploaded_by}` : ''}
            </p>
          </div>

          {/* İlerleme Noktaları */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setIndex(slideIndex)}
                aria-label={`${slideIndex + 1}. anı`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  slideIndex === index
                    ? 'w-6 bg-rose-400'
                    : 'w-1.5 bg-white/35 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Önceki"
              className="p-3 rounded-full bg-white/15 text-white hover:bg-white/25 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying((value) => !value)}
              aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
              className="p-4 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 hover:from-rose-600 hover:to-pink-600 transition cursor-pointer"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            <button
              type="button"
              onClick={goNext}
              aria-label="Sonraki"
              className="p-3 rounded-full bg-white/15 text-white hover:bg-white/25 transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <p className="text-center text-white/40 text-[10px] mt-3">
            {index + 1} / {slides.length}
            {musicFailed && ' • müzik çalınamadı, başka bir dosya dene'}
            {!musicName && ' • müzik için 🎵 simgesine dokun'}
          </p>
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
