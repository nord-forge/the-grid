import { defineConfig } from 'vite';

import { fileURLToPath } from 'node:url';

/**
 * Library build. Only `src/` is bundled; React stays a peer dependency. The prototype, benchmark and
 * baselines have their own Vite configs and never feed into this output.
 */
export default defineConfig(({ mode }) => ({
    build: {
        // Keep the JavaScript target aligned with the documented browser/API requirements.
        target:
            mode === 'legacy'
                ? ['chrome88', 'edge88', 'firefox85', 'safari14']
                : ['chrome114', 'edge114', 'firefox125', 'safari17'],
        outDir: 'dist',
        emptyOutDir: mode !== 'legacy',
        sourcemap: true,
        minify: false,
        lib: {
            entry: fileURLToPath(new URL(mode === 'legacy' ? 'src/legacy/index.ts' : 'src/index.ts', import.meta.url)),
            formats: ['es'],
            fileName: () => (mode === 'legacy' ? 'legacy.js' : 'index.js'),
        },
        rolldownOptions: {
            external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
        },
    },
}));
