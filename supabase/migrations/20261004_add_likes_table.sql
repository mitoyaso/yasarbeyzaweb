-- ==============================================================================
-- MIGRATION: public.likes tablosunu ekler (Beğeni / Kalp özelliği)
-- Tarih: 2026-10-04
-- KULLANIM: Supabase Panel -> SQL Editor -> Yeni Sorgu -> Burayı yapıştır -> RUN
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
CREATE POLICY IF NOT EXISTS "Herkes begenileri goruntuleyebilir"
ON public.likes FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Herkes begeni ekleyebilir"
ON public.likes FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Herkes begeni silebilir"
ON public.likes FOR DELETE USING (true);

-- 4. Performans indeksleri
CREATE INDEX IF NOT EXISTS idx_likes_photo_id ON public.likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_likes_photo_sender ON public.likes(photo_id, sender);

-- Tamamlandi 🎉
