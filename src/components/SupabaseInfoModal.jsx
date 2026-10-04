import React, { useState } from 'react';
import { Database, X, Check, Copy, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useModalA11y } from '../lib/useModalA11y';

export default function SupabaseInfoModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  // Escape ile kapanma + odak tuzağı (kanca koşulsuz çağrılmalı)
  const dialogRef = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  const sqlSample = `-- Supabase SQL Editöründe çalıştırmak için proje kök dizinindeki
-- supabase_schema.sql dosyasını kullanabilirsiniz.`;

  const handleCopySql = () => {
    navigator.clipboard?.writeText(sqlSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Supabase Bilgilendirme"
        className="w-full max-w-lg glass-panel bg-white/95 rounded-3xl p-6 sm:p-7 shadow-2xl border border-rose-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-950 font-serif">
                Supabase Bağlantı Kılavuzu
              </h3>
              <p className="text-xs text-rose-500 font-medium">
                {isSupabaseConfigured
                  ? '✅ Supabase başarıyla bağlandı ve çalışıyor!'
                  : '⚠️ Şu anda yerel Demo Modunda çalışıyor.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-rose-900 leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80">
            <h4 className="font-bold text-rose-950 mb-1 flex items-center gap-1.5">
              <span>1. Supabase Projenizi Oluşturun</span>
            </h4>
            <p className="text-rose-700/90 text-xs">
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="underline font-bold text-rose-600 hover:text-rose-800 inline-flex items-center gap-1"
              >
                supabase.com <ExternalLink className="w-3 h-3" />
              </a>{' '}
              üzerinde ücretsiz yeni bir proje başlatın.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80">
            <h4 className="font-bold text-rose-950 mb-1">
              2. SQL Şemasını Çalıştırın
            </h4>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-rose-700/90 text-xs">
                Proje kök dizinindeki <code className="bg-white px-1.5 py-0.5 rounded border border-rose-200 font-mono text-[11px]">supabase_schema.sql</code> dosyasının içeriğini kopyalayıp Supabase panelinizdeki <strong>SQL Editor</strong> kısmına yapıştırın ve <strong>Run</strong> butonuna basın.
              </p>
              <button
                type="button"
                onClick={handleCopySql}
                className="shrink-0 p-1.5 px-2.5 rounded-lg border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="Şema Açıklamasını Kopyala"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            </div>
            <span className="text-[11px] text-rose-500 font-medium">
              Bu işlem `notes`, `photos`, `comments` tablolarını ve `couples-photos` Depolama Bucket'ını otomatik oluşturur.
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80">
            <h4 className="font-bold text-rose-950 mb-1">
              3. .env.local Bilgilerini Ekleyin
            </h4>
            <p className="text-rose-700/90 text-xs mb-2">
              Supabase <em>Project Settings → API</em> kısmındaki bilgileri <code className="bg-white px-1.5 py-0.5 rounded border border-rose-200 font-mono text-[11px]">.env.local</code> dosyasına yazın:
            </p>
            <pre className="p-2.5 rounded-xl bg-rose-950 text-rose-100 font-mono text-[11px] overflow-x-auto">
VITE_SUPABASE_URL=https://projeniz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
            </pre>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80">
            <h4 className="font-bold text-rose-950 mb-1">
              4. Vercel'e Dağıtım (Deploy)
            </h4>
            <p className="text-rose-700/90 text-xs">
              GitHub deponuzu Vercel'e bağladığınızda <strong>Environment Variables</strong> bölümüne yukarıdaki iki değişkeni (<code className="bg-white px-1 rounded text-[11px]">VITE_SUPABASE_URL</code> ve <code className="bg-white px-1 rounded text-[11px]">VITE_SUPABASE_ANON_KEY</code>) eklemeyi unutmayın.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-rose-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition"
          >
            Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
