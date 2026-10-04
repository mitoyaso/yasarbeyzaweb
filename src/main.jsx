import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ------------------------------------------------------------------------------
// PWA: Service worker kaydı
// ------------------------------------------------------------------------------
// Sadece üretim derlemesinde kaydedilir; geliştirme sırasında önbellek
// karışıklığı yaratmaması için dev ortamında devre dışıdır.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('Service worker kaydedilemedi:', err));
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
