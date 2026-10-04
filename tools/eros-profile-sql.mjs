#!/usr/bin/env node
// ==============================================================================
// EROS — PROFİLDEN SQL ÜRETİCİ
// ==============================================================================
// eros-data/eros-profile.md dosyasını okur ve Supabase'de çalıştırılacak TEK
// dosyalık bir SQL betiği üretir (tablo + profil kayıtları).
//
// KULLANIM:  node tools/eros-profile-sql.mjs
// ÇIKTI:     eros-data/eros-memory.sql   (GitHub'a gitmez!)
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';

const PROFIL = path.resolve('eros-data/eros-profile.md');
const SEMA = path.resolve('supabase/migrations/20261007_eros_memory.sql');
const CIKTI = path.resolve('eros-data/eros-memory.sql');

if (!fs.existsSync(PROFIL)) {
  console.error(`Profil bulunamadı: ${PROFIL}`);
  process.exit(1);
}

const metin = fs.readFileSync(PROFIL, 'utf8');

// "## Başlık" bloklarına ayır
const bloklar = [];
let aktif = null;

for (const satir of metin.split(/\r?\n/)) {
  const baslik = satir.match(/^##\s+(.+?)\s*$/);

  if (baslik) {
    if (aktif) bloklar.push(aktif);
    aktif = { baslik: baslik[1].replace(/"/g, ''), satirlar: [] };
    continue;
  }

  // Dosyanın en başındaki (## öncesi) açıklamayı atla
  if (aktif) aktif.satirlar.push(satir);
}

if (aktif) bloklar.push(aktif);

const kayitlar = bloklar
  .map((blok) => ({ ...blok, icerik: blok.satirlar.join('\n').trim() }))
  .filter((blok) => blok.icerik.length > 0);

if (kayitlar.length === 0) {
  console.error('Profilden hiç bölüm çıkarılamadı.');
  process.exit(1);
}

// Dolar tırnaklama: içerikte tırnak/özel karakter olsa da bozulmaz
const etiket = '$eros$';

const degerler = kayitlar
  .map((kayit, index) => {
    const baslik = kayit.baslik.replace(/'/g, "''");
    return `  ('${baslik}', ${etiket}${kayit.icerik}${etiket}, ${index + 1})`;
  })
  .join(',\n');

const sema = fs.existsSync(SEMA)
  ? fs.readFileSync(SEMA, 'utf8')
  : '-- (şema dosyası bulunamadı)';

const sql = `-- ==============================================================================
-- EROS HAFIZASI — TEK SEFERLİK KURULUM
-- ==============================================================================
-- Bu dosya otomatik üretildi: node tools/eros-profile-sql.mjs
-- Supabase → SQL Editor → tümünü yapıştır → Run
--
-- İçerik: ${kayitlar.length} hafıza bölümü (WhatsApp dökümünden çıkarıldı)
-- GİZLİDİR: Bu dosya eros-data/ içindedir, GitHub'a yüklenmez.
-- ==============================================================================

${sema}

-- ------------------------------------------------------------------------------
-- PROFİL KAYITLARI (${kayitlar.length} bölüm)
-- ------------------------------------------------------------------------------
-- ÖNEMLİ: Önce tüm hafıza silinir, sonra dosyadan yeniden yazılır.
-- Böylece veritabanı HER ZAMAN bu dosyayla birebir aynı olur (eski/artık
-- kalmış bölümler birikmez).
BEGIN;

DELETE FROM public.eros_memory;

INSERT INTO public.eros_memory (baslik, icerik, sira) VALUES
${degerler};

COMMIT;

-- DOĞRULAMA
SELECT count(*) AS "hafiza bolumu" FROM public.eros_memory;
`;

fs.writeFileSync(CIKTI, sql, 'utf8');

console.log(`✓ ${kayitlar.length} hafıza bölümü yazıldı`);
console.log(`✓ Dosya: ${CIKTI}`);
console.log('\nBölümler:');
for (const kayit of kayitlar) {
  console.log(`   • ${kayit.baslik} (${kayit.icerik.length} karakter)`);
}
