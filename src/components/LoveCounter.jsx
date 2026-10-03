import React, { useState, useEffect } from 'react';
import { SPECIAL_DATE, ROMANTIC_QUOTES } from '../lib/constants';
import { Sparkles, CalendarHeart } from 'lucide-react';

export default function LoveCounter() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPassed: false,
  });
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      const targetTime = new Date(SPECIAL_DATE).getTime();
      const now = new Date().getTime();
      const difference = Math.abs(targetTime - now);
      const isPassed = now > targetTime;

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPassed });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % ROMANTIC_QUOTES.length);
  };

  return (
    <div className="w-full glass-card rounded-3xl p-5 sm:p-7 relative overflow-hidden mb-6 border border-rose-200/80 shadow-xl shadow-rose-500/5">
      {/* Arka plan degrade efekti */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-rose-200/40 via-pink-100/20 to-transparent rounded-full pointer-events-none -mr-20 -mt-20 blur-2xl" />

      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
        {/* Sol Alan: Başlık ve Romantik Söz */}
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100/80 text-rose-700 text-xs font-bold mb-2.5">
            <CalendarHeart className="w-3.5 h-3.5 text-rose-500" />
            <span>29 Ağustos 2026 • Sonsuz Aşkın İmzası</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-rose-950 font-serif tracking-tight mb-2">
            Birlikte Geçen Her An Çok Kıymetli
          </h2>

          <div
            onClick={handleNextQuote}
            className="group cursor-pointer inline-flex items-center gap-2 text-rose-700 text-sm font-medium hover:text-rose-900 transition bg-rose-50/60 hover:bg-rose-100/60 p-2.5 px-4 rounded-2xl border border-rose-100/80"
            title="Başka bir aşk sözü için tıkla"
          >
            <Sparkles className="w-4 h-4 text-rose-400 group-hover:rotate-45 transition-transform shrink-0" />
            <span className="italic font-serif text-sm">
              "{ROMANTIC_QUOTES[quoteIndex]}"
            </span>
          </div>
        </div>

        {/* Sağ Alan: Romantik Sayaç Kutuları */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex flex-col items-center justify-center w-16 sm:w-20 h-20 sm:h-22 rounded-2xl glass-panel bg-white/90 border border-rose-200 shadow-sm">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-serif">
              {timeLeft.days}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rose-400">
              Gün
            </span>
          </div>

          <span className="text-rose-300 font-bold text-xl">:</span>

          <div className="flex flex-col items-center justify-center w-16 sm:w-20 h-20 sm:h-22 rounded-2xl glass-panel bg-white/90 border border-rose-200 shadow-sm">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-serif">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rose-400">
              Saat
            </span>
          </div>

          <span className="text-rose-300 font-bold text-xl">:</span>

          <div className="flex flex-col items-center justify-center w-16 sm:w-20 h-20 sm:h-22 rounded-2xl glass-panel bg-white/90 border border-rose-200 shadow-sm">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-serif">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rose-400">
              Dakika
            </span>
          </div>

          <span className="text-rose-300 font-bold text-xl">:</span>

          <div className="flex flex-col items-center justify-center w-16 sm:w-20 h-20 sm:h-22 rounded-2xl glass-panel bg-white/90 border border-rose-200 shadow-sm">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-500 font-serif">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rose-400">
              Saniye
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
