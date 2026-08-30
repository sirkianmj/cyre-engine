import { defineConfig } from 'vitest/config';

import { cyreDefines } from './vite.config';

export default defineConfig({
  // The same injected versions the app builds with, so tests assert against the
  // real values rather than the 'unknown' fallback.
  define: cyreDefines,
  test: {
    exclude: ['e2e/**'],
    // Component tests need a DOM; the engine suite stays on the node runtime.
    environmentMatchGlobs: [['src/**/*.tsx', 'jsdom']],
    setupFiles: ['./src/test/setup.ts'],
  },
});
