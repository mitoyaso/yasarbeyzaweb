-- ==============================================================================
-- MIGRATION: public.likes tablosunu ekler (Beğeni / Kalp özelliği)
-- Tarih: 2026-10-04
-- REVIZYON: Geçersiz "CREATE POLICY IF NOT EXISTS" sözdizimi düzeltildi.
--           PostgreSQL bu sözdizimini DESTEKLEMEZ; betik bu satırda hata verip
--           tabloyu oluşturamıyordu. Artık "DROP POLICY IF EXISTS + CREATE POLICY"
--           kalıbı kullanılıyor ve betik tekrar tekrar çalıştırılabilir (idempotent).
-- KULLANIM: Supabase Panel -> SQL Editor -> Yeni Sorgu -> TÜM dosyayı yapıştır -> RUN
-- NOT: Dosyayı UTF-8 olarak kopyalayın; "Yaşar" değerindeki ş/ğ harfleri bozulursa
--      CHECK kuralı uygulamadan gelen veriyi reddeder.
-- ==============================================================================
-- Bu migration'i henüz çalıştırmadıysanız beğeni butonuna tıklayınca şu hatayı alırsınız:
-- "Beğeni eklenemedi: Could not find the table 'public.likes' in the schema cache"
-- ==============================================================================

-- 1. likes tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('Yaşar', 'Beyza')),
    -- Aynı kişi aynı fotoğrafa sadece 1 kez beğeni atabilir
    CONSTRAINT unique_like_per_user_per_photo UNIQUE (photo_id, sender)
);

-- 2. Row Level Security (RLS) etkinleştir
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- 3. Okuma / Ekleme / Silme politikaları (Anon kullanıcılar için)
--    Not: Kısmi bir kurulumdan kalan farklı yazımlı politika adları da temizlenir.
DROP POLICY IF EXISTS "Herkes begenileri goruntuleyebilir" ON public.likes;
DROP POLICY IF EXISTS "Herkes beğenileri görüntüleyebilir" ON public.likes;
CREATE POLICY "Herkes begenileri goruntuleyebilir"
ON public.likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Herkes begeni ekleyebilir" ON public.likes;
DROP POLICY IF EXISTS "Herkes beğeni ekleyebilir" ON public.likes;
CREATE POLICY "Herkes begeni ekleyebilir"
ON public.likes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Herkes begeni silebilir" ON public.likes;
DROP POLICY IF EXISTS "Herkes beğeni silebilir" ON public.likes;
CREATE POLICY "Herkes begeni silebilir"
ON public.likes FOR DELETE USING (true);

-- 4. Performans indeksleri
CREATE INDEX IF NOT EXISTS idx_likes_photo_id ON public.likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_likes_photo_sender ON public.likes(photo_id, sender);

-- 5. İstemci rollerine tablo yetkileri
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO anon, authenticated, service_role;

-- 6. PostgREST şema önbelleğini yenile (tablo uygulamada hemen görünsün)
NOTIFY pgrst, 'reload schema';

-- 7. DOĞRULAMA: Bu sorgu "likes tablosu hazir" satırını döndürmelidir.
SELECT 'likes tablosu hazir' AS sonuc, count(*) AS kayit_sayisi FROM public.likes;

-- Tamamlandi 🎉
