// Single-file build: everything (JS, CSS, fonts, logo, the lazy PDF chunks)
// inlined into ONE self-contained index.html - for hand-offs where hosting a
// folder is awkward. The normal multi-file build (vite.config.js) remains the
// default for `npm run package`. Run: npm run build:single -> dist-single/index.html
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: {
    outDir: 'dist-single',
    target: 'es2015',
    cssTarget: 'chrome61',
    assetsInlineLimit: 100000000,   // inline fonts + images as data: URIs
  },
});
