import { createClient } from '@supabase/supabase-js';
import { SUPABASE_BUCKET_NAME, STORAGE_KEYS } from './constants';

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

/**
 * Fotoğrafları listele (en yeniden eskiye)
 */
export async function getPhotos() {
  if (!isSupabaseConfigured) {
    return getLocalDemoData(STORAGE_KEYS.DEMO_PHOTOS, DEFAULT_DEMO_PHOTOS);
  }

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fotoğraflar getirilirken hata oluştu:', error);
    throw new Error('Fotoğraflar yüklenemedi: ' + error.message);
  }

  return data || [];
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

  // 1. Dosya için benzersiz ve güvenli bir yol oluştur
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(fileExt) ? fileExt : 'jpg';
  const fileName = `foto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;
  const filePath = `${fileName}`;

  // 2. Dosyayı Supabase Storage 'couples-photos' bucket'ına yükle
  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage yükleme hatası:', uploadError);
    throw new Error('Fotoğraf depolama alanına yüklenemedi: ' + uploadError.message);
  }

  // 3. Dosyanın herkese açık (Public) URL'ini al
  const { data: publicUrlData } = supabase.storage
    .from(SUPABASE_BUCKET_NAME)
    .getPublicUrl(filePath);

  const publicUrl = publicUrlData.publicUrl;

  // 4. Bilgileri 'photos' tablosuna kaydet
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

  return photoRecord;
}

/**
 * Fotoğrafı sil (Hem Supabase Storage'dan hem de Veritabanından)
 */
export async function deletePhoto(photo) {
  if (!photo?.id) throw new Error('Silinecek fotoğraf bulunamadı.');

  if (!isSupabaseConfigured) {
    const currentPhotos = getLocalDemoData(STORAGE_KEYS.DEMO_PHOTOS, DEFAULT_DEMO_PHOTOS);
    const updated = currentPhotos.filter((p) => p.id !== photo.id);
    setLocalDemoData(STORAGE_KEYS.DEMO_PHOTOS, updated);
    return true;
  }

  // 1. Supabase Storage'dan dosyayı sil (varsa)
  if (photo.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .remove([photo.storage_path]);

    if (storageError) {
      console.warn('Storage silme uyarısı:', storageError);
    }
  }

  // 2. Veritabanındaki 'photos' kaydını sil
  const { error: dbError } = await supabase
    .from('photos')
    .delete()
    .eq('id', photo.id);

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
 */
export async function getLikes(photoId) {
  if (!photoId) return { likes: [], likedByMe: false, total: 0 };

  const sender = localStorage.getItem(STORAGE_KEYS.ACTIVE_SENDER) || 'Yaşar';

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

/**
 * Bir fotoğrafı beğen / beğeniyi geri al
 */
export async function toggleLike(photoId, sender) {
  if (!photoId || !sender) return { likedByMe: false, total: 0 };

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

  // Supabase tarafında önce mevcut beğeniyi kontrol et
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('photo_id', photoId)
    .eq('sender', sender)
    .maybeSingle();

  if (existing) {
    const { error: delError } = await supabase
      .from('likes')
      .delete()
      .eq('id', existing.id);

    if (delError) {
      console.error('Beğeni silme hatası:', delError);
      throw new Error('Beğeni geri alınamadı: ' + delError.message);
    }
  } else {
    const { error: insError } = await supabase
      .from('likes')
      .insert([{ photo_id: photoId, sender }]);

    if (insError) {
      console.error('Beğeni ekleme hatası:', insError);
      throw new Error('Beğeni eklenemedi: ' + insError.message);
    }
  }

  // Son durumu tekrar oku
  const { data: finalData } = await supabase
    .from('likes')
    .select('*')
    .eq('photo_id', photoId);

  const final = finalData || [];
  return {
    likedByMe: final.some((l) => l.sender === sender),
    total: final.length,
  };
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

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });

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
 * Not sil
 */
export async function deleteNote(noteId) {
  if (!noteId) return;

  if (!isSupabaseConfigured) {
    const all = getLocalDemoData(STORAGE_KEYS.DEMO_NOTES, DEFAULT_DEMO_NOTES);
    setLocalDemoData(
      STORAGE_KEYS.DEMO_NOTES,
      all.filter((n) => n.id !== noteId)
    );
    return true;
  }

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('Not silme hatası:', error);
    throw new Error('Not silinemedi: ' + error.message);
  }

  return true;
}
