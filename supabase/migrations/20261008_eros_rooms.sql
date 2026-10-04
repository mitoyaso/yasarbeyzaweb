-- ==============================================================================
-- EROS SOHBET ODALARI (ortak + kişiye özel)
-- ==============================================================================
-- Üç oda vardır:
--   'ortak'  → hem Yaşar hem Beyza görür ve yazabilir
--   'yasar'  → YALNIZCA Yaşar görür/yazar (Beyza teknik olarak erişemez)
--   'beyza'  → YALNIZCA Beyza görür/yazar (Yaşar teknik olarak erişemez)
--
-- Gizlilik RLS ile SAĞLANIR: özel oda kayıtları diğer kişiye hiçbir sorguda
-- dönmez. Yani "görmemesi" bir arayüz tercihi değil, veritabanı kuralıdır.
--
-- Çalıştırma: Supabase → SQL Editor → yapıştır → Run (tekrar çalıştırılabilir)
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.eros_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oda        text        NOT NULL CHECK (oda IN ('ortak', 'yasar', 'beyza')),
  gonderen   text        NOT NULL CHECK (gonderen IN ('Yaşar', 'Beyza', 'Eros')),
  rol        text        NOT NULL CHECK (rol IN ('kullanici', 'eros')),
  icerik     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.eros_messages IS 'Eros ile yapılan sohbetler (ortak ve özel odalar)';

CREATE INDEX IF NOT EXISTS idx_eros_messages_oda_tarih
  ON public.eros_messages (oda, created_at DESC);

-- ------------------------------------------------------------------------------
-- RLS: özel oda yalnızca sahibine
-- ------------------------------------------------------------------------------
ALTER TABLE public.eros_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.eros_messages FROM anon, public;
GRANT SELECT, INSERT, DELETE ON public.eros_messages TO authenticated;

-- Giriş yapan kişinin oda anahtarı: yasar@... → 'yasar', beyza@... → 'beyza'
CREATE OR REPLACE FUNCTION public.eros_oda_anahtari()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1));
$$;

DROP POLICY IF EXISTS "eros_messages_select" ON public.eros_messages;
CREATE POLICY "eros_messages_select" ON public.eros_messages
  FOR SELECT TO authenticated
  USING (
    public.is_allowed_user()
    AND (oda = 'ortak' OR oda = public.eros_oda_anahtari())
  );

DROP POLICY IF EXISTS "eros_messages_insert" ON public.eros_messages;
CREATE POLICY "eros_messages_insert" ON public.eros_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_allowed_user()
    AND (oda = 'ortak' OR oda = public.eros_oda_anahtari())
  );

DROP POLICY IF EXISTS "eros_messages_delete" ON public.eros_messages;
CREATE POLICY "eros_messages_delete" ON public.eros_messages
  FOR DELETE TO authenticated
  USING (
    public.is_allowed_user()
    AND (oda = 'ortak' OR oda = public.eros_oda_anahtari())
  );

-- ------------------------------------------------------------------------------
-- Realtime: ortak odada iki cihaz aynı anda görsün
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'eros_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.eros_messages;
    END IF;
  END IF;
END $$;

ALTER TABLE public.eros_messages REPLICA IDENTITY FULL;

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

-- DOĞRULAMA
SELECT 'eros_messages tablosu' AS kontrol, count(*)::text AS sonuc, '1 olmalı' AS beklenen
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'eros_messages'
UNION ALL
SELECT 'politika sayısı', count(*)::text, '3 olmalı'
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'eros_messages'
UNION ALL
SELECT 'anon erişimi', count(*)::text, '0 olmalı'
FROM information_schema.role_table_grants
WHERE table_name = 'eros_messages' AND grantee = 'anon'
UNION ALL
SELECT 'oda anahtarı fonksiyonu', count(*)::text, '1 olmalı'
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'eros_oda_anahtari';
