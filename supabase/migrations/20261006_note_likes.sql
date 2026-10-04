-- ==============================================================================
-- NOT BEĞENİLERİ (Aşk Notları'na kalp bırakma)
-- ==============================================================================
-- Neden gerekli: Aşk Notları'ndaki kalp düğmesi yalnızca ekranda tutuluyordu;
-- sayı görünmüyor ve sekme değiştirilince kayboluyordu. Bu betik beğenileri
-- kalıcı hâle getirir.
--
-- Çalıştırma: Supabase → SQL Editor → tümünü yapıştır → Run
-- Güvenli: mevcut verilere DOKUNMAZ, tekrar çalıştırılabilir.
-- ==============================================================================

BEGIN;

-- 1) TABLO ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.note_likes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id    uuid        NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  sender     text        NOT NULL CHECK (sender IN ('Yaşar', 'Beyza')),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Aynı kişi aynı nota yalnızca bir kez kalp bırakabilir
  CONSTRAINT unique_note_like_per_person UNIQUE (note_id, sender)
);

CREATE INDEX IF NOT EXISTS idx_note_likes_note_id ON public.note_likes (note_id);

COMMENT ON TABLE public.note_likes IS 'Aşk notlarına bırakılan kalpler';

-- 2) RLS: yalnızca izinli çift görebilir/yazabilir ------------------------------
ALTER TABLE public.note_likes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.note_likes FROM anon, public;
GRANT SELECT, INSERT, DELETE ON public.note_likes TO authenticated;

DROP POLICY IF EXISTS "note_likes_select" ON public.note_likes;
CREATE POLICY "note_likes_select" ON public.note_likes
  FOR SELECT TO authenticated
  USING (public.is_allowed_user());

DROP POLICY IF EXISTS "note_likes_insert" ON public.note_likes;
CREATE POLICY "note_likes_insert" ON public.note_likes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_allowed_user());

DROP POLICY IF EXISTS "note_likes_delete" ON public.note_likes;
CREATE POLICY "note_likes_delete" ON public.note_likes
  FOR DELETE TO authenticated
  USING (public.is_allowed_user());

-- 3) REALTIME: canlı akışa ekle (iki cihaz aynı anda görsün) --------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'note_likes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.note_likes;
    END IF;
  END IF;
END $$;

ALTER TABLE public.note_likes REPLICA IDENTITY FULL;

-- ⛔ Hesaplar bulunamazsa hiçbir şey değişmesin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE lower(email) IN ('yasar@sevgunlugu.com', 'beyza@sevgunlugu.com')
  ) THEN
    RAISE EXCEPTION 'Hesaplar bulunamadi: yasar@sevgunlugu.com / beyza@sevgunlugu.com';
  END IF;
END $$;

COMMIT;

-- 4) DOĞRULAMA -----------------------------------------------------------------
SELECT 'note_likes tablosu' AS kontrol,
       count(*)::text       AS sonuc,
       '1 olmalı'           AS beklenen
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'note_likes'
UNION ALL
SELECT 'politika sayısı', count(*)::text, '3 olmalı'
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'note_likes'
UNION ALL
SELECT 'anon erişimi', count(*)::text, '0 olmalı'
FROM information_schema.role_table_grants
WHERE table_name = 'note_likes' AND grantee = 'anon'
UNION ALL
SELECT 'notlar tablosu yerinde', count(*)::text, '1 olmalı'
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'notes';
