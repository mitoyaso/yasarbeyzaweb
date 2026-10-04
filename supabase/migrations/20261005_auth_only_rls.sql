-- ==============================================================================
-- MIGRATION: Supabase Auth'a geçiş — gerçek koruma
-- Tarih: 2026-10-05
-- ==============================================================================
-- Bu betik şunları yapar:
--   1. Veritabanındaki 4 tabloda "giriş yapmamış (anon)" erişimini tamamen kaldırır
--   2. Sadece giriş yapmış kullanıcılara (authenticated) izin verir
--   3. Fotoğraf bucket'ını herkese açık olmaktan çıkarır (private)
--   4. Fotoğraflara yalnızca giriş yapmış kullanıcıların erişmesini sağlar
--
-- KULLANIM: Supabase Panel -> SQL Editor -> Yeni Sorgu -> TÜM dosyayı yapıştır -> RUN
--
-- ÖN KOŞUL (betik bunu kendisi kontrol eder):
--   Authentication -> Users altında şu iki hesap tanımlı olmalı:
--     yasar@sevgunlugu.com
--     beyza@sevgunlugu.com
--   Hesaplar yoksa betik kendini durdurur ve hiçbir değişiklik yapmaz.
--   (Böylece siteyi yanlışlıkla kilitleyemezsin.)
--
-- NOT: Bu betik tekrar tekrar çalıştırılabilir (idempotent).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0) GÜVENLİK KONTROLÜ: iki hesap gerçekten var mı?
-- ------------------------------------------------------------------------------
DO $$
DECLARE eksik int;
BEGIN
    SELECT 2 - count(*) INTO eksik
    FROM auth.users
    WHERE email IN ('yasar@sevgunlugu.com', 'beyza@sevgunlugu.com');

    IF eksik > 0 THEN
        RAISE EXCEPTION
            'DURDURULDU: % adet hesap Supabase Auth icinde bulunamadi. Once Authentication -> Users altinda yasar@sevgunlugu.com ve beyza@sevgunlugu.com hesaplarini olusturun, sonra bu betigi tekrar calistirin. (Hicbir degisiklik yapilmadi.)',
            eksik;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 1) Tablolardaki anon (giriş yapmamış) politikalarını kaldır
--    Politika adları önceki kurulumlarda farklı yazılmış olabileceği için
--    isimle değil, "anon veya public rolüne açık olan" kriteriyle temizlenir.
-- ------------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('notes', 'photos', 'comments', 'likes')
          AND (roles && ARRAY['anon', 'public']::name[])
    LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
        RAISE NOTICE 'Kaldirildi: %.%', r.tablename, r.policyname;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 2) Sadece giriş yapmış kullanıcılar için politikalar
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Giris yapan notlari gorebilir" ON public.notes;
CREATE POLICY "Giris yapan notlari gorebilir"
ON public.notes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Giris yapan not ekleyebilir" ON public.notes;
CREATE POLICY "Giris yapan not ekleyebilir"
ON public.notes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Giris yapan not silebilir" ON public.notes;
CREATE POLICY "Giris yapan not silebilir"
ON public.notes FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Giris yapan fotograflari gorebilir" ON public.photos;
CREATE POLICY "Giris yapan fotograflari gorebilir"
ON public.photos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Giris yapan fotograf ekleyebilir" ON public.photos;
CREATE POLICY "Giris yapan fotograf ekleyebilir"
ON public.photos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Giris yapan fotograf guncelleyebilir" ON public.photos;
CREATE POLICY "Giris yapan fotograf guncelleyebilir"
ON public.photos FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Giris yapan fotograf silebilir" ON public.photos;
CREATE POLICY "Giris yapan fotograf silebilir"
ON public.photos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Giris yapan yorumlari gorebilir" ON public.comments;
CREATE POLICY "Giris yapan yorumlari gorebilir"
ON public.comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Giris yapan yorum ekleyebilir" ON public.comments;
CREATE POLICY "Giris yapan yorum ekleyebilir"
ON public.comments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Giris yapan yorum silebilir" ON public.comments;
CREATE POLICY "Giris yapan yorum silebilir"
ON public.comments FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Giris yapan begenileri gorebilir" ON public.likes;
CREATE POLICY "Giris yapan begenileri gorebilir"
ON public.likes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Giris yapan begeni ekleyebilir" ON public.likes;
CREATE POLICY "Giris yapan begeni ekleyebilir"
ON public.likes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Giris yapan begeni silebilir" ON public.likes;
CREATE POLICY "Giris yapan begeni silebilir"
ON public.likes FOR DELETE TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 3) Tablo yetkileri: anon'dan al, authenticated'e ver
-- ------------------------------------------------------------------------------
REVOKE ALL ON public.notes, public.photos, public.comments, public.likes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.notes, public.photos, public.comments, public.likes
    TO authenticated;

-- ------------------------------------------------------------------------------
-- 4) Fotoğraf bucket'ını private yap
-- ------------------------------------------------------------------------------
UPDATE storage.buckets SET public = false WHERE id = 'couple-photos';

-- ------------------------------------------------------------------------------
-- 5) storage.objects üzerindeki anon'a açık politikaları kaldır
-- ------------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND (roles && ARRAY['anon', 'public']::name[])
    LOOP
        EXECUTE format('DROP POLICY %I ON storage.objects', r.policyname);
        RAISE NOTICE 'Kaldirildi (storage): %', r.policyname;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 6) Storage politikaları: sadece giriş yapmış kullanıcılar
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Giris yapanlar fotograflari gorebilir" ON storage.objects;
CREATE POLICY "Giris yapanlar fotograflari gorebilir"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'couple-photos');

DROP POLICY IF EXISTS "Giris yapanlar fotograf yukleyebilir" ON storage.objects;
CREATE POLICY "Giris yapanlar fotograf yukleyebilir"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'couple-photos');

DROP POLICY IF EXISTS "Giris yapanlar fotograf guncelleyebilir" ON storage.objects;
CREATE POLICY "Giris yapanlar fotograf guncelleyebilir"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'couple-photos');

DROP POLICY IF EXISTS "Giris yapanlar fotograf silebilir" ON storage.objects;
CREATE POLICY "Giris yapanlar fotograf silebilir"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'couple-photos');

GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

-- ------------------------------------------------------------------------------
-- 7) PostgREST şema önbelleğini yenile
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------------------------
-- 8) DOĞRULAMA ÖZETİ (bu tabloyu görmelisin)
-- ------------------------------------------------------------------------------
SELECT 'Fotoğraf bucket private mı?' AS kontrol,
       (SELECT CASE WHEN public THEN 'HAYIR - hala herkese acik!' ELSE 'EVET - private' END
        FROM storage.buckets WHERE id = 'couple-photos') AS sonuc
UNION ALL
SELECT 'Giriş yapmış kullanıcı için tablo politikası',
       (SELECT count(*)::text FROM pg_policies
        WHERE schemaname = 'public' AND tablename IN ('notes','photos','comments','likes')
          AND 'authenticated' = ANY(roles))
UNION ALL
SELECT 'Anon için tablo politikası (0 olmalı)',
       (SELECT count(*)::text FROM pg_policies
        WHERE schemaname = 'public' AND tablename IN ('notes','photos','comments','likes')
          AND 'anon' = ANY(roles))
UNION ALL
SELECT 'Anon için storage politikası (0 olmalı)',
       (SELECT count(*)::text FROM pg_policies
        WHERE schemaname = 'storage' AND 'anon' = ANY(roles))
UNION ALL
SELECT 'Tanımlı hesap sayısı (2 olmalı)',
       (SELECT count(*)::text FROM auth.users
        WHERE email IN ('yasar@sevgunlugu.com','beyza@sevgunlugu.com'));

-- Tamamlandı 🎉
