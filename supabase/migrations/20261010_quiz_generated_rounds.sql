-- ============================================================================
-- BİRBİRİNİ TANI TESTİ — PAYLAŞILAN AI SORU TURLARI
-- ============================================================================
-- Gemini'nin oluşturduğu soru setini iki kişinin de aynı görmesi için saklar.
-- Cevap anahtarı tutulmaz; puanlama mevcut quiz_answers kayıtlarından yapılır.
-- Çalıştırma: Supabase → SQL Editor → bu dosyanın içeriğini yapıştır → Run.

BEGIN;

CREATE TABLE IF NOT EXISTS public.quiz_rounds (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by text        NOT NULL CHECK (created_by IN ('Yaşar', 'Beyza')),
  questions  jsonb       NOT NULL
    CHECK (jsonb_typeof(questions) = 'array' AND jsonb_array_length(questions) = 10)
);

COMMENT ON TABLE public.quiz_rounds IS 'Gemini tarafından oluşturulan ortak birbirini tanıma testi turları';

CREATE INDEX IF NOT EXISTS idx_quiz_rounds_created_at
  ON public.quiz_rounds (created_at DESC);

ALTER TABLE public.quiz_rounds ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.quiz_rounds FROM anon, public;
GRANT SELECT, INSERT ON public.quiz_rounds TO authenticated;

DROP POLICY IF EXISTS "quiz_rounds_select" ON public.quiz_rounds;
CREATE POLICY "quiz_rounds_select" ON public.quiz_rounds
  FOR SELECT TO authenticated USING (public.is_allowed_user());

DROP POLICY IF EXISTS "quiz_rounds_insert" ON public.quiz_rounds;
CREATE POLICY "quiz_rounds_insert" ON public.quiz_rounds
  FOR INSERT TO authenticated WITH CHECK (public.is_allowed_user());

NOTIFY pgrst, 'reload schema';

COMMIT;
