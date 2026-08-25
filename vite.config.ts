import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    sourcemap: true,
    // Split the lightbox/upload manager (heavier, not needed on first paint
    // of the gallery grid) into their own chunks so the initial gallery
    // load — the page a customer actually lands on from a QR scan — stays
    // small.
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
