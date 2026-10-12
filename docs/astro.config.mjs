import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';

const path = (value) => fileURLToPath(new URL(value, import.meta.url));

export default defineConfig({
  // Set DOCS_SITE_URL to your production URL to enable canonical URLs and a sitemap.
  ...(process.env.DOCS_SITE_URL ? { site: process.env.DOCS_SITE_URL } : {}),
  output: 'static',
  integrations: [
    react(),
    starlight({
      title: 'the grid',
      description: 'A virtualized React data grid by Nord Forge. Learn about columns, local and server data, editing, and styling.',
      logo: { light: './src/assets/logo.svg', dark: './src/assets/logo-dark.svg', alt: 'the grid', replacesTitle: true },
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/nord-forge/the-grid' }],
      editLink: { baseUrl: 'https://github.com/nord-forge/the-grid/edit/main/docs/' },
      customCss: ['./src/styles/site.css'],
      sidebar: [
        { label: 'Start here', items: ['getting-started', 'examples'] },
        { label: 'Guides', items: [
          'guides/columns', 'guides/rows', 'guides/server-data',
          'guides/sorting-filtering', 'guides/grouping', 'guides/selection',
          'guides/editing', 'guides/styling', 'guides/saved-views',
        ] },
        { label: 'Reference', items: ['reference/grid', 'reference/api'] },
        { label: 'Project', items: ['architecture', 'deployment'] },
      ],
    }),
  ],
  vite: {
    resolve: {
      // Use the current checkout, rather than a separately published npm version.
      alias: [
        { find: '@nord-forge/the-grid/styles.css', replacement: path('../src/styles/grid.css') },
        { find: '@nord-forge/the-grid', replacement: path('../src/index.ts') },
        // Library source sits outside docs/; resolve its peers from the docs install too.
        { find: /^react-dom(?=\/|$)/, replacement: path('./node_modules/react-dom') },
        { find: /^react(?=\/|$)/, replacement: path('./node_modules/react') },
      ],
      dedupe: ['react', 'react-dom'],
    },
  },
});
