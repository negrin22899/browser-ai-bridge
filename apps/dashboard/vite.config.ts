import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Electron loads the dashboard via file://. Vite adds `crossorigin` to
 * module scripts / stylesheets, which forces CORS mode and fails on the
 * opaque file:// origin — the window then sits on its backgroundColor.
 */
function stripCrossorigin(): Plugin {
  return {
    name: 'strip-crossorigin',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(?:="[^"]*")?/g, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), stripCrossorigin()],
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
