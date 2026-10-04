-- ==============================================================================
-- İSTEĞE BAĞLI İLERİ DÜZEY GÜVENLİK: 2FA'yı VERİTABANI SEVİYESİNDE ZORUNLU KIL
-- ==============================================================================
-- NE YAPAR:
--   İki adımlı doğrulamayı (2FA) AÇMIŞ bir hesap için, verilere erişim artık
--   yalnızca kod girildikten sonra (aal2) mümkün olur. Yani şifreyi ele geçiren
--   biri, giriş ekranındaki kod adımını atlayıp API'yi doğrudan çağırsa bile
--   veriyi OKUYAMAZ.
--
--   Arayüzdeki kod ekranı tek başına bu kadarını garanti etmez; asıl güvence bu
--   betikle veritabanına eklenir.
--
-- NE ZAMAN ÇALIŞTIRILMALI:
--   Sadece 2FA'yı açtıktan ve kodla giriş yapabildiğini doğruladıktan SONRA.
--   (2FA'sı kapalı olan hesap etkilenmez; onlar eskisi gibi çalışmaya devam eder.)
--
-- GÜVENLİ TASARIM:
--   Betik, "doğrulanmış 2FA kaydı var mı" bilgisini okuyamazsa kullanıcıyı
--   KİLİTLEMEZ; 2FA şartını uygulamadan izin verir. Yani bir aksilik hâlinde
--   site erişilemez hâle gelmez.
--
-- GERİ ALMA (bir sorun olursa):
--   supabase/migrations/20261005_auth_only_rls.sql dosyasını tekrar çalıştırın.
--   O betik bu fonksiyonu eski (2FA şartsız) hâline döndürür.
--
-- KULLANIM: Supabase Panel -> SQL Editor -> TÜM dosyayı yapıştır -> RUN
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_allowed_user()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    eposta            text := coalesce(auth.jwt() ->> 'email', '');
    seviye            text := coalesce(auth.jwt() ->> 'aal', 'aal1');
    dogrulanmis_2fa   boolean := false;
BEGIN
    -- 1) Yalnızca tanımlı iki hesap
    IF eposta NOT IN ('yasar@sevgunlugu.com', 'beyza@sevgunlugu.com') THEN
        RETURN false;
    END IF;

    -- 2) Oturum zaten kodla doğrulanmışsa (aal2) sorun yok
    IF seviye = 'aal2' THEN
        RETURN true;
    END IF;

    -- 3) Kullanıcının doğrulanmış bir 2FA kaydı var mı?
    BEGIN
        SELECT EXISTS (
            SELECT 1
            FROM auth.mfa_factors f
            WHERE f.user_id = auth.uid()
              AND f.status = 'verified'
        ) INTO dogrulanmis_2fa;
    EXCEPTION
        WHEN OTHERS THEN
            -- Bilgi okunamazsa kullanıcıyı kilitleme (güvenli taraf: erişime izin ver)
            RETURN true;
    END;

    -- 4) 2FA'sı olan kullanıcı kod girmediyse erişemez
    RETURN NOT dogrulanmis_2fa;
END;
$$;

-- Fonksiyonu yalnızca giriş yapmış kullanıcılar çağırabilsin
REVOKE ALL ON FUNCTION public.is_allowed_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_allowed_user() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- DOĞRULAMA ÖZETİ
-- ==============================================================================
SELECT 'İzinli kullanıcı fonksiyonu güncellendi mi?' AS kontrol,
       (SELECT CASE WHEN count(*) = 1 THEN 'EVET' ELSE 'HAYIR!' END
        FROM pg_proc WHERE proname = 'is_allowed_user') AS sonuc
UNION ALL
SELECT 'Fonksiyon güvenli modda mı (SECURITY DEFINER)?',
       (SELECT CASE WHEN prosecdef THEN 'EVET' ELSE 'HAYIR' END
        FROM pg_proc WHERE proname = 'is_allowed_user' LIMIT 1)
UNION ALL
SELECT 'Şu anki politikalar etkilendi mi? (değişmemeli)',
       (SELECT count(*)::text FROM pg_policies
        WHERE schemaname = 'public' AND tablename IN ('notes','photos','comments','likes')
          AND 'authenticated' = ANY(roles));

-- Tamamlandı 🎉
-- HATIRLATMA: Bu betikten sonra siteyi hemen test et:
--   1. Çıkış yap, tekrar giriş yap -> kod istendikten sonra içerik görünmeli
--   2. Sorun olursa 20261005_auth_only_rls.sql dosyasını tekrar çalıştır.
