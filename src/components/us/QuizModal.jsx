import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createDailyQuizRound,
  selfKey,
  guessKey,
  computeQuizScore,
  fetchQuizAnswers,
  saveQuizAnswers,
} from '../../lib/quiz';
import { useModalA11y } from '../../lib/useModalA11y';
import { triggerHeartConfetti } from '../../lib/utils';
import {
  X,
  Heart,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Trophy,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const INTRO_STEP = 0;

export default function QuizModal({ sender, onClose }) {
  const partner = sender === 'Yaşar' ? 'Beyza' : 'Yaşar';
  const dialogRef = useModalA11y({ onClose });

  const [step, setStep] = useState(INTRO_STEP);
  const [answers, setAnswers] = useState({});
  const [allAnswers, setAllAnswers] = useState([]);
  const answersTouched = useRef(false);
  const [questionRound] = useState(() => createDailyQuizRound());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const questions = useMemo(
    () => questionRound.questions.map((question) => ({
      ...question,
      id: `${questionRound.id}:${question.id}`,
    })),
    [questionRound]
  );
  const total = questions.length;
  const resultsStep = total + 1;

  // Gelen cevapları bu turdaki sorulara uygula.
  const applyRows = useCallback((rows, activeQuestions) => {
    setAllAnswers(rows);

    const mine = {};
    for (const question of activeQuestions) {
      mine[question.id] = {
        self:
          rows.find((r) => r.question_key === selfKey(question.id) && r.sender === sender)
            ?.answer ?? '',
        guess:
          rows.find((r) => r.question_key === guessKey(question.id) && r.sender === sender)
            ?.answer ?? '',
      };
    }
    setAnswers(mine);
  }, [sender]);

  // İlk yükleme: effect içinde senkron setState yapmadan
  useEffect(() => {
    let cancelled = false;

    fetchQuizAnswers()
      .then((rows) => {
        if (!cancelled) {
          if (answersTouched.current) setAllAnswers(rows);
          else applyRows(rows, questions);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError(err.message || 'Cevaplar yüklenemedi.');
      });

    return () => {
      cancelled = true;
    };
  }, [applyRows, questions]);

  const score = useMemo(() => computeQuizScore(allAnswers, questions), [allAnswers, questions]);

  const currentQuestion = step >= 1 && step <= total ? questions[step - 1] : null;
  const current = currentQuestion ? answers[currentQuestion.id] ?? { self: '', guess: '' } : null;

  const updateField = (field, value) => {
    if (!currentQuestion) return;
    answersTouched.current = true;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: { ...(prev[currentQuestion.id] ?? { self: '', guess: '' }), [field]: value },
    }));
  };

  const persistCurrent = async () => {
    if (!currentQuestion || !current) return;

    const rows = [];
    if (current.self.trim()) {
      rows.push({ question_key: selfKey(currentQuestion.id), sender, answer: current.self.trim() });
    }
    if (current.guess.trim()) {
      rows.push({ question_key: guessKey(currentQuestion.id), sender, answer: current.guess.trim() });
    }
    if (rows.length === 0) return;

    setIsSaving(true);
    try {
      await saveQuizAnswers(rows);
      const rows2 = await fetchQuizAnswers();
      setAllAnswers(rows2);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Cevaplar kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  const goNext = async () => {
    if (currentQuestion) await persistCurrent();
    const next = step + 1;
    setStep(next);
    if (next === resultsStep) triggerHeartConfetti();
  };

  const goBack = () => setStep((value) => Math.max(INTRO_STEP, value - 1));

  const benimPuanim = sender === 'Yaşar' ? score.yasarScore : score.beyzaScore;
  const onunPuani = sender === 'Yaşar' ? score.beyzaScore : score.yasarScore;

  const benimTahminlerim = sender === 'Yaşar' ? 'yasarGuess' : 'beyzaGuess';
  const onunKendiCevabi = sender === 'Yaşar' ? 'beyzaSelf' : 'yasarSelf';
  const dogruAlan = sender === 'Yaşar' ? 'yasarDogru' : 'beyzaDogru';

  return (
    <div className="fixed inset-0 z-50 bg-rose-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Birbirini Tanıma Testi"
        className="w-full max-w-xl glass-panel bg-white/95 rounded-3xl shadow-2xl border border-rose-200 my-auto"
      >
        {/* Başlık */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-rose-100">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-rose-950 font-serif">
                Birbirini Tanıma Testi
              </h3>
              <p className="text-[11px] text-rose-500 font-medium">
                {sender} olarak cevaplıyorsun
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

        {/* İlerleme çubuğu */}
        {step >= 1 && step <= total && (
          <div className="px-4 sm:px-5 pt-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-rose-500">
                Soru {step}/{total}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-rose-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-400 transition-all"
                  style={{ width: `${(step / total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5">
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {step === INTRO_STEP ? (
            /* GİRİŞ */
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/25 mx-auto mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-extrabold text-rose-950 font-serif mb-2">
                {total} soruda birbirinizi ne kadar tanıyorsunuz?
              </h4>
              <p className="text-xs sm:text-sm text-rose-600/90 leading-relaxed mb-4 max-w-sm mx-auto">
                Her soruda iki şey yazacaksın: <strong>kendi cevabın</strong> ve{' '}
                <strong>{partner} için tahminin</strong>. Tahminlerin onun cevaplarıyla
                eşleşirse puan kazanırsın.
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-5">
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3">
                  <p className="text-2xl font-extrabold text-rose-700 leading-none">{score.total}</p>
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mt-1">
                    Soru
                  </p>
                </div>
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3">
                  <p className="text-2xl font-extrabold text-rose-700 leading-none">{benimPuanim}</p>
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mt-1">
                    Şu anki puanın
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-rose-500/25 hover:from-rose-600 hover:to-pink-600 transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Bugünün Turunu Başlat</span>
              </button>

              <div className="mt-4 border-t border-rose-100 pt-4">
                <p className="text-[10px] text-rose-400 leading-relaxed">
                  50 soruluk havuzdan her gün 10 soru seçilir. İkiniz de aynı günlük turu görürsünüz; AI veya Eros kullanılmaz.
                </p>
              </div>
            </div>
          ) : step === resultsStep ? (
            /* SONUÇLAR */
            <div>
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-lg mx-auto mb-3">
                  <Trophy className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-extrabold text-rose-950 font-serif mb-1">
                  Sonuçlar
                </h4>
                <p className="text-xs text-rose-600/90">
                  {sender}: <strong>{benimPuanim}/{score.total}</strong> · {partner}:{' '}
                  <strong>{onunPuani}/{score.total}</strong>
                </p>
              </div>

              <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                {score.perQuestion.map((row) => (
                  <div
                    key={row.id}
                    className={`rounded-2xl border p-3 ${
                      row[dogruAlan] ? 'bg-emerald-50/70 border-emerald-200' : 'bg-white/70 border-rose-100'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {row[dogruAlan] ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-rose-950 mb-1">{row.text}</p>
                        <p className="text-[11px] text-rose-600/90">
                          <span className="font-semibold">Tahminin:</span>{' '}
                          {row[benimTahminlerim] || '—'}
                        </p>
                        <p className="text-[11px] text-rose-600/90">
                          <span className="font-semibold">{partner}in cevabı:</span>{' '}
                          {row[onunKendiCevabi] || 'henüz cevaplamadı'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 rounded-2xl bg-white border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 transition cursor-pointer"
                >
                  Cevapları Düzenle
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          ) : (
            /* SORU ADIMI */
            <div>
              {currentQuestion.category && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-500 mb-1.5">
                  {currentQuestion.category}
                </p>
              )}
              <h4 className="text-base sm:text-lg font-bold text-rose-950 font-serif mb-4">
                {currentQuestion.text}
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1.5 ml-1">
                    Senin cevabın
                  </label>
                  <input
                    type="text"
                    value={current.self}
                    onChange={(event) => updateField('self', event.target.value)}
                    placeholder="Kendi cevabını yaz..."
                    className="w-full px-3.5 py-3 glass-input rounded-2xl text-rose-950 placeholder-rose-300 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1.5 ml-1">
                    {partner} için tahminin
                  </label>
                  <input
                    type="text"
                    value={current.guess}
                    onChange={(event) => updateField('guess', event.target.value)}
                    placeholder={`${partner} ne cevap verir?`}
                    className="w-full px-3.5 py-3 glass-input rounded-2xl text-rose-950 placeholder-rose-300 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-5">
                <button
                  type="button"
                  onClick={goBack}
                  className="py-2.5 px-4 rounded-2xl bg-white border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Geri</span>
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={isSaving}
                  className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow-md shadow-rose-500/25 hover:from-rose-600 hover:to-pink-600 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>{step === total ? 'Bitir ve Sonuçları Gör' : 'Sonraki'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-rose-400 text-center mt-3">
                Cevapların otomatik kaydedilir; ara verip sonra devam edebilirsin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
