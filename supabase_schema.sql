-- ==============================================================================
-- YAŞAR & BEYZA AŞK GÜNLÜĞÜ - SUPABASE VERİTABANI VE DEPOLAMA KURULUM ŞEMASI
-- ==============================================================================
-- Bu SQL kodlarını Supabase kontrol panelinizdeki "SQL Editor" sekmesine yapıştırıp
-- "RUN" butonuna basarak tüm tabloları, depolama alanını ve izinleri tek seferde oluşturabilirsiniz.

-- 1. NOTLAR TABLOSU (notes)
-- Yaşar veya Beyza'nın birbirine bıraktığı aşk notları ve mesajlar
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('Yaşar', 'Beyza')),
    content TEXT NOT NULL
);

-- 2. FOTOĞRAFLAR TABLOSU (photos)
-- Yüklenen fotoğrafların Supabase Storage adresi, açıklaması ve yükleyen bilgisi
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    caption TEXT DEFAULT '',
    uploaded_by TEXT NOT NULL CHECK (uploaded_by IN ('Yaşar', 'Beyza'))
);

-- 3. YORUMLAR TABLOSU (comments)
-- Fotoğrafların altına yapılan romantik yorumlar
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('Yaşar', 'Beyza')),
    comment_text TEXT NOT NULL
);

-- 4. BEĞENİLER TABLOSU (likes)
-- Fotoğraflara verilen kalp / beğeni tepkileri (her kullanıcı başına 1 beğeni)
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('Yaşar', 'Beyza')),
    CONSTRAINT unique_like_per_user_per_photo UNIQUE (photo_id, sender)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) VE ERİŞİM İZİNLERİ
-- ==============================================================================
-- Uygulama içi şifreli giriş yapıldığından, anon (anonim istemci) rolüne tam okuma,
-- ekleme, güncelleme ve silme izni verilir.

-- Notes tablosu izinleri
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes notları görüntüleyebilir" 
ON public.notes FOR SELECT USING (true);

CREATE POLICY "Herkes yeni not ekleyebilir" 
ON public.notes FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes notları silebilir" 
ON public.notes FOR DELETE USING (true);

-- Photos tablosu izinleri
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes fotoğrafları görüntüleyebilir" 
ON public.photos FOR SELECT USING (true);

CREATE POLICY "Herkes yeni fotoğraf ekleyebilir" 
ON public.photos FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes fotoğrafları güncelleyebilir" 
ON public.photos FOR UPDATE USING (true);

CREATE POLICY "Herkes fotoğrafları silebilir" 
ON public.photos FOR DELETE USING (true);

-- Comments tablosu izinleri
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes yorumları görüntüleyebilir" 
ON public.comments FOR SELECT USING (true);

CREATE POLICY "Herkes yeni yorum ekleyebilir" 
ON public.comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes yorumları silebilir" 
ON public.comments FOR DELETE USING (true);

-- Likes tablosu izinleri
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes beğenileri görüntüleyebilir" 
ON public.likes FOR SELECT USING (true);

CREATE POLICY "Herkes beğeni ekleyebilir" 
ON public.likes FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes beğeni silebilir" 
ON public.likes FOR DELETE USING (true);


-- ==============================================================================
-- 5. STORAGE (DEPOLAMA BUCKET'I) KURULUMU: 'couples-photos'
-- ==============================================================================
-- Storage bucket'ı oluştur (Eğer daha önce oluşturulmadıysa)
INSERT INTO storage.buckets (id, name, public)
VALUES ('couples-photos', 'couples-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage nesneleri için erişim politikaları (Okuma, Yükleme, Silme)
CREATE POLICY "Fotoğrafları herkese açık göster" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'couples-photos');

CREATE POLICY "Fotoğraf yüklemeye izin ver" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'couples-photos');

CREATE POLICY "Fotoğraf güncellemeye izin ver" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'couples-photos');

CREATE POLICY "Fotoğraf silmeye izin ver" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'couples-photos');

-- İndeksler (Hızlı sorgulama için)
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON public.photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_photo_id ON public.comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_likes_photo_id ON public.likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_likes_photo_sender ON public.likes(photo_id, sender);
