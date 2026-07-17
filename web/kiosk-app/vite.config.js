import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the built dist/ works from ANY host directory
  // (e.g. https://client-site.com/roi/ inside an iframe) — no server config.
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2015',
    cssTarget: 'chrome61',
  }
});
