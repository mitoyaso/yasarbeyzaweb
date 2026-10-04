import { createClient } from '@supabase/supabase-js';
import { SUPABASE_BUCKET_NAME, SIGNED_URL_TTL_SECONDS, STORAGE_KEYS } from './constants';
import { prepareImageForUpload, thumbPathFor, createThumbnailFor } from './image';

// Ortam değişkenlerinden Supabase bilgilerini al
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase yapılandırmasının geçerli olup olmadığını denetle
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== '' &&
  !supabaseUrl.includes('projeniz.supabase.co')
);

// Supabase istemcisini oluştur
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==============================================================================
// DEMO YEREL VERİ DESTEĞİ (Supabase bilgileri girilmemişse devreye girer)
// ==============================================================================
const DEFAULT_DEMO_PHOTOS = [
  {
    id: 'demo-1',
    created_at: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=80',
    storage_path: 'demo-1.jpg',
    caption: 'Birlikte gün batımını izlediğimiz o masalsı akşam... İyi ki yanımdasın sevgilim 🌅💖',
    uploaded_by: 'Yaşar',
  },
  {
    id: 'demo-2',
    created_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80',
    storage_path: 'demo-2.jpg',
    caption: 'Kahve kokusu ve senin o sıcacık gülüşün. Dünyanın en huzurlu anı ☕🌷',
    uploaded_by: 'Beyza',
  },
  {
    id: 'demo-3',
    created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80',
    storage_path: 'demo-3.jpg',
    caption: 'Ellerimiz hiç ayrılmasın, nice güzel yıllara Yaşar & Beyza ✨💍',
    uploaded_by: 'Yaşar',
  },
];

const DEFAULT_DEMO_NOTES = [
  {
    id: 'note-1',
    created_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    sender: 'Yaşar',
    content: 'Beyza\'m, bugünkü kahkahaların hâlâ kulaklarımda çınlıyor. Seni çok ama çok seviyorum! 💖',
  },
  {
    id: 'note-2',
    created_at: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
    sender: 'Beyza',
    content: 'Canım sevgilim, seninle geçen her saniye ömrüme ömür katıyor. Akşamki sürprizin için teşekkür ederim 🌸🥰',
  },
];

const DEFAULT_DEMO_COMMENTS = [
  {
    id: 'comment-1',
    photo_id: 'demo-1',
    created_at: new Date(Date.now() - 3600 * 1000 * 40).toISOString(),
    sender: 'Beyza',
    comment_text: 'O gün rüzgar saçlarımı dağıtırken bana öyle güzel bakmıştın ki... Asla unutamam 💕',
  },
  {
    id: 'comment-2',
    photo_id: 'demo-1',
    created_at: new Date(Date.now() - 3600 * 1000 * 38).toISOString(),
    sender: 'Yaşar',
    comment_text: 'Her gün sana yeniden aşık oluyorum prensesim ✨',
  },
];

const DEFAULT_DEMO_LIKES = [
  { id: 'like-1', photo_id: 'demo-1', sender: 'Beyza', created_at: new Date(Date.now() - 3600 * 1000 * 30).toISOString() },
  { id: 'like-2', photo_id: 'demo-1', sender: 'Yaşar', created_at: new Date(Date.now() - 3600 * 1000 * 28).toISOString() },
  { id: 'like-3', photo_id: 'demo-2', sender: 'Yaşar', created_at: new Date(Date.now() - 3600 * 1000 * 20).toISOString() },
];

function getLocalDemoData(key, defaultData) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultData;
  } catch {
    return defaultData;
  }
}

function setLocalDemoData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Yerel depolama hatası:', err);
  }
}

// ==============================================================================
// FOTOĞRAF İŞLEMLERİ (CRUD + STORAGE)
// ==============================================================================

// ------------------------------------------------------------------------------
// İMZALI FOTOĞRAF ADRESLERİ (PRIVATE BUCKET)
// ------------------------------------------------------------------------------
// Güvenlik nedeniyle 'couple-photos' bucket'ı artık herkese açık DEĞİL.
// Bu yüzden fotoğraflar, giriş yapmış kullanıcı için üretilen geçici (imzalı)
// adreslerle gösterilir. Veritabanındaki 'url' sütunu eski public adresi tutar
// ve artık çalışmaz; gösterim her zaman storage_path üzerinden yapılır.

function toAbsoluteStorageUrl(rawUrl) {
  if (!rawUrl) return null;
  // Bazı sürümler tam adres, bazıları "/object/sign/..." biçiminde göreli adres döner.
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  const base = String(supabaseUrl || '').replace(/\/$/, '');
  return `${base}/storage/v1${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
}

async function withSignedPhotoUrls(photos) {
  if (!isSupabaseConfigured || !Array.isArray(photos) || photos.length === 0) {
    return photos;
  }

  // Demo ve yerel kayıtlarda storage_path gerçek bir dosyaya işaret etmez.
  const targets = photos.filter(
    (photo) => photo?.storage_path && !/^(demo|local)/i.test(photo.storage_path)
  );
  if (targets.length === 0) return photos;

  // Ana görseller ve thumbnail'ler tek istekte imzalanır; yanıt aynı sırada gelir.
  const paths = [];
  targets.forEach((photo) => {
    paths.push(photo.storage_path);
    paths.push(thumbPathFor(photo.storage_path));
  });

  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET_NAME)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error || !Array.isArray(data)) {
    console.warn(
      'İmzalı fotoğraf adresi üretilemedi, kayıtlı adres kullanılacak:',
      error?.message
    );
    return photos;
  }

  const signedByPath = new Map();
  paths.forEach((path, index) => {
    const signed = toAbsoluteStorageUrl(data[index]?.signedUrl);
    if (signed) signedByPath.set(path, signed);
  });

  if (signedByPath.size === 0) return photos;

  return photos.map((photo) => {
    const fullUrl = signedByPath.get(photo.storage_path);
    if (!fullUrl) return photo;

    // Thumbnail yoksa (eski fotoğraflar) tam boy görsele düşülür.
    const thumbUrl = signedByPath.get(thumbPathFor(photo.storage_path));

    return {
      ...photo,
      url: fullUrl,
      signed_url: fullUrl,
      thumb_url: thumbUrl || fullUrl,
    };
  });
}

/**
 * Fotoğrafları listele (en yeniden eskiye)
 */
export async function getPhotos() {
  if (!isSupabaseConfigured) {
    return getLocalDemoData(STORAGE_KEYS.DEMO_PHOTOS, DEFAULT_DEMO_PHOTOS);
  }

  const copDestegi = await isTrashAvailable();

  const sorgu = (filtrele) => {
    let q = supabase.from('photos').select('*').order('created_at', { ascending: false });
    if (filtrele) q = q.is('deleted_at', null);
    return q;
  };

  let { data, error } = await sorgu(copDestegi);

  // Çöp kutusu filtresi sorun çıkarırsa filtresiz devam et: galeri asla
  // boş görünmesin (güvenli taraf).
  if (error && copDestegi) {
    console.warn('Çöp kutusu filtresi uygulanamadı, filtresiz devam ediliyor:', error.message);
    ({ data, error } = await sorgu(false));
  }

  if (error) {
    console.error('Fotoğraflar getirilirken hata oluştu:', error);
    throw new Error('Fotoğraflar yüklenemedi: ' + error.message);
  }

  return withSignedPhotoUrls(data || []);
}

/**
 * Yeni fotoğraf yükle (Supabase Storage + Database)
 */
export async function uploadPhoto({ file, caption, uploadedBy }) {
  if (!file) throw new Error('Lütfen geçerli bir fotoğraf dosyası seçin.');

  if (!isSupabaseConfigured) {
    // Demo yerel depolama simülasyonu
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newPhoto = {
          id: 'demo-' + Date.now(),
          created_at: new Date().toISOString(),
          url: e.target.result,
          storage_path: 'local-' + Date.now(),
          caption: caption || '',
          uploaded_by: uploadedBy,
        };
        const currentPhotos = getLocalDemoData(STORAGE_KEYS.DEMO_PHOTOS, DEFAULT_DEMO_PHOTOS);
        const updated = [newPhoto, ...currentPhotos];
        setLocalDemoData(STORAGE_KEYS.DEMO_PHOTOS, updated);
        resolve(newPhoto);
      };
      reader.readAsDataURL(file);
    });
  }

  // 1. Görseli tarayıcıda sıkıştır ve thumbnail üret
  //    (HEIC dosyaları da burada JPEG'e çevrilir, ayrıca depolama kotası korunur.)
  const originalBytes = file.size || 0;
  const { main, thumb } = await prepareImageForUpload(file);

  // 2. Dosya yolları — thumbnail ayrı bir veritabanı sütunu gerektirmez,
  //    adlandırma kuralıyla (thumb_ öneki) eşleştirilir.
  const stamp = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const filePath = `foto_${stamp}.jpg`;
  const thumbPath = thumbPathFor(filePath);

  // 3. Ana görseli Supabase Storage 'couple-photos' bucket'ına yükle
  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_BUCKET_NAME)
    .upload(filePath, main.blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg',
    });

  if (uploadError) {
    console.error('Storage yükleme hatası:', uploadError);
    throw new Error('Fotoğraf depolama alanına yüklenemedi: ' + uploadError.message);
  }

  // 4. Thumbnail'i yükle — başarısız olursa ana görsel kullanılır, işlem durmaz
  const { error: thumbError } = await supabase.storage
    .from(SUPABASE_BUCKET_NAME)
    .upload(thumbPath, thumb.blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg',
    });

  if (thumbError) {
    console.warn(
      'Thumbnail yüklenemedi, tam boy görsel kullanılacak:',
      thumbError.message
    );
  }

  // 5. 'url' sütunu geriye dönük uyumluluk için doldurulur.
  //    Bucket private olduğu için gösterim her zaman storage_path'ten üretilen
  //    imzalı adresle yapılır; bu değer artık yalnızca bir yedektir.
  const { data: publicUrlData } = supabase.storage
    .from(SUPABASE_BUCKET_NAME)
    .getPublicUrl(filePath);

  const publicUrl = publicUrlData.publicUrl;

  // 6. Bilgileri 'photos' tablosuna kaydet
  const { data: photoRecord, error: dbError } = await supabase
    .from('photos')
    .insert([
      {
        url: publicUrl,
        storage_path: filePath,
        caption: caption || '',
        uploaded_by: uploadedBy,
      },
    ])
    .select()
    .single();

  if (dbError) {
    console.error('Veritabanı kayıt hatası:', dbError);
    // Veritabanı başarısız olursa depolamadaki dosyayı geri al
    await supabase.storage.from(SUPABASE_BUCKET_NAME).remove([filePath]);
    throw new Error('Fotoğraf veritabanına kaydedilemedi: ' + dbError.message);
  }

  // Bucket private olduğu için eklenen fotoğrafın gösterilebilir (imzalı) adresini üret.
  const [photoWithUrl] = await withSignedPhotoUrls([photoRecord]);

  return {
    ...photoWithUrl,
    // Arayüzde "ne kadar küçüldü" bilgisini gösterebilmek için (veritabanına yazılmaz)
    compression: {
      originalBytes,
      uploadedBytes: main.blob.size,
      width: main.width,
      height: main.height,
    },
  };
}

/**
 * Fotoğrafı sil (Hem Supabase Storage'dan hem de Veritabanından)
 */
/**
 * Fotoğrafı siler.
 * Çöp kutusu destekleniyorsa kayıt yalnızca işaretlenir (30 gün geri alınabilir),
 * dosyalar korunur. Desteklenmiyorsa eskisi gibi kalıcı olarak silinir.
 * @returns {Promise<{softDeleted: boolean}>}
 */
export async function deletePhoto(photo) {
  if (!photo?.id) throw new Error('Silinecek fotoğraf bulunamadı.');

  if (!isSupabaseConfigured) {
    const currentPhotos = getLocalDemoData(STORAGE_KEYS.DEMO_PHOTOS, DEFAULT_DEMO_PHOTOS);
    const updated = currentPhotos.filter((p) => p.id !== photo.id);
    setLocalDemoData(STORAGE_KEYS.DEMO_PHOTOS, updated);
    return { softDeleted: false };
  }

  // 1) Çöp kutusu varsa yalnızca işaretle (dosyalar silinmez, geri alınabilir)
  if (await isTrashAvailable()) {
    const { error } = await supabase
      .from('photos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', photo.id);

    if (!error) return { softDeleted: true };

    console.warn('Anı çöpe taşınamadı, kalıcı silme denenecek:', error.message);
  }

  // 2) Kalıcı silme
  await purgePhoto(photo);
  return { softDeleted: false };
}

/**
 * Fotoğrafı KALICI olarak siler (hem Storage dosyaları hem veritabanı kaydı).
 * Çöp kutusundan "kalıcı sil" dendiğinde de bu kullanılır.
 */
export async function purgePhoto(photo) {
  if (!photo?.id) throw new Error('Silinecek fotoğraf bulunamadı.');

  if (photo.storage_path) {
    const pathsToRemove = [photo.storage_path];
    const thumbPath = thumbPathFor(photo.storage_path);
    if (thumbPath) pathsToRemove.push(thumbPath);

    const { error: storageError } = await supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .remove(pathsToRemove);

    if (storageError) {
      console.warn('Storage silme uyarısı:', storageError);
    }
  }

  const { error: dbError } = await supabase.from('photos').delete().eq('id', photo.id);

  if (dbError) {
    console.error('Fotoğraf silme hatası:', dbError);
    throw new Error('Fotoğraf veritabanından silinemedi: ' + dbError.message);
  }

  return true;
}

/**
 * Fotoğraf açıklamasını güncelle
 */
export async function updatePhotoCaption(photoId, newCaption) {
  if (!photoId) throw new Error('Fotoğraf ID bulunamadı.');

  if (!isSupabaseConfigured) {
    const currentPhotos = getLocalDemoData(STORAGE_KEYS.DEMO_PHOTOS, DEFAULT_DEMO_PHOTOS);
    const updated = currentPhotos.map((p) =>
      p.id === photoId ? { ...p, caption: newCaption } : p
    );
    setLocalDemoData(STORAGE_KEYS.DEMO_PHOTOS, updated);
    return true;
  }

  const { error } = await supabase
    .from('photos')
    .update({ caption: newCaption })
    .eq('id', photoId);

  if (error) {
    console.error('Açıklama güncelleme hatası:', error);
    throw new Error('Açıklama güncellenemedi: ' + error.message);
  }

  return true;
}

// ==============================================================================
// YORUM İŞLEMLERİ (comments)
// ==============================================================================

/**
 * Bir fotoğrafa ait yorumları getir
 */
export async function getComments(photoId) {
  if (!photoId) return [];

  if (!isSupabaseConfigured) {
    const all = getLocalDemoData(STORAGE_KEYS.DEMO_COMMENTS, DEFAULT_DEMO_COMMENTS);
    return all.filter((c) => c.photo_id === photoId);
  }

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('photo_id', photoId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Yorumlar getirilirken hata:', error);
    return [];
  }

  return data || [];
}

/**
 * Yeni yorum ekle
 */
export async function addComment({ photoId, sender, commentText }) {
  if (!photoId || !commentText?.trim()) {
    throw new Error('Lütfen geçerli bir yorum yazın.');
  }

  if (!isSupabaseConfigured) {
    const newComment = {
      id: 'demo-c-' + Date.now(),
      photo_id: photoId,
      created_at: new Date().toISOString(),
      sender,
      comment_text: commentText.trim(),
    };
    const all = getLocalDemoData(STORAGE_KEYS.DEMO_COMMENTS, DEFAULT_DEMO_COMMENTS);
    setLocalDemoData(STORAGE_KEYS.DEMO_COMMENTS, [...all, newComment]);
    return newComment;
  }

  const { data, error } = await supabase
    .from('comments')
    .insert([
      {
        photo_id: photoId,
        sender,
        comment_text: commentText.trim(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Yorum ekleme hatası:', error);
    throw new Error('Yorum eklenemedi: ' + error.message);
  }

  return data;
}

/**
 * Yorum sil
 */
export async function deleteComment(commentId) {
  if (!commentId) return;

  if (!isSupabaseConfigured) {
    const all = getLocalDemoData(STORAGE_KEYS.DEMO_COMMENTS, DEFAULT_DEMO_COMMENTS);
    setLocalDemoData(
      STORAGE_KEYS.DEMO_COMMENTS,
      all.filter((c) => c.id !== commentId)
    );
    return true;
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Yorum silme hatası:', error);
    throw new Error('Yorum silinemedi: ' + error.message);
  }

  return true;
}

// ==============================================================================
// BEĞENİ İŞLEMLERİ (likes)
// ==============================================================================

/**
 * Bir fotoğrafın beğeni bilgilerini getir (toplam sayı + aktif kullanıcı beğenmiş mi)
 * @param {string} photoId
 * @param {string} sender Giriş yapan kişi ("Yaşar" / "Beyza"); hesaba göre gelir.
 */
export async function getLikes(photoId, sender = 'Yaşar') {
  if (!photoId) return { likes: [], likedByMe: false, total: 0 };

  if (!isSupabaseConfigured) {
    const all = getLocalDemoData(STORAGE_KEYS.DEMO_LIKES, DEFAULT_DEMO_LIKES);
    const likes = all.filter((l) => l.photo_id === photoId);
    return {
      likes,
      likedByMe: likes.some((l) => l.sender === sender),
      total: likes.length,
    };
  }

  const { data, error } = await supabase
    .from('likes')
    .select('*')
    .eq('photo_id', photoId);

  if (error) {
    console.error('Beğeniler getirilirken hata:', error);
    return { likes: [], likedByMe: false, total: 0 };
  }

  const likes = data || [];
  return {
    likes,
    likedByMe: likes.some((l) => l.sender === sender),
    total: likes.length,
  };
}

const LIKES_TABLE_MISSING_HINT =
  '. Supabase Panelinde SQL Editor acip "supabase_schema.sql" tum dosyayi veya ' +
  'yalnizca "supabase/migrations/20261004_add_likes_table.sql" dosyasindaki SQLi calistirin.';

function isRelationMissingError(err) {
  const m = (err?.message || '').toLowerCase();
  const code = String(err?.code || '');
  return (
    m.includes('could not find the table') ||
    (m.includes('relation') && m.includes('does not exist')) ||
    m.includes('schema cache') ||
    code === '42P01'
  );
}

function isUniqueViolation(err) {
  const m = (err?.message || '').toLowerCase();
  const code = String(err?.code || '');
  return (
    code === '23505' ||
    m.includes('unique') ||
    m.includes('duplicate key') ||
    m.includes('unique_like_per_user_per_photo')
  );
}

function isCheckViolation(err) {
  const code = String(err?.code || '');
  return code === '23514' || String(err?.message || '').includes('check constraint');
}

const VALID_SENDERS = new Set(['Yaşar', 'Beyza']);

/**
 * Son durumu tekrar okur ve beğeni state'ini döner
 */
async function refetchLikesState(photoId, sender) {
  const { data, error } = await supabase
    .from('likes')
    .select('sender')
    .eq('photo_id', photoId);

  if (error) throw error;
  const likes = data || [];
  return {
    total: likes.length,
    likedByMe: likes.some((l) => l.sender === sender),
  };
}

/**
 * Bir fotoğrafı beğen / beğeniyi geri al
 *
 * Veritabani Uyumlulugu (public.likes tablosu sutunlari):
 *  - id         UUID   (DEFAULT gen_random_uuid())  -> kod tarafinda yazmaya gerek yok
 *  - created_at TIMESTAMPTZ (DEFAULT now())         -> kod tarafinda yazmaya gerek yok
 *  - photo_id   UUID   (FK -> photos.id)            -> kodda photo_id olarak geciliyor  ✅
 *  - sender     TEXT   CHECK IN ('Yaşar','Beyza')   -> kodda sender olarak geciliyor    ✅
 *  - UNIQUE(photo_id, sender)                       -> race condition durumunda handle ediliyor
 */
export async function toggleLike(photoId, sender) {
  if (!photoId || !sender) return { likedByMe: false, total: 0 };

  if (!VALID_SENDERS.has(sender)) {
    throw new Error(
      'Gecerli olmayan gönderen: ' + sender +
      '. Lütfen üst menüden Yaşar / Beyza seçiminizi doğrulayın.'
    );
  }

  if (!isSupabaseConfigured) {
    const all = getLocalDemoData(STORAGE_KEYS.DEMO_LIKES, DEFAULT_DEMO_LIKES);
    const existing = all.find((l) => l.photo_id === photoId && l.sender === sender);

    let updated;
    if (existing) {
      updated = all.filter((l) => !(l.photo_id === photoId && l.sender === sender));
    } else {
      const newLike = {
        id: 'demo-like-' + Date.now(),
        photo_id: photoId,
        sender,
        created_at: new Date().toISOString(),
      };
      updated = [...all, newLike];
    }
    setLocalDemoData(STORAGE_KEYS.DEMO_LIKES, updated);

    const photoLikes = updated.filter((l) => l.photo_id === photoId);
    return {
      likedByMe: photoLikes.some((l) => l.sender === sender),
      total: photoLikes.length,
    };
  }

  // 1. Mevcut beğeniyi bul
  let existing = null;
  try {
    const res = await supabase
      .from('likes')
      .select('id')
      .eq('photo_id', photoId)
      .eq('sender', sender)
      .limit(1);

    if (res.error) throw res.error;
    existing = (res.data && res.data[0]) || null;
  } catch (err) {
    console.error('Beğeni sorgu hatası:', err);
    if (isRelationMissingError(err)) {
      throw new Error('public.likes tablosu veritabaninda yok' + LIKES_TABLE_MISSING_HINT);
    }
    throw new Error('Beğeni kontrol edilemedi: ' + err.message);
  }

  // 2. Kayıt varsa sil, yoksa ekle
  if (existing) {
    try {
      const { error: delError } = await supabase
        .from('likes')
        .delete()
        .eq('id', existing.id);

      if (delError) throw delError;
    } catch (err) {
      console.error('Beğeni silme hatası:', err);
      if (isRelationMissingError(err)) {
        throw new Error('public.likes tablosu veritabaninda yok' + LIKES_TABLE_MISSING_HINT);
      }
      throw new Error('Beğeni geri alınamadı: ' + err.message);
    }
  } else {
    try {
      const { error: insError } = await supabase
        .from('likes')
        .insert([{ photo_id: photoId, sender }]);

      if (insError) throw insError;
    } catch (err) {
      console.error('Beğeni ekleme hatası:', err);

      // RACE CONDITION: UNIQUE(photo_id, sender) ihlali — başka bir istek aynı anda insert etmiş
      // Bu durumda "zaten beğenilmiş" sayıp yeniden sorgula, kullanıcıya hata atma
      if (isUniqueViolation(err)) {
        return await refetchLikesState(photoId, sender);
      }
      if (isCheckViolation(err)) {
        throw new Error(
          'Gönderen değeri veritabanı CHECK kuralını ihlal ediyor. ' +
          'Lütfen "Yaşar" veya "Beyza" değerlerinden birini kullandığınızdan emin olun.'
        );
      }
      if (isRelationMissingError(err)) {
        throw new Error('public.likes tablosu veritabaninda yok' + LIKES_TABLE_MISSING_HINT);
      }
      throw new Error('Beğeni eklenemedi: ' + err.message);
    }
  }

  // 3. Son durumu tekrar oku ve dön
  try {
    return await refetchLikesState(photoId, sender);
  } catch (err) {
    console.error('Beğeni son durum okuma hatası:', err);
    if (isRelationMissingError(err)) {
      throw new Error('public.likes tablosu veritabaninda yok' + LIKES_TABLE_MISSING_HINT);
    }
    throw new Error('Beğeni sayısı okunamadı: ' + err.message);
  }
}

// ==============================================================================
// AŞK NOTLARI İŞLEMLERİ (notes)
// ==============================================================================

/**
 * Tüm notları getir (en yeniden eskiye)
 */
export async function getNotes() {
  if (!isSupabaseConfigured) {
    return getLocalDemoData(STORAGE_KEYS.DEMO_NOTES, DEFAULT_DEMO_NOTES);
  }

  const copDestegi = await isTrashAvailable();

  const sorgu = (filtrele) => {
    let q = supabase.from('notes').select('*').order('created_at', { ascending: false });
    if (filtrele) q = q.is('deleted_at', null);
    return q;
  };

  let { data, error } = await sorgu(copDestegi);

  if (error && copDestegi) {
    console.warn('Çöp kutusu filtresi uygulanamadı, filtresiz devam ediliyor:', error.message);
    ({ data, error } = await sorgu(false));
  }

  if (error) {
    console.error('Notlar getirilirken hata:', error);
    throw new Error('Notlar yüklenemedi: ' + error.message);
  }

  return data || [];
}

/**
 * Yeni aşk notu ekle
 */
export async function addNote({ sender, content }) {
  if (!content?.trim()) {
    throw new Error('Lütfen not içeriğini boş bırakmayın.');
  }

  if (!isSupabaseConfigured) {
    const newNote = {
      id: 'demo-n-' + Date.now(),
      created_at: new Date().toISOString(),
      sender,
      content: content.trim(),
    };
    const all = getLocalDemoData(STORAGE_KEYS.DEMO_NOTES, DEFAULT_DEMO_NOTES);
    setLocalDemoData(STORAGE_KEYS.DEMO_NOTES, [newNote, ...all]);
    return newNote;
  }

  const { data, error } = await supabase
    .from('notes')
    .insert([
      {
        sender,
        content: content.trim(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Not ekleme hatası:', error);
    throw new Error('Not eklenemedi: ' + error.message);
  }

  return data;
}

/**
 * Not siler.
 * Çöp kutusu destekleniyorsa yalnızca işaretlenir (30 gün geri alınabilir).
 * @returns {Promise<{softDeleted: boolean}>}
 */
export async function deleteNote(noteId) {
  if (!noteId) return { softDeleted: false };

  if (!isSupabaseConfigured) {
    const all = getLocalDemoData(STORAGE_KEYS.DEMO_NOTES, DEFAULT_DEMO_NOTES);
    setLocalDemoData(
      STORAGE_KEYS.DEMO_NOTES,
      all.filter((n) => n.id !== noteId)
    );
    return { softDeleted: false };
  }

  if (await isTrashAvailable()) {
    const { error } = await supabase
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', noteId);

    if (!error) return { softDeleted: true };

    console.warn('Not çöpe taşınamadı, kalıcı silme denenecek:', error.message);
  }

  await purgeNote(noteId);
  return { softDeleted: false };
}

/**
 * Notu KALICI olarak siler.
 */
export async function purgeNote(noteId) {
  if (!noteId) return false;

  const { error } = await supabase.from('notes').delete().eq('id', noteId);

  if (error) {
    console.error('Not silme hatası:', error);
    throw new Error('Not silinemedi: ' + error.message);
  }

  return true;
}

/**
 * Tek bir dosya için imzalı (süreli) adres üretir.
 * Yedekleme indirmesi gibi uygulama dışı kullanımlar için.
 */
export async function createPhotoSignedUrl(storagePath, expiresIn = 600) {
  if (!isSupabaseConfigured || !storagePath) return null;

  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.warn('İmzalı adres üretilemedi:', storagePath, error.message);
    return null;
  }

  return toAbsoluteStorageUrl(data?.signedUrl);
}

/**
 * Önizlemesi (thumbnail) olmayan eski fotoğraflar için önizleme üretir.
 *
 * Yeni yüklemelerde önizleme otomatik oluşur; bu fonksiyon yalnızca
 * bu özellik eklenmeden ÖNCE yüklenmiş fotoğraflar için bir kerelik bakımdır.
 * Fotoğrafı indirir, tarayıcıda küçültür ve storage'a yükler.
 */
export async function backfillMissingThumbnails({ onProgress } = {}) {
  const bildir = (mesaj, tamamlanan, toplam) => {
    if (typeof onProgress === 'function') onProgress({ mesaj, tamamlanan, toplam });
  };

  if (!isSupabaseConfigured) {
    throw new Error('Bu bakım yalnızca Supabase bağlıyken yapılabilir.');
  }

  bildir('Fotoğraflar kontrol ediliyor...', 0, 0);
  const photos = await getPhotos();

  const hedefler = [];
  for (const photo of photos) {
    if (!photo?.storage_path || /^(demo|local)/i.test(photo.storage_path)) continue;
    if (!photo.url) continue;

    const dosyaAdi = thumbPathFor(photo.storage_path).split('/').pop();

    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .list('', { search: dosyaAdi, limit: 1 });

    if (error) {
      console.warn('Önizleme kontrolü yapılamadı:', error.message);
      continue;
    }

    const varMi = (data ?? []).some((item) => item.name === dosyaAdi);
    if (!varMi) hedefler.push(photo);
  }

  let olusturulan = 0;
  let basarisiz = 0;

  for (let index = 0; index < hedefler.length; index += 1) {
    const photo = hedefler[index];
    bildir(`Önizleme üretiliyor (${index + 1}/${hedefler.length})`, index, hedefler.length);

    try {
      const response = await fetch(photo.url);
      if (!response.ok) throw new Error('Fotoğraf indirilemedi');

      const blob = await response.blob();
      const thumb = await createThumbnailFor(blob);
      const thumbPath = thumbPathFor(photo.storage_path);

      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET_NAME)
        .upload(thumbPath, thumb.blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (error) throw error;
      olusturulan += 1;
    } catch (err) {
      console.warn('Önizleme üretilemedi:', photo.storage_path, err);
      basarisiz += 1;
    }
  }

  bildir('Bitti', hedefler.length, hedefler.length);

  return {
    kontrolEdilen: photos.length,
    eksikOlan: hedefler.length,
    olusturulan,
    basarisiz,
  };
}

// ==============================================================================
// ANI HARİTASI — KONUM İŞLEMLERİ
// ==============================================================================
// latitude / longitude / location_name sütunları Faz 3 SQL betiğiyle eklenir.
// Sütunlar yoksa isLocationAvailable() false döner ve arayüz bölümü gizler.

/**
 * Konum özelliği kullanılabilir mi? (sütunlar eklendi mi)
 */
export async function isLocationAvailable() {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from('photos').select('latitude').limit(1);
    return !error;
  } catch (err) {
    console.warn('Konum özelliği kontrol edilemedi:', err);
    return false;
  }
}

/**
 * Bir anının konumunu kaydeder.
 */
export async function updatePhotoLocation(photoId, { latitude, longitude, locationName }) {
  if (!photoId) throw new Error('Konum eklenecek anı bulunamadı.');
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Geçerli bir konum seçilmedi.');
  }

  const { error } = await supabase
    .from('photos')
    .update({
      latitude,
      longitude,
      location_name: locationName?.trim() || null,
    })
    .eq('id', photoId);

  if (error) {
    console.error('Konum kaydetme hatası:', error);
    throw new Error('Konum kaydedilemedi: ' + error.message);
  }

  return true;
}

/**
 * Bir anının konumunu kaldırır.
 */
export async function clearPhotoLocation(photoId) {
  if (!photoId) return false;

  const { error } = await supabase
    .from('photos')
    .update({ latitude: null, longitude: null, location_name: null })
    .eq('id', photoId);

  if (error) {
    console.error('Konum silme hatası:', error);
    throw new Error('Konum kaldırılamadı: ' + error.message);
  }

  return true;
}

// ==============================================================================
// İSTATİSTİKLER VE YEDEKLEME VERİSİ
// ==============================================================================

/**
 * Tablo başına toplam kayıt sayısını döner (başarımlar ve istatistik kartları için).
 * Sadece sayım istenir; veri indirilmez (head: true).
 */
export async function getCounts() {
  const empty = { photos: 0, notes: 0, comments: 0, likes: 0 };
  if (!isSupabaseConfigured) return empty;

  const copDestegi = await isTrashAvailable();

  // Çöpteki kayıtlar istatistiklere ve başarımlara SAYILMAZ.
  const countOf = async (table, copuHaric = false) => {
    const calistir = async (filtrele) => {
      let query = supabase.from(table).select('*', { count: 'exact', head: true });
      if (filtrele) query = query.is('deleted_at', null);
      return await query;
    };

    let { count, error } = await calistir(copuHaric && copDestegi);

    if (error && copuHaric && copDestegi) {
      console.warn(`${table} çöp filtresi uygulanamadı, filtresiz sayılıyor:`, error.message);
      ({ count, error } = await calistir(false));
    }

    if (error) {
      console.warn(`${table} sayısı alınamadı:`, error.message);
      return 0;
    }
    return count ?? 0;
  };

  const [photos, notes, comments, likes] = await Promise.all([
    countOf('photos', true),
    countOf('notes', true),
    countOf('comments'),
    countOf('likes'),
  ]);

  return { photos, notes, comments, likes };
}

/**
 * Yedekleme için tüm veriyi indirir.
 */
export async function getAllDataForBackup() {
  if (!isSupabaseConfigured) {
    return {
      notes: getLocalDemoData(STORAGE_KEYS.DEMO_NOTES, DEFAULT_DEMO_NOTES),
      photos: getLocalDemoData(STORAGE_KEYS.DEMO_PHOTOS, DEFAULT_DEMO_PHOTOS),
      comments: getLocalDemoData(STORAGE_KEYS.DEMO_COMMENTS, DEFAULT_DEMO_COMMENTS),
      likes: getLocalDemoData(STORAGE_KEYS.DEMO_LIKES, DEFAULT_DEMO_LIKES),
    };
  }

  const fetchAll = async (table, orderColumn = 'created_at') => {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderColumn, { ascending: true });

    if (error) {
      console.warn(`${table} yedeklenemedi:`, error.message);
      return [];
    }
    return data || [];
  };

  const [notes, photos, comments, likes] = await Promise.all([
    fetchAll('notes'),
    fetchAll('photos'),
    fetchAll('comments'),
    fetchAll('likes'),
  ]);

  return { notes, photos, comments, likes };
}

// ==============================================================================
// ÇÖP KUTUSU (GERİ ALINABİLİR SİLME)
// ==============================================================================
// deleted_at sütunu Faz 3 SQL betiğiyle eklenir. Sütun yoksa bu özellik
// kendini kapatır ve silme eskisi gibi kalıcı olur (hiçbir şey bozulmaz).

let trashCapabilityCache = null;
let trashCapabilityCheckedAt = 0;

// Olumsuz sonuç yalnızca kısa süre hatırlanır: böylece geçici bir ağ hatası
// yüzünden çöp kutusu tüm oturum boyunca kapalı kalmaz (silinen anılar
// galeride görünmesin diye bu önemli).
const TRASH_NEGATIVE_TTL_MS = 60 * 1000;

/**
 * Çöp kutusu kullanılabilir mi? (deleted_at sütunu var mı)
 * Olumlu sonuç oturum boyunca hatırlanır; her fotoğraf yüklemesinde sorgu yapılmaz.
 */
export async function isTrashAvailable() {
  if (!isSupabaseConfigured) return false;

  if (trashCapabilityCache === true) return true;
  if (
    trashCapabilityCache === false &&
    Date.now() - trashCapabilityCheckedAt < TRASH_NEGATIVE_TTL_MS
  ) {
    return false;
  }

  try {
    const { error } = await supabase.from('photos').select('deleted_at').limit(1);
    trashCapabilityCache = !error;
  } catch (err) {
    console.warn('Çöp kutusu kontrol edilemedi:', err);
    trashCapabilityCache = false;
  }

  trashCapabilityCheckedAt = Date.now();
  return trashCapabilityCache;
}

/**
 * Çöpteki fotoğrafları getirir (en son silinen başta).
 */
export async function getDeletedPhotos() {
  if (!isSupabaseConfigured || !(await isTrashAvailable())) return [];

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('Çöp kutusu okunamadı:', error);
    throw new Error('Çöp kutusu okunamadı: ' + error.message);
  }

  return withSignedPhotoUrls(data || []);
}

/**
 * Çöpteki notları getirir.
 */
export async function getDeletedNotes() {
  if (!isSupabaseConfigured || !(await isTrashAvailable())) return [];

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('Çöp kutusu (notlar) okunamadı:', error);
    throw new Error('Çöp kutusu okunamadı: ' + error.message);
  }

  return data || [];
}

/**
 * Çöpteki bir fotoğrafı geri getirir.
 */
export async function restorePhoto(photoId) {
  if (!photoId) throw new Error('Geri getirilecek anı bulunamadı.');

  const { error } = await supabase
    .from('photos')
    .update({ deleted_at: null })
    .eq('id', photoId);

  if (error) {
    console.error('Anı geri getirme hatası:', error);
    throw new Error('Anı geri getirilemedi: ' + error.message);
  }

  return true;
}

/**
 * Çöpteki bir notu geri getirir.
 */
export async function restoreNote(noteId) {
  if (!noteId) throw new Error('Geri getirilecek not bulunamadı.');

  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: null })
    .eq('id', noteId);

  if (error) {
    console.error('Not geri getirme hatası:', error);
    throw new Error('Not geri getirilemedi: ' + error.message);
  }

  return true;
}

// ==============================================================================
// NOT BEĞENİLERİ
// ==============================================================================
// note_likes tablosu 20261006_note_likes.sql ile eklenir. Tablo yoksa bu özellik
// kendini kapatır ve not kartında kalp hiç gösterilmez. (Önceden kalp yalnızca
// ekranda tutuluyordu: sayı görünmüyor ve sekme değişince kayboluyordu.)

let noteLikesCapabilityCache = null;
let noteLikesCheckedAt = 0;

/**
 * Not beğenileri kullanılabilir mi? (note_likes tablosu var mı)
 */
export async function isNoteLikesAvailable() {
  if (!isSupabaseConfigured) return false;

  if (noteLikesCapabilityCache === true) return true;
  if (noteLikesCapabilityCache === false && Date.now() - noteLikesCheckedAt < 60 * 1000) {
    return false;
  }

  try {
    const { error } = await supabase.from('note_likes').select('id').limit(1);
    noteLikesCapabilityCache = !error;
  } catch (err) {
    console.warn('Not beğenileri kontrol edilemedi:', err);
    noteLikesCapabilityCache = false;
  }

  noteLikesCheckedAt = Date.now();
  return noteLikesCapabilityCache;
}

/**
 * Tüm not beğenilerini getirir (note_id + sender).
 * Tek sorguda hepsi alınır; sayılar tarayıcıda hesaplanır.
 */
export async function getAllNoteLikes() {
  if (!isSupabaseConfigured || !(await isNoteLikesAvailable())) return [];

  const { data, error } = await supabase.from('note_likes').select('note_id, sender');

  if (error) {
    console.warn('Not beğenileri okunamadı:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Bir nota kalp bırakır / bırakılan kalbi geri alır.
 * @returns {Promise<{likedByMe: boolean, total: number}>}
 */
export async function toggleNoteLike(noteId, sender) {
  if (!noteId || !sender) return { likedByMe: false, total: 0 };

  if (!VALID_SENDERS.has(sender)) {
    throw new Error('Geçerli olmayan gönderen: ' + sender);
  }

  if (!isSupabaseConfigured) {
    return { likedByMe: true, total: 1 };
  }

  const mevcut = await supabase
    .from('note_likes')
    .select('id')
    .eq('note_id', noteId)
    .eq('sender', sender)
    .limit(1);

  if (mevcut.error) {
    throw new Error('Beğeni kontrol edilemedi: ' + mevcut.error.message);
  }

  if (mevcut.data && mevcut.data.length > 0) {
    const { error } = await supabase.from('note_likes').delete().eq('id', mevcut.data[0].id);
    if (error) throw new Error('Beğeni geri alınamadı: ' + error.message);
  } else {
    const { error } = await supabase.from('note_likes').insert([{ note_id: noteId, sender }]);
    // 23505 = zaten beğenilmiş (iki cihaz aynı anda) → sorun değil
    if (error && error.code !== '23505') {
      throw new Error('Beğeni kaydedilemedi: ' + error.message);
    }
  }

  const tumu = await getAllNoteLikes();
  const buNot = tumu.filter((satir) => satir.note_id === noteId);

  return {
    likedByMe: buNot.some((satir) => satir.sender === sender),
    total: buNot.length,
  };
}
