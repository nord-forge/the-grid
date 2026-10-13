import { defineConfig } from 'vitest/config';

import { fileURLToPath } from 'node:url';
export default defineConfig({
    resolve: { alias: { '@nord-forge/the-grid': fileURLToPath(new URL('./src/index.ts', import.meta.url)) } },
});
