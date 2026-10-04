import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// ------------------------------------------------------------------------------
// PWA: Service worker kaydı
// ------------------------------------------------------------------------------
// Sadece üretim derlemesinde kaydedilir; geliştirme sırasında önbellek
// karışıklığı yaratmaması için dev ortamında devre dışıdır.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Sayfa açıldığında zaten bir servis çalışanı var mı? (İlk kurulumda
  // gereksiz yere sayfa yenilememek için gerekli.)
  const ilkKontrolcuVar = Boolean(navigator.serviceWorker.controller);
  let yenilendi = false;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      // updateViaCache: 'none' → tarayıcı sw.js dosyasını HTTP önbelleğinden
      // OKUMAZ. iPhone'da eski sürümün takılı kalmasının ana nedeni buydu.
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        registration.update().catch(() => {});

        // Yeni sürüm devreye girdiğinde sayfayı bir kez yenile: kullanıcı
      // elle önbellek temizlemek zorunda kalmasın.
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!ilkKontrolcuVar || yenilendi) return;
          yenilendi = true;
          window.location.reload();
        });
      })
      .catch((err) => console.warn('Service worker kaydedilemedi:', err));
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
