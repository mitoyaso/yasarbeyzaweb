import React, { useCallback, useEffect, useRef, useState } from 'react';
import { erosaSor } from '../../lib/eros';
import {
  ORTAK_ODA,
  OZEL_ODA,
  ODA_BILGISI,
  odaAnahtari,
  sohbetYukle,
  sohbetMesajiEkle,
  sohbetTemizle,
  sohbetDinle,
  yerelOku,
  yerelYaz,
  yerelTemizle,
} from '../../lib/erosChat';
import { useModalA11y } from '../../lib/useModalA11y';
import { useTamEkranKatman } from '../../lib/useTamEkranKatman';
import { X, Send, Loader2, Sparkles, Trash2, HeartHandshake } from 'lucide-react';

const ONERILER = [
  'Bize güzel bir sürpriz fikri ver 💡',
  'Bugün biraz gergindik, ne yapmalıyız?',
  'Bizi ne kadar tanıyorsun?',
  'Bu hafta sonu ne yapabiliriz?',
];

/**
 * Eros — çiftin ilişkisini tanıyan yapay zekâ danışman.
 * Not: Yapay zekâ anahtarı burada değil, sunucudadır.
 */
export default function ErosChat({ photos = [], notes = [], yazan, showToast, onClose }) {
  const dialogRef = useModalA11y({ onClose });
  // Sohbet açıkken üst/alt menüleri gizle (klavye çakışması olmasın)
  useTamEkranKatman();
  const panelRef = useRef(null);
  const listeRef = useRef(null);
  const girdiRef = useRef(null);

  const [mesajlar, setMesajlar] = useState([]);
  const [girdi, setGirdi] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const [akanMetin, setAkanMetin] = useState('');
  const [hata, setHata] = useState('');

  // Oda: 'ortak' (ikiniz) veya 'ozel' (yalnızca sen)
  const [oda, setOda] = useState(ORTAK_ODA);
  const [sohbetHazir, setSohbetHazir] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

  // ---------------------------------------------------------------------------
  // TELEFON KLAVYESİ: Klavye açıldığında görünür alanı takip et.
  // (iOS/Android'de klavye açılınca görünür alan küçülür; sabit yükseklikli
  //  pencerelerde yazı kutusu klavyenin altında kalır.)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const gorunurAlan = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!gorunurAlan) return undefined;

    const ayarla = () => {
      const panel = panelRef.current;
      if (!panel) return;

      // Yalnızca telefonda uygulanır; masaüstünde pencere ölçüsü kullanılır
      if (window.innerWidth >= 640) {
        panel.style.height = '';
        panel.style.transform = '';
        return;
      }

      panel.style.height = `${gorunurAlan.height}px`;
      panel.style.transform = `translateY(${gorunurAlan.offsetTop}px)`;
    };

    ayarla();
    gorunurAlan.addEventListener('resize', ayarla);
    gorunurAlan.addEventListener('scroll', ayarla);

    return () => {
      gorunurAlan.removeEventListener('resize', ayarla);
      gorunurAlan.removeEventListener('scroll', ayarla);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // ODA YÜKLEME: ortak oda ikisine, özel oda yalnızca sahibine açıktır (RLS).
  // eros_messages tablosu yoksa yerel kayda düşülür.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let iptal = false;
    const anahtar = odaAnahtari(oda, yazan);

    (async () => {
      try {
        const kayitlar = await sohbetYukle(anahtar);
        if (iptal) return;

        if (kayitlar === null) {
          setSohbetHazir(false);
          setMesajlar(yerelOku(oda));
        } else {
          setSohbetHazir(true);
          setMesajlar(
            kayitlar.map((satir) => ({
              id: satir.id,
              rol: satir.rol,
              kim: satir.rol === 'kullanici' ? satir.gonderen : undefined,
              icerik: satir.icerik,
            }))
          );
        }
      } catch (err) {
        console.warn('Sohbet açılamadı:', err);
        if (!iptal) setMesajlar(yerelOku(oda));
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();

    return () => {
      iptal = true;
    };
  }, [oda, yazan]);

  // Ortak odada diğer kişinin yazdıklarını canlı göster
  useEffect(() => {
    if (!sohbetHazir) return undefined;

    const anahtar = odaAnahtari(oda, yazan);

    return sohbetDinle(anahtar, (yeni) => {
      if (!yeni?.id) return;

      setMesajlar((oncekiler) => {
        if (oncekiler.some((mesaj) => mesaj.id === yeni.id)) return oncekiler;

        return [
          ...oncekiler,
          {
            id: yeni.id,
            rol: yeni.rol,
            kim: yeni.rol === 'kullanici' ? yeni.gonderen : undefined,
            icerik: yeni.icerik,
          },
        ];
      });
    });
  }, [sohbetHazir, oda, yazan]);

  const kaydirEnAlta = useCallback(() => {
    const liste = listeRef.current;
    if (liste) liste.scrollTop = liste.scrollHeight;
  }, []);

  useEffect(() => {
    kaydirEnAlta();
  }, [mesajlar, akanMetin, kaydirEnAlta]);

  const odaDegistir = (yeniOda) => {
    if (yeniOda === oda) return;
    setYukleniyor(true);
    setMesajlar([]);
    setHata('');
    setOda(yeniOda);
  };

  const gonder = async (metin) => {
    const temiz = metin.trim();
    if (!temiz || bekliyor) return;

    const anahtar = odaAnahtari(oda, yazan);
    const gecmisMesajlar = [...mesajlar, { rol: 'kullanici', kim: yazan, icerik: temiz }];

    // Anında göster (iyimser)
    setMesajlar((oncekiler) => [...oncekiler, { ...gecmisMesajlar.at(-1), gecici: true }]);
    setGirdi('');
    setBekliyor(true);
    setAkanMetin('');
    setHata('');

    try {
      // 1) Kullanıcı mesajını kaydet
      if (sohbetHazir) {
        const kayit = await sohbetMesajiEkle({
          oda: anahtar,
          gonderen: yazan,
          rol: 'kullanici',
          icerik: temiz,
        });

        if (kayit?.id) {
          setMesajlar((oncekiler) =>
            oncekiler.map((mesaj) => (mesaj.gecici ? { ...mesaj, id: kayit.id, gecici: false } : mesaj))
          );
        }
      } else {
        yerelYaz(oda, gecmisMesajlar);
      }

      // 2) Eros'un cevabını al (kelime kelime)
      const cevap = await erosaSor({
        gecmis: gecmisMesajlar,
        yazan,
        photos,
        notes,
        onParca: (parca) => setAkanMetin((onceki) => onceki + parca),
      });

      const erosMesaji = { rol: 'eros', icerik: cevap || '...' };

      // 3) Cevabı kaydet
      if (sohbetHazir) {
        const kayit = await sohbetMesajiEkle({
          oda: anahtar,
          gonderen: 'Eros',
          rol: 'eros',
          icerik: erosMesaji.icerik,
        });
        if (kayit?.id) erosMesaji.id = kayit.id;

        setMesajlar((oncekiler) => [...oncekiler, erosMesaji]);
      } else {
        const tamamlanmis = [...gecmisMesajlar, erosMesaji];
        setMesajlar(tamamlanmis);
        yerelYaz(oda, tamamlanmis);
      }
    } catch (err) {
      console.error(err);
      setHata(err.message || 'Eros cevap veremedi.');
      if (showToast) showToast(err.message || 'Eros cevap veremedi.', 'error');
    } finally {
      setBekliyor(false);
      setAkanMetin('');
    }
  };

  const handleGonder = (event) => {
    event.preventDefault();
    gonder(girdi);
  };

  const handleTus = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      gonder(girdi);
    }
  };

  const temizle = async () => {
    const anahtar = odaAnahtari(oda, yazan);

    if (sohbetHazir) {
      await sohbetTemizle(anahtar);
    } else {
      yerelTemizle(oda);
    }

    setMesajlar([]);
    setHata('');
    if (showToast) showToast(`${ODA_BILGISI[oda].ad} sohbeti sıfırlandı.`, 'info');
  };

  const bosMu = !yukleniyor && mesajlar.length === 0 && !akanMetin;

  return (
    <div className="fixed inset-0 z-[90] bg-rose-950/70 backdrop-blur-sm flex items-stretch sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
      <div
        ref={(dugum) => {
          // Hem erişilebilirlik kancası hem klavye takibi aynı düğümü kullanır
          panelRef.current = dugum;
          dialogRef.current = dugum;
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Eros"
        className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-rose-200"
      >
        {/* Başlık */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 text-xl">
              💘
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-base leading-tight">Eros</p>
              <p className="text-[11px] text-white/85 truncate">
                İlişkinizi tanıyan danışmanınız
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {mesajlar.length > 0 && (
              <button
                type="button"
                onClick={temizle}
                title="Sohbeti sıfırla"
                className="p-2 rounded-full bg-white/15 hover:bg-white/30 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="p-2 rounded-full bg-white/15 hover:bg-white/30 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ODA SEÇİMİ: ortak oda / bana özel */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 border-b border-rose-100 shrink-0">
          {[ORTAK_ODA, OZEL_ODA].map((tur) => {
            const bilgi = ODA_BILGISI[tur];
            const secili = oda === tur;

            return (
              <button
                key={tur}
                type="button"
                onClick={() => odaDegistir(tur)}
                aria-pressed={secili}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl text-[11px] font-bold transition cursor-pointer ${
                  secili
                    ? 'bg-white text-rose-700 shadow-sm border border-rose-200'
                    : 'text-rose-400 hover:text-rose-600'
                }`}
              >
                <span>{bilgi.ikon}</span>
                <span>{bilgi.ad}</span>
              </button>
            );
          })}
        </div>

        <div
          className={`px-4 py-1.5 text-[10px] font-semibold shrink-0 ${
            oda === OZEL_ODA ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
          }`}
        >
          {oda === OZEL_ODA
            ? '🔒 Bu oda yalnızca sana ait — diğerin bu konuşmayı göremez.'
            : '💞 Ortak oda — ikiniz de bu konuşmayı görür ve yazabilirsiniz.'}
        </div>

        {/* Mesajlar */}
        <div ref={listeRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 bg-rose-50/40">
          {yukleniyor && (
            <div className="py-8 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-rose-400 mx-auto mb-2" />
              <p className="text-[11px] text-rose-500 font-medium">Sohbet açılıyor...</p>
            </div>
          )}

          {bosMu && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/25">
                <HeartHandshake className="w-8 h-8 text-white" />
              </div>
              <p className="font-bold text-rose-950 mb-1">Merhaba, ben Eros 💘</p>
              <p className="text-xs text-rose-600/90 leading-relaxed max-w-sm mx-auto">
                Sizi tanıyan, taraf tutmayan danışmanınızım. İster içinizden geçeni anlat,
                ister sürpriz fikri iste — buradayım.
              </p>
            </div>
          )}

          {mesajlar.map((mesaj, index) => {
            const erosMu = mesaj.rol === 'eros';
            return (
              <div
                key={index}
                className={`flex ${erosMu ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    erosMu
                      ? 'bg-white text-rose-950 border border-rose-100 rounded-bl-sm shadow-sm'
                      : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-sm shadow-md shadow-rose-500/20'
                  }`}
                >
                  {!erosMu && mesaj.kim && (
                    <p className="text-[10px] font-bold text-white/75 mb-0.5">{mesaj.kim}</p>
                  )}
                  {mesaj.icerik}
                </div>
              </div>
            );
          })}

          {akanMetin && (
            <div className="flex justify-start">
              <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-rose-100 text-sm text-rose-950 leading-relaxed whitespace-pre-wrap shadow-sm">
                {akanMetin}
                <span className="inline-block w-1.5 h-4 bg-rose-400 ml-0.5 animate-pulse align-middle" />
              </div>
            </div>
          )}

          {bekliyor && !akanMetin && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-rose-100 shadow-sm flex items-center gap-2 text-xs text-rose-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Eros düşünüyor...</span>
              </div>
            </div>
          )}

          {hata && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
              {hata}
            </div>
          )}
        </div>

        {/* Öneriler */}
        {bosMu && (
          <div className="px-4 py-2 flex gap-2 overflow-x-auto bg-rose-50/40 shrink-0">
            {ONERILER.map((oneri) => (
              <button
                key={oneri}
                type="button"
                onClick={() => gonder(oneri)}
                className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-rose-200 text-rose-700 text-[11px] font-semibold hover:bg-rose-50 transition cursor-pointer"
              >
                {oneri}
              </button>
            ))}
          </div>
        )}

        {/* Giriş */}
        <form onSubmit={handleGonder} className="p-3 border-t border-rose-100 bg-white shrink-0 safe-area-pb">
          <div className="flex items-end gap-2">
            <textarea
              ref={girdiRef}
              rows="1"
              value={girdi}
              onChange={(event) => setGirdi(event.target.value)}
              onKeyDown={handleTus}
              placeholder="Eros'a bir şey yaz..."
              className="flex-1 resize-none max-h-28 px-3.5 py-2.5 rounded-2xl border border-rose-200 text-base sm:text-sm text-rose-950 placeholder-rose-300 focus:outline-none focus:border-rose-400"
            />
            <button
              type="submit"
              disabled={!girdi.trim() || bekliyor}
              className="p-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25 hover:from-rose-600 hover:to-pink-600 transition disabled:opacity-50 cursor-pointer shrink-0"
              aria-label="Gönder"
            >
              {bekliyor ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[10px] text-rose-400 mt-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Eros sizi tanır ama uzman değildir; ciddi konularda gerçek bir danışmana başvurun.
          </p>
        </form>
      </div>
    </div>
  );
}
