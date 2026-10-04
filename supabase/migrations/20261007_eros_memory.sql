-- ==============================================================================
-- EROS HAFIZASI (ilişki profili)
-- ==============================================================================
-- Neden gerekli: Eros'un sizi tanıması için WhatsApp dökümünden çıkarılan profil
-- veritabanında durur. Uygulama bunu okuyup Eros'un bilgisine ekler.
--
-- Gizlilik: Bu tablo YALNIZCA izinli çift tarafından okunabilir/yazılabilir.
-- Ham WhatsApp dökümü buraya girmez; yalnızca çıkarılmış profil metni durur.
--
-- Çalıştırma: Supabase → SQL Editor → yapıştır → Run (tekrar çalıştırılabilir)
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.eros_memory (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  baslik     text        NOT NULL,
  icerik     text        NOT NULL,
  sira       integer     NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.eros_memory IS 'Eros yapay zekâsının çift hakkındaki hafızası';

CREATE UNIQUE INDEX IF NOT EXISTS idx_eros_memory_baslik ON public.eros_memory (baslik);

-- RLS: yalnızca izinli çift
ALTER TABLE public.eros_memory ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.eros_memory FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eros_memory TO authenticated;

DROP POLICY IF EXISTS "eros_memory_select" ON public.eros_memory;
CREATE POLICY "eros_memory_select" ON public.eros_memory
  FOR SELECT TO authenticated USING (public.is_allowed_user());

DROP POLICY IF EXISTS "eros_memory_insert" ON public.eros_memory;
CREATE POLICY "eros_memory_insert" ON public.eros_memory
  FOR INSERT TO authenticated WITH CHECK (public.is_allowed_user());

DROP POLICY IF EXISTS "eros_memory_update" ON public.eros_memory;
CREATE POLICY "eros_memory_update" ON public.eros_memory
  FOR UPDATE TO authenticated
  USING (public.is_allowed_user())
  WITH CHECK (public.is_allowed_user());

DROP POLICY IF EXISTS "eros_memory_delete" ON public.eros_memory;
CREATE POLICY "eros_memory_delete" ON public.eros_memory
  FOR DELETE TO authenticated USING (public.is_allowed_user());

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
SELECT 'eros_memory tablosu' AS kontrol, count(*)::text AS sonuc, '1 olmalı' AS beklenen
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'eros_memory'
UNION ALL
SELECT 'politika sayısı', count(*)::text, '4 olmalı'
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'eros_memory'
UNION ALL
SELECT 'anon erişimi', count(*)::text, '0 olmalı'
FROM information_schema.role_table_grants
WHERE table_name = 'eros_memory' AND grantee = 'anon';
