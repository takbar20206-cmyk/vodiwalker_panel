import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset URLs relative so the exact same build works
// both as a PWA on the web and inside the Capacitor Android WebView.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // the sandbox preview is served through a dynamic e2b.app hostname
    allowedHosts: true,
    watch: {
      // capacitor copies the build into android/ — don't reload on those writes
      ignored: ['**/android/**', '**/dist/**'],
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
});
