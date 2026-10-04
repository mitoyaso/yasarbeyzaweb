-- ==============================================================================
-- YAŞAR & BEYZA AŞK GÜNLÜĞÜ - SUPABASE VERİTABANI VE DEPOLAMA KURULUM ŞEMASI
-- ==============================================================================
-- Bu SQL kodlarını Supabase kontrol panelinizdeki "SQL Editor" sekmesine yapıştırıp
-- "RUN" butonuna basarak tüm tabloları, depolama alanını ve izinleri tek seferde
-- oluşturabilirsiniz.
--
-- GÜVENLİK MODELİ (Supabase Auth):
--   - Tablolara ve fotoğraflara YALNIZCA giriş yapmış ve İZİNLİ iki hesap erişebilir.
--   - Giriş yapmamış (anon) istemcilerin hiçbir okuma/yazma/silme yetkisi yoktur.
--   - Dışarıdan biri kendi hesabını açsa bile (Supabase'de kayıtlar açık olsa dahi)
--     veriye erişemez; politikalar e-posta adresini de kontrol eder.
--   - Fotoğraf bucket'ı private'tır; görseller süreli imzalı adreslerle gösterilir.
--
-- KURULUM SIRASI:
--   1. Bu betiği çalıştırın.
--   2. Supabase Panel -> Authentication -> Users altında hesapları oluşturun:
--        yasar@sevgunlugu.com   (Auto Confirm User işaretli)
--        beyza@sevgunlugu.com   (Auto Confirm User işaretli)
--   3. Authentication -> Sign In / Providers altında "Allow new users to sign up"
--      seçeneğini KAPATIN (ek güvenlik katmanı).
--
-- NOT: Bu betik tekrar tekrar çalıştırılabilir (idempotent).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. NOTLAR TABLOSU (notes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('Yaşar', 'Beyza')),
    content TEXT NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. FOTOĞRAFLAR TABLOSU (photos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    caption TEXT DEFAULT '',
    uploaded_by TEXT NOT NULL CHECK (uploaded_by IN ('Yaşar', 'Beyza'))
);

-- ------------------------------------------------------------------------------
-- 3. YORUMLAR TABLOSU (comments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('Yaşar', 'Beyza')),
    comment_text TEXT NOT NULL
);

-- ------------------------------------------------------------------------------
-- 4. BEĞENİLER TABLOSU (likes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('Yaşar', 'Beyza')),
    CONSTRAINT unique_like_per_user_per_photo UNIQUE (photo_id, sender)
);

-- ------------------------------------------------------------------------------
-- 5. İZİNLİ KULLANICI KONTROLÜ
--    "Giriş yapmış olmak" tek başına yeterli değildir: e-posta da listede olmalı.
--    Yeni bir hesap eklemek isterseniz buraya ekleyin.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_allowed_user()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT coalesce(auth.jwt() ->> 'email', '')
           IN ('yasar@sevgunlugu.com', 'beyza@sevgunlugu.com');
$$;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) — SADECE GİRİŞ YAPMIŞ VE İZİNLİ KULLANICILAR
-- ==============================================================================
-- PostgreSQL "CREATE POLICY IF NOT EXISTS" desteklemediği için önce DROP edilir.

-- Notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Giris yapan notlari gorebilir" ON public.notes;
CREATE POLICY "Giris yapan notlari gorebilir"
ON public.notes FOR SELECT TO authenticated USING (public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapan not ekleyebilir" ON public.notes;
CREATE POLICY "Giris yapan not ekleyebilir"
ON public.notes FOR INSERT TO authenticated WITH CHECK (public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapan not silebilir" ON public.notes;
CREATE POLICY "Giris yapan not silebilir"
ON public.notes FOR DELETE TO authenticated USING (public.is_allowed_user());

-- Photos
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Giris yapan fotograflari gorebilir" ON public.photos;
CREATE POLICY "Giris yapan fotograflari gorebilir"
ON public.photos FOR SELECT TO authenticated USING (public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapan fotograf ekleyebilir" ON public.photos;
CREATE POLICY "Giris yapan fotograf ekleyebilir"
ON public.photos FOR INSERT TO authenticated WITH CHECK (public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapan fotograf guncelleyebilir" ON public.photos;
CREATE POLICY "Giris yapan fotograf guncelleyebilir"
ON public.photos FOR UPDATE TO authenticated USING (public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapan fotograf silebilir" ON public.photos;
CREATE POLICY "Giris yapan fotograf silebilir"
ON public.photos FOR DELETE TO authenticated USING (public.is_allowed_user());

-- Comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Giris yapan yorumlari gorebilir" ON public.comments;
CREATE POLICY "Giris yapan yorumlari gorebilir"
ON public.comments FOR SELECT TO authenticated USING (public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapan yorum ekleyebilir" ON public.comments;
CREATE POLICY "Giris yapan yorum ekleyebilir"
ON public.comments FOR INSERT TO authenticated WITH CHECK (public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapan yorum silebilir" ON public.comments;
CREATE POLICY "Giris yapan yorum silebilir"
ON public.comments FOR DELETE TO authenticated USING (public.is_allowed_user());

-- Likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Giris yapan begenileri gorebilir" ON public.likes;
CREATE POLICY "Giris yapan begenileri gorebilir"
ON public.likes FOR SELECT TO authenticated USING (public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapan begeni ekleyebilir" ON public.likes;
CREATE POLICY "Giris yapan begeni ekleyebilir"
ON public.likes FOR INSERT TO authenticated WITH CHECK (public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapan begeni silebilir" ON public.likes;
CREATE POLICY "Giris yapan begeni silebilir"
ON public.likes FOR DELETE TO authenticated USING (public.is_allowed_user());

-- Tablo yetkileri: anon'dan al, authenticated'e ver
REVOKE ALL ON public.notes, public.photos, public.comments, public.likes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.notes, public.photos, public.comments, public.likes
    TO authenticated;

-- ==============================================================================
-- 7. STORAGE (DEPOLAMA BUCKET'I): 'couple-photos' — PRIVATE
-- ==============================================================================
-- DİKKAT: Bucket adı "couple-photos" (çoğul değil). Uygulama kodu bu adı kullanır.
INSERT INTO storage.buckets (id, name, public)
VALUES ('couple-photos', 'couple-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Giris yapanlar fotograflari gorebilir" ON storage.objects;
CREATE POLICY "Giris yapanlar fotograflari gorebilir"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'couple-photos' AND public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapanlar fotograf yukleyebilir" ON storage.objects;
CREATE POLICY "Giris yapanlar fotograf yukleyebilir"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'couple-photos' AND public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapanlar fotograf guncelleyebilir" ON storage.objects;
CREATE POLICY "Giris yapanlar fotograf guncelleyebilir"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'couple-photos' AND public.is_allowed_user());

DROP POLICY IF EXISTS "Giris yapanlar fotograf silebilir" ON storage.objects;
CREATE POLICY "Giris yapanlar fotograf silebilir"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'couple-photos' AND public.is_allowed_user());

GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

-- ==============================================================================
-- 8. İNDEKSLER (Hızlı sorgulama için)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON public.photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_photo_id ON public.comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_likes_photo_id ON public.likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_likes_photo_sender ON public.likes(photo_id, sender);

-- ==============================================================================
-- 9. ŞEMA ÖNBELLEĞİNİ YENİLE + DOĞRULAMA
-- ==============================================================================
NOTIFY pgrst, 'reload schema';

SELECT 'Fotoğraf bucket private mı?' AS kontrol,
       (SELECT CASE WHEN public THEN 'HAYIR' ELSE 'EVET - private' END
        FROM storage.buckets WHERE id = 'couple-photos') AS sonuc
UNION ALL
SELECT 'İzinli kullanıcı fonksiyonu',
       (SELECT CASE WHEN count(*) = 1 THEN 'var' ELSE 'YOK!' END
        FROM pg_proc WHERE proname = 'is_allowed_user')
UNION ALL
SELECT 'İzinli kullanıcı için tablo politikası',
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
        WHERE schemaname = 'storage' AND 'anon' = ANY(roles));
