import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createSharedQuizRound,
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

function readQuizSession(key, total) {
  if (typeof window === 'undefined') return { step: null, answers: {} };
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) || '{}');
    const step = Number.isInteger(stored.step) && stored.step >= 0 && stored.step <= total + 1
      ? stored.step
      : null;
    return {
      step,
      answers: stored.answers && typeof stored.answers === 'object' ? stored.answers : {},
    };
  } catch {
    return { step: null, answers: {} };
  }
}

function writeQuizSession(key, session) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(session));
  } catch (err) {
    console.warn('Test ilerlemesi bu tarayıcıda saklanamadı:', err);
  }
}

export default function QuizModal({ sender, onClose }) {
  const partner = sender === 'Yaşar' ? 'Beyza' : 'Yaşar';
  const dialogRef = useModalA11y({ onClose });

  const [questionRound] = useState(() => createSharedQuizRound());
  const total = questionRound.questions.length;
  const sessionKey = `quiz-session:${questionRound.id}:${sender}`;
  const [initialSession] = useState(() => readQuizSession(sessionKey, total));
  const [step, setStep] = useState(() => initialSession.step ?? INTRO_STEP);
  const [answers, setAnswers] = useState(() => initialSession.answers);
  const [allAnswers, setAllAnswers] = useState([]);
  const answersTouched = useRef(false);
  const progressTouched = useRef(initialSession.step !== null);
  const saveQueue = useRef(Promise.resolve());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const questions = useMemo(
    () => questionRound.questions.map((question) => ({
      ...question,
      id: `${questionRound.id}:${question.id}`,
    })),
    [questionRound]
  );
  const resultsStep = total + 1;

  // Gelen cevapları bu turdaki sorulara uygula.
  const applyRows = useCallback((rows, activeQuestions, localAnswers = {}) => {
    const answersByKey = new Map(
      rows.map((row) => [`${row.question_key}|${row.sender}`, row])
    );
    const mine = {};
    for (const question of activeQuestions) {
      const local = localAnswers[question.id] ?? {};
      const selfQuestionKey = selfKey(question.id);
      const guessQuestionKey = guessKey(question.id);
      const savedSelf = answersByKey.get(`${selfQuestionKey}|${sender}`)?.answer ?? '';
      const savedGuess = answersByKey.get(`${guessQuestionKey}|${sender}`)?.answer ?? '';
      const self = local.self || savedSelf;
      const guess = local.guess || savedGuess;

      if (self) {
        answersByKey.set(`${selfQuestionKey}|${sender}`, {
          question_key: selfQuestionKey,
          sender,
          answer: self,
        });
      }
      if (guess) {
        answersByKey.set(`${guessQuestionKey}|${sender}`, {
          question_key: guessQuestionKey,
          sender,
          answer: guess,
        });
      }
      mine[question.id] = {
        self,
        guess,
      };
    }
    const hydratedRows = Array.from(answersByKey.values());
    setAllAnswers(hydratedRows);
    setAnswers(mine);
  }, [sender]);

  // İlk yükleme: effect içinde senkron setState yapmadan
  useEffect(() => {
    let cancelled = false;

    fetchQuizAnswers()
      .then((rows) => {
        if (!cancelled) {
          if (answersTouched.current) setAllAnswers(rows);
          else {
            const localSession = readQuizSession(sessionKey, total);
            applyRows(rows, questions, localSession.answers);

            if (!progressTouched.current) {
              const answerMap = new Map(
                rows
                  .filter((row) => row.sender === sender)
                  .map((row) => [row.question_key, String(row.answer ?? '').trim()])
              );
              const lastTouchedIndex = questions.reduce((lastIndex, question, index) => {
                const hasAnswer = Boolean(
                  answerMap.get(selfKey(question.id)) || answerMap.get(guessKey(question.id))
                );
                return hasAnswer ? index : lastIndex;
              }, -1);

              if (lastTouchedIndex >= 0) {
                const lastQuestion = questions[lastTouchedIndex];
                const isComplete = Boolean(
                  answerMap.get(selfKey(lastQuestion.id)) &&
                  answerMap.get(guessKey(lastQuestion.id))
                );
                const resumeStep = Math.min(
                  total + 1,
                  lastTouchedIndex + (isComplete ? 2 : 1)
                );
                progressTouched.current = true;
                setStep(resumeStep);
                writeQuizSession(sessionKey, { step: resumeStep, answers: localSession.answers });
              }
            }
          }
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError(err.message || 'Cevaplar yüklenemedi.');
      });

    return () => {
      cancelled = true;
    };
  }, [applyRows, questions, sender, sessionKey, total]);

  const score = useMemo(() => computeQuizScore(allAnswers, questions), [allAnswers, questions]);

  const currentQuestion = step >= 1 && step <= total ? questions[step - 1] : null;
  const current = currentQuestion ? answers[currentQuestion.id] ?? { self: '', guess: '' } : null;

  const updateField = (field, value) => {
    if (!currentQuestion) return;
    answersTouched.current = true;
    const nextQuestionAnswers = { ...(answers[currentQuestion.id] ?? { self: '', guess: '' }), [field]: value };
    const nextAnswers = {
      ...answers,
      [currentQuestion.id]: nextQuestionAnswers,
    };
    setAnswers(nextAnswers);
    progressTouched.current = true;
    writeQuizSession(sessionKey, { step, answers: nextAnswers });
    setError('');

    const questionKey = field === 'self' ? selfKey(currentQuestion.id) : guessKey(currentQuestion.id);
    const task = saveQueue.current
      .catch(() => undefined)
      .then(() => saveQuizAnswers([{ question_key: questionKey, sender, answer: value }]));
    saveQueue.current = task;
    task.catch((err) => {
      console.error(err);
      setError(err.message || 'Cevap otomatik kaydedilemedi; sonraki soruya geçince tekrar denenecek.');
    });
  };

  const rememberStep = (nextStep) => {
    setStep(nextStep);
    progressTouched.current = true;
    const session = readQuizSession(sessionKey, total);
    writeQuizSession(sessionKey, { ...session, step: nextStep });
  };

  const queueSave = (rows) => {
    const task = saveQueue.current
      .catch(() => undefined)
      .then(() => saveQuizAnswers(rows));
    saveQueue.current = task;
    return task;
  };

  const renderChoices = (field, label) => (
    <div role="group" aria-label={label} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {currentQuestion.options.map((option) => {
        const selected = current[field] === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => updateField(field, option)}
            className={`min-h-11 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition cursor-pointer ${
              selected
                ? 'border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'border-rose-200 bg-white/80 text-rose-800 hover:border-rose-400 hover:bg-rose-50'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );

  const persistCurrent = async () => {
    if (!currentQuestion || !current) return true;

    const rows = [];
    if (current.self.trim()) {
      rows.push({ question_key: selfKey(currentQuestion.id), sender, answer: current.self.trim() });
    }
    if (current.guess.trim()) {
      rows.push({ question_key: guessKey(currentQuestion.id), sender, answer: current.guess.trim() });
    }
    if (rows.length === 0) return true;

    setIsSaving(true);
    try {
      await queueSave(rows);
      setAllAnswers((previous) => {
        const answersByKey = new Map(
          previous.map((row) => [`${row.question_key}|${row.sender}`, row])
        );
        rows.forEach((row) => answersByKey.set(`${row.question_key}|${row.sender}`, row));
        return Array.from(answersByKey.values());
      });
      return true;
    } catch (err) {
      console.error(err);
      setError(err.message || 'Cevaplar kaydedilemedi.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const goNext = async () => {
    const saved = currentQuestion ? await persistCurrent() : true;
    if (!saved) return;
    const next = step + 1;
    if (next === resultsStep) {
      try {
        const latestRows = await fetchQuizAnswers();
        const localSession = readQuizSession(sessionKey, total);
        applyRows(latestRows, questions, localSession.answers);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Sonuçlar güncellenemedi.');
      }
    }
    rememberStep(next);
    if (next === resultsStep) triggerHeartConfetti();
  };

  const goBack = () => rememberStep(Math.max(INTRO_STEP, step - 1));

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
                Her soruda iki seçim yapacaksın: <strong>kendi cevabın</strong> ve{' '}
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
                onClick={() => rememberStep(1)}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-rose-500/25 hover:from-rose-600 hover:to-pink-600 transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>50 Soruluk Teste Başla</span>
              </button>

              <div className="mt-4 border-t border-rose-100 pt-4">
                <p className="text-[10px] text-rose-400 leading-relaxed">
                  Havuzdaki 50 sorunun tamamını cevaplayacaksınız. İkiniz de aynı soruları aynı sırayla görürsünüz; AI veya Eros kullanılmaz.
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
                  onClick={() => rememberStep(1)}
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

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1.5 ml-1">
                    Senin cevabın
                  </label>
                  {renderChoices('self', 'Kendi cevabın için seçenekler')}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1.5 ml-1">
                    {partner} için tahminin
                  </label>
                  {renderChoices('guess', `${partner} için tahmin seçenekleri`)}
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
                Seçimlerin hemen kaydedilir; testi kapatıp daha sonra buradan devam edebilirsin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
