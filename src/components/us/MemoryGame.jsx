import React, { useEffect, useMemo, useRef, useState } from 'react';
import { triggerHeartConfetti } from '../../lib/utils';
import { X, RefreshCw, Trophy, Timer, MousePointerClick, Heart } from 'lucide-react';

const PHOTO_LIMIT = 6;

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Anı Eşleştirme Oyunu — kendi fotoğraflarınızla hafıza oyunu.
 * Aynı fotoğraftan ikişer kart olur; eşleri bulmaya çalışırsınız.
 */
export default function MemoryGame({ photos, onClose, showToast }) {
  const [round, setRound] = useState(0);
  const [flipped, setFlipped] = useState([]);
  const [matchedKeys, setMatchedKeys] = useState([]);
  const [moves, setMoves] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const timeouts = useRef([]);

  const usablePhotos = useMemo(
    () => (photos || []).filter((photo) => photo?.thumb_url || photo?.url),
    [photos]
  );

  const cards = useMemo(() => {
    const chosen = shuffle(usablePhotos).slice(0, PHOTO_LIMIT);
    return shuffle([...chosen, ...chosen]).map((photo, index) => ({
      key: `${photo.id}-${index}`,
      photo,
      image: photo.thumb_url || photo.url,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usablePhotos, round]);

  const isDone = cards.length > 0 && matchedKeys.length === cards.length;

  // Süre sayacı
  useEffect(() => {
    if (isDone || cards.length === 0) return undefined;
    const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [isDone, cards.length]);

  // Bileşen kapanırken bekleyen zamanlayıcıları temizle
  useEffect(
    () => () => {
      timeouts.current.forEach(clearTimeout);
    },
    []
  );

  const startNewGame = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    setFlipped([]);
    setMatchedKeys([]);
    setMoves(0);
    setSeconds(0);
    setIsBusy(false);
    setRound((value) => value + 1);
  };

  const handleFlip = (card, index) => {
    if (isBusy || isDone) return;
    if (flipped.includes(index) || matchedKeys.includes(card.key)) return;

    const nextFlipped = [...flipped, index];
    setFlipped(nextFlipped);

    if (nextFlipped.length < 2) return;

    setMoves((value) => value + 1);
    const [firstIndex, secondIndex] = nextFlipped;
    const firstCard = cards[firstIndex];
    const secondCard = cards[secondIndex];

    if (firstCard.photo.id === secondCard.photo.id) {
      const nextMatched = [...matchedKeys, firstCard.key, secondCard.key];
      setMatchedKeys(nextMatched);
      setFlipped([]);

      if (nextMatched.length === cards.length) {
        triggerHeartConfetti();
        if (showToast) showToast('Tebrikler, tüm eşleri buldun! 🏆💖', 'success');
      }
      return;
    }

    setIsBusy(true);
    const timeout = setTimeout(() => {
      setFlipped([]);
      setIsBusy(false);
    }, 850);
    timeouts.current.push(timeout);
  };

  const formatTime = (total) =>
    `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-rose-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl glass-panel bg-white/95 rounded-3xl shadow-2xl border border-rose-200 my-auto">
        {/* Başlık */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-rose-100">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-rose-950 font-serif flex items-center gap-2">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
              Anı Eşleştirme Oyunu
            </h3>
            <p className="text-[11px] sm:text-xs text-rose-500 font-medium mt-0.5">
              Aynı anıların eşlerini bul
            </p>
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

        {usablePhotos.length < 3 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-rose-700 font-medium">
              Oynamak için en az 3 fotoğraf gerekiyor. Şu an {usablePhotos.length} fotoğraf var. 📸
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            {/* Skor Tablosu */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100/80 text-rose-700 text-[11px] sm:text-xs font-bold">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  {moves} hamle
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100/80 text-rose-700 text-[11px] sm:text-xs font-bold">
                  <Timer className="w-3.5 h-3.5" />
                  {formatTime(seconds)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100/80 text-rose-700 text-[11px] sm:text-xs font-bold">
                  <Trophy className="w-3.5 h-3.5" />
                  {matchedKeys.length / 2}/{cards.length / 2}
                </span>
              </div>

              <button
                type="button"
                onClick={startNewGame}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-rose-200 text-rose-600 text-[11px] sm:text-xs font-bold hover:bg-rose-50 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Yeni Oyun
              </button>
            </div>

            {/* Kart Alanı */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
              {cards.map((card, index) => {
                const isFlipped = flipped.includes(index) || matchedKeys.includes(card.key);
                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => handleFlip(card, index)}
                    disabled={isFlipped || isBusy || isDone}
                    className="flip-scene aspect-square w-full cursor-pointer disabled:cursor-default"
                    aria-label="Anı kartı"
                  >
                    <div className={`flip-inner ${isFlipped ? 'is-flipped' : ''}`}>
                      {/* Arka yüz (kapalı) */}
                      <div className="flip-face rounded-2xl bg-gradient-to-br from-rose-400 via-rose-500 to-pink-500 flex items-center justify-center shadow-md border border-rose-300">
                        <Heart className="w-6 h-6 sm:w-8 sm:h-8 fill-white/90 text-white/90" />
                      </div>

                      {/* Ön yüz (fotoğraf) */}
                      <div
                        className={`flip-face flip-face-back rounded-2xl overflow-hidden border-2 ${
                          matchedKeys.includes(card.key)
                            ? 'border-emerald-400 shadow-lg shadow-emerald-500/20'
                            : 'border-rose-200'
                        }`}
                      >
                        <img
                          src={card.image}
                          alt="Anı"
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        {matchedKeys.includes(card.key) && (
                          <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Kazanma Durumu */}
            {isDone && (
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-center animate-soft-in">
                <p className="font-extrabold text-base sm:text-lg mb-1">
                  🎉 Tüm eşleri buldun!
                </p>
                <p className="text-xs sm:text-sm font-medium opacity-95">
                  {moves} hamlede, {formatTime(seconds)} sürede tamamladın.
                </p>
                <button
                  type="button"
                  onClick={startNewGame}
                  className="mt-3 py-2 px-5 rounded-full bg-white text-rose-600 text-xs font-bold shadow-md hover:bg-rose-50 transition cursor-pointer"
                >
                  Tekrar Oyna
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
