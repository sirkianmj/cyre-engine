import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  resolve: {
    alias: {
      '@cyre/engine': fileURLToPath(
        new URL('../engine/src/index.ts', import.meta.url),
      ),
      'node:http': fileURLToPath(
        new URL('./src/vite-shims/node-http.ts', import.meta.url),
      ),
      'node:https': fileURLToPath(
        new URL('./src/vite-shims/node-https.ts', import.meta.url),
      ),
      'node:fs': fileURLToPath(
        new URL('./src/vite-shims/node-fs.ts', import.meta.url),
      ),
      'node:path': fileURLToPath(
        new URL('./src/vite-shims/node-path.ts', import.meta.url),
      ),
    },
  },
});
