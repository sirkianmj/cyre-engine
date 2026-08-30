import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Read the real package versions at build time.
 *
 * Injecting them beats hard-coding a number that silently goes stale, and beats
 * shipping a "1.0.0" placeholder in the launcher and the About window.
 */
function packageVersion(relativePath: string): string {
  const raw = readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  const version = (parsed as { version?: unknown }).version;
  return typeof version === 'string' && version.length > 0 ? version : 'unknown';
}

export const cyreDefines = {
  __CYRE_ENGINE_VERSION__: JSON.stringify(packageVersion('../engine/package.json')),
  __CYRE_STUDIO_VERSION__: JSON.stringify(packageVersion('./package.json')),
} as const;

export default defineConfig({
  plugins: [react()],
  define: cyreDefines,
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
