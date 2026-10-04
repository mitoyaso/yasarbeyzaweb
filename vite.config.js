import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
//
// NOT (paket boyutu): Üretim paketi ~577 kB (gzip ~162 kB) ve Vite 500 kB
// eşiği için uyarı veriyor. Paket bölme (code splitting) denendi; bu Vite
// sürümü "manualChunks" için yalnızca fonksiyon biçimini kabul ediyor ve
// tarayıcı çalışma zamanında doğrulanamadığı için bilinçli olarak
// uygulanmadı. İki kişilik bir uygulama için kazanç marjinaldir.
// Paketin büyük kısmını React ve Supabase istemcisi oluşturur.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
