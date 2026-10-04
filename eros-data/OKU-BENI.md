# 📁 eros-data — ÖZEL KLASÖR (GitHub'a yüklenmez)

Bu klasör **yalnızca senin bilgisayarında** kalır. İçine koyduğun hiçbir şey
GitHub'a, Vercel'e veya başka bir yere gönderilmez (`.gitignore` ile korumalı).

Buraya **Eros'un hafızasını** oluşturacak verileri koyacağız.

---

## 📱 WhatsApp konuşma dökümünü nasıl alırım?

Bunu **WhatsApp'ın kurulu olduğu telefonda** yapman gerekiyor:

1. Beyza ile olan sohbeti aç
2. Sağ üstteki **⋮** (üç nokta) → **Diğer** (iPhone'da sohbetin üstündeki isme dokun)
3. **Sohbeti dışa aktar** / **Export chat**
4. ⚠️ **"Medya olmadan" (Without media)** seçeneğini seç — fotoğraf/video olmasın,
   sadece yazılar gelsin (dosya çok daha küçük olur)
5. Açılan paylaşım menüsünden kendine gönder:
   - **Kendine mesaj** (Kendim / Message yourself) — en kolayı
   - ya da e-posta / Google Drive
6. Dosyayı bilgisayara indir ve **bu klasöre** koy

Dosya adı genelde şöyle olur: `WhatsApp Sohbeti - Beyza.txt`
veya `_chat.txt`. Adını değiştirmene gerek yok.

> 💡 **İki kişilik sohbet yetiyor.** Başka sohbetleri (aile, arkadaş grupları)
> de koyabilirsin ama gerek yok — Eros'un sizi tanıması için **Yaşar ↔ Beyza**
> sohbeti en değerli kaynak.

---

## 🔒 Gizlilik sözü

- Bu dosyalar **GitHub'a gitmez** (`.gitignore` korumalı)
- Eros'a soru sorduğunda, konuşmaların **tamamı** yapay zekâya gönderilmez —
  yalnızca bu dosyalardan çıkardığımız **özet profil** gönderilir
- Ham dökümün kendisi Supabase'de bile tutulmaz; yalnızca bu klasörde kalır
- İstediğin an bu klasörü silebilirsin; Eros'un profili ayrıca saklanır

---

## 📂 Bu klasörde ne olacak?

| Dosya | Ne işe yarar |
| --- | --- |
| `*.txt` | Senin koyduğun WhatsApp dökümleri (ham veri) |
| `ozet.json` | Betiğin çıkardığı istatistikler (kaç mesaj, hangi tarihler, sık kelimeler) |
| `ornekler.md` | Farklı dönemlerden örnek mesajlar (profili çıkarmak için) |

Betik: `node tools/eros-import.mjs --yardim`
