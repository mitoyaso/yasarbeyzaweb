-- ==============================================================================
-- MIGRATION: Çöp kutusu + anı haritası + canlı akış + quiz altyapısı
-- Tarih: 2026-10-05
-- ==============================================================================
-- Bu betik yeni özelliklerin veritabanı tarafını hazırlar:
--
--   1) ÇÖP KUTUSU      : Silinen anılar/notlar 30 gün boyunca "çöp"te durur,
--                        yanlışlıkla silinen bir anı tek tıkla geri getirilebilir.
--   2) ANI HARİTASI    : Fotoğraflara konum (enlem/boylam/yer adı) eklenebilir.
--   3) CANLI AKIŞ      : Yeni not/fotoğraf/yorum/beğeni sayfa yenilemeden düşer.
--   4) QUIZ            : "Birbirini tanıma testi" cevaplarının saklanacağı tablo.
--
-- KULLANIM: Supabase Panel -> SQL Editor -> Yeni Sorgu -> TÜM dosyayı yapıştır -> RUN
-- NOT: Tekrar tekrar çalıştırılabilir (idempotent). Mevcut veriler korunur:
--      yeni sütunlar boş (NULL) gelir ve uygulama bunu normal kabul eder.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1) ÇÖP KUTUSU — yumuşak silme sütunları
--    Kayıt gerçekten silinmez; silinme zamanı işaretlenir.
-- ------------------------------------------------------------------------------
ALTER TABLE public.photos   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.notes    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_photos_deleted_at   ON public.photos(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at    ON public.notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON public.comments(deleted_at);

-- ------------------------------------------------------------------------------
-- 2) ANI HARİTASI — konum bilgileri
-- ------------------------------------------------------------------------------
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS latitude      DOUBLE PRECISION;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS longitude     DOUBLE PRECISION;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS location_name TEXT;

CREATE INDEX IF NOT EXISTS idx_photos_location
    ON public.photos(latitude, longitude)
    WHERE latitude IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 3) CANLI AKIŞ — tabloları Realtime yayınına ekle
--    (Zaten ekliyse hata vermemesi için istisna yakalanır.)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    tablo text;
BEGIN
    FOREACH tablo IN ARRAY ARRAY['photos', 'notes', 'comments', 'likes']
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tablo);
            RAISE NOTICE 'Realtime yayinina eklendi: %', tablo;
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Zaten yayinda: %', tablo;
            WHEN undefined_object THEN
                RAISE NOTICE 'supabase_realtime yayini yok, atlandi: %', tablo;
        END;
    END LOOP;
END $$;

-- Silme olaylarının içeriğinin de yayınlanabilmesi için (isteğe bağlı ama faydalı)
ALTER TABLE public.photos   REPLICA IDENTITY FULL;
ALTER TABLE public.notes    REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.likes    REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------------
-- 4) QUIZ — "Birbirini tanıma testi" cevapları
--    Sorular uygulama içinde tanımlıdır; burada sadece verilen cevaplar tutulur.
--    Her kişi her soruya yalnızca bir cevap verebilir.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    question_key TEXT NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('Yaşar', 'Beyza')),
    answer TEXT NOT NULL,
    CONSTRAINT unique_quiz_answer_per_person UNIQUE (question_key, sender)
);

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Giris yapan quiz cevaplarini gorebilir" ON public.quiz_answers;
CREATE POLICY "Giris yapan quiz cevaplarini gorebilir"
ON public.quiz_answers FOR SELECT TO authenticated USING (public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapan quiz cevabi ekleyebilir" ON public.quiz_answers;
CREATE POLICY "Giris yapan quiz cevabi ekleyebilir"
ON public.quiz_answers FOR INSERT TO authenticated WITH CHECK (public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapan quiz cevabini guncelleyebilir" ON public.quiz_answers;
CREATE POLICY "Giris yapan quiz cevabini guncelleyebilir"
ON public.quiz_answers FOR UPDATE TO authenticated USING (public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapan quiz cevabini silebilir" ON public.quiz_answers;
CREATE POLICY "Giris yapan quiz cevabini silebilir"
ON public.quiz_answers FOR DELETE TO authenticated USING (public.is_allowed_user());

REVOKE ALL ON public.quiz_answers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_answers TO authenticated;

CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON public.quiz_answers(question_key);

-- ------------------------------------------------------------------------------
-- 5) ŞEMA ÖNBELLEĞİNİ YENİLE + DOĞRULAMA ÖZETİ
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

SELECT 'Çöp kutusu sütunları (3 tabloda olmalı)' AS kontrol,
       (SELECT count(*)::text FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'deleted_at'
          AND table_name IN ('photos', 'notes', 'comments')) AS sonuc
UNION ALL
SELECT 'Harita sütunları (3 sütun olmalı)',
       (SELECT count(*)::text FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'photos'
          AND column_name IN ('latitude', 'longitude', 'location_name'))
UNION ALL
SELECT 'Realtime yayınındaki tablo sayısı (4 olmalı)',
       (SELECT count(*)::text FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public')
UNION ALL
SELECT 'Realtime tabloları',
       (SELECT coalesce(string_agg(tablename, ', ' ORDER BY tablename), 'yok')
        FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public')
UNION ALL
SELECT 'Quiz tablosu politikaları (4 olmalı)',
       (SELECT count(*)::text FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'quiz_answers')
UNION ALL
SELECT 'Anon için quiz politikası (0 olmalı)',
       (SELECT count(*)::text FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'quiz_answers'
          AND 'anon' = ANY(roles));

-- Tamamlandı 🎉
