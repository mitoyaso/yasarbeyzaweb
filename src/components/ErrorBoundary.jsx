import React from 'react';
import { Heart, RefreshCw, RotateCcw } from 'lucide-react';

/**
 * Hata Kalkanı (Error Boundary)
 * Beklenmeyen bir hata olduğunda uygulamanın bembeyaz ekrana düşmesini engeller;
 * anlaşılır bir mesaj ve kurtarma seçenekleri gösterir.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Beklenmeyen arayüz hatası:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div className="min-h-screen w-full flex items-center justify-center p-5">
        <div className="w-full max-w-md glass-panel bg-white/90 rounded-3xl p-7 shadow-2xl border border-rose-200 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-400 text-white shadow-lg shadow-rose-500/30 mb-4">
            <Heart className="w-7 h-7 fill-white" />
          </div>

          <h1 className="text-xl font-extrabold text-rose-950 font-serif mb-2">
            Bir aksilik oldu 💔
          </h1>

          <p className="text-sm text-rose-700/90 font-medium leading-relaxed mb-5">
            Beklenmeyen bir hata oluştu ama endişelenme: <strong>anıların ve notların
            güvende</strong>. Aşağıdaki butonlardan biriyle devam edebilirsin.
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-rose-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Tekrar Dene</span>
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 px-5 rounded-2xl bg-white border border-rose-200 text-rose-700 font-bold text-sm hover:bg-rose-50 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sayfayı Yenile</span>
            </button>
          </div>

          <details className="mt-5 text-left">
            <summary className="text-[11px] text-rose-400 cursor-pointer hover:text-rose-600 font-semibold">
              Teknik ayrıntıyı göster
            </summary>
            <pre className="mt-2 p-3 rounded-xl bg-rose-50 text-[10px] text-rose-700 overflow-x-auto whitespace-pre-wrap break-words">
              {String(error?.message || error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
