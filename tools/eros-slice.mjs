#!/usr/bin/env node
// ==============================================================================
// EROS — DÖKÜM DİLİMLEYİCİ
// ==============================================================================
// Tüm WhatsApp dökümünü, ATLAMADAN, eşit büyüklükte dilim dosyalarına böler.
// Her dilim baştan sona okunur (kelime araması değil, tam okuma).
//
// Sadece "saf dolgu" mesajlar elenir (hahaha, tamam, evet, emoji, selamlama...).
// Rakam, soru işareti, isim veya içerik taşıyan HİÇBİR mesaj elenmez.
//
// KULLANIM:  node tools/eros-slice.mjs [--hedef 28000]
// ÇIKTI:     eros-data/dilimler/dilim-01.txt ... (GitHub'a gitmez)
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { dokumuAyristir } from './eros-import.mjs';

const VERI = path.resolve('eros-data');
const CIKTI_KLASORU = path.join(VERI, 'dilimler');
const HEDEF_KARAKTER = Number(
  (process.argv.includes('--hedef') && process.argv[process.argv.indexOf('--hedef') + 1]) || 28000
);

// Saf dolgu kalıpları (yalnızca bunlardan oluşan KISA mesajlar elenir)
const DOLGU = [
  /^(ha+ha+|ha+h+a+|he+he+|hi+hi+)/i,
  /^(tamam+|tmm+|tm+|ok+|oki+)$/i,
  /^(evet+|hee+|he+|yok+|yoo+|hayır)$/i,
  /^(aşkım+|aşkımmm+|canım+|canımmm+|sevgilim+|bebeğim+|hayatım+|tatlım+|aşkitom+)$/i,
  /^(günaydın+|iyi geceler+|iyi akşamlar+|iyi günler+)$/i,
  /^(napıyosun|napıyon|ne yapıyorsun|nasılsın|iyiyim|sen nasılsın)[\s?!.]*$/i,
  /^(sağ ?ol+|sağol+)$/i,
  /^(öpüyorum+|öpüyorummm+)$/i,
  /^(aynen+|kesinlikle+|tabi+|tabiki+)$/i,
  /^[\p{Emoji}\p{Emoji_Component}\s]+$/u,
  /^[\s.,!?:;)\-(]*$/,
];

function dolguMu(metin) {
  const temiz = metin.trim();
  if (temiz.length > 24) return false; // uzun mesaj asla elenmez
  if (/[0-9?]/.test(temiz)) return false; // rakam/soru içeren asla elenmez

  const katlanmis = temiz.replace(/(.)\1{2,}/g, '$1$1'); // "aaa" → "aa"
  return DOLGU.some((kalip) => kalip.test(temiz) || kalip.test(katlanmis));
}

// ------------------------------------------------------------------------------
function tumMesajlariYukle() {
  const dosyalar = fs
    .readdirSync(VERI)
    .filter((ad) => ad.toLowerCase().endsWith('.txt'))
    .map((ad) => path.join(VERI, ad));

  let hepsi = [];
  for (const dosya of dosyalar) {
    hepsi = hepsi.concat(dokumuAyristir(fs.readFileSync(dosya, 'utf8')));
  }

  hepsi.sort((a, b) =>
    `${a.tarih}${String(a.saat).padStart(2, '0')}${String(a.dakika).padStart(2, '0')}`.localeCompare(
      `${b.tarih}${String(b.saat).padStart(2, '0')}${String(b.dakika).padStart(2, '0')}`
    )
  );

  return hepsi;
}

const tumMesajlar = tumMesajlariYukle();
const tutulan = tumMesajlar.filter((mesaj) => !dolguMu(mesaj.metin));

console.log(`Toplam mesaj       : ${tumMesajlar.length}`);
console.log(`Dolgu elendi       : ${tumMesajlar.length - tutulan.length}`);
console.log(`Okunacak mesaj     : ${tutulan.length} (ATLAMA YOK)`);

// Dilimlere böl (gün sınırlarını bozmadan, hedef karakter büyüklüğünde)
fs.rmSync(CIKTI_KLASORU, { recursive: true, force: true });
fs.mkdirSync(CIKTI_KLASORU, { recursive: true });

const dilimler = [];
let aktif = null;

for (const mesaj of tutulan) {
  const satir = `[${mesaj.tarih} ${String(mesaj.saat).padStart(2, '0')}:${String(
    mesaj.dakika
  ).padStart(2, '0')}] ${mesaj.gonderen}: ${mesaj.metin.replace(/\n/g, ' / ')}`;

  if (!aktif || (aktif.boyut >= HEDEF_KARAKTER && mesaj.tarih !== aktif.sonTarih)) {
    if (aktif) dilimler.push(aktif);
    aktif = {
      satirlar: [],
      boyut: 0,
      ilkTarih: mesaj.tarih,
      sonTarih: mesaj.tarih,
      adet: 0,
    };
  }

  aktif.satirlar.push(satir);
  aktif.boyut += satir.length + 1;
  aktif.sonTarih = mesaj.tarih;
  aktif.adet += 1;
}

if (aktif) dilimler.push(aktif);

dilimler.forEach((dilim, sira) => {
  const ad = `dilim-${String(sira + 1).padStart(2, '0')}.txt`;
  const baslik = [
    `# EROS DÖKÜM DİLİMİ ${sira + 1}/${dilimler.length}`,
    `# Tarih aralığı: ${dilim.ilkTarih} → ${dilim.sonTarih}`,
    `# Mesaj sayısı: ${dilim.adet}`,
    `# (Bu dosya dökümün TAMAMINDAN süzülmüştür; yalnızca saf dolgu elenmiştir.)`,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(CIKTI_KLASORU, ad), baslik + dilim.satirlar.join('\n'), 'utf8');

  console.log(
    `  ${ad} → ${dilim.ilkTarih}..${dilim.sonTarih} · ${dilim.adet} mesaj · ${Math.round(
      dilim.boyut / 1024
    )} KB`
  );
});

console.log(`\n${dilimler.length} dilim yazıldı: ${CIKTI_KLASORU}`);
