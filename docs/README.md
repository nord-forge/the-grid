# The grid documentation

An Astro Starlight site with a live React example, guides, and public API reference. It imports the library directly from this checkout. The docs have their own package manifest and lockfile and are excluded from the published library package.

## Run locally

Use Node.js 22.12 or later. From the repository root:

```sh
npm ci --prefix docs
npm run docs:dev
```

The development server listens on http://localhost:4321. `npm run docs:check` runs Astro type checks. `npm run docs:build` checks and builds into `docs/dist`. `npm run docs:preview` serves that build, including Pagefind search.

## Deploy on Vercel

Import `nord-forge/the-grid`, keep the Root Directory at the repository root, select Astro, and use Node 24.x (or a supported version at least 22.12). The root `vercel.json` sets:

- Install: `npm ci --prefix docs`
- Build: `npm run build --prefix docs`
- Output: `docs/dist`

The repository root must remain available because the live example imports `../src/`. There is no need to install root dependencies or publish the library first. No Vercel adapter is needed for this static site.

Optionally set `DOCS_SITE_URL` to the full production URL for canonical links and sitemap generation. No environment variables or external APIs are required by the example.

## Maintain

- Pages: `src/content/docs/` (Markdown and MDX)
- Navigation and framework setup: `astro.config.mjs`
- Theme: `src/styles/site.css`
- Logo: `src/assets/logo.svg` and `src/assets/logo-dark.svg`
- Favicon: `public/favicon.svg`
- Interactive grid: `src/components/GridDemo.tsx`
- Type-checked quickstart: `src/examples/People.tsx`

The Vite aliases resolve the current library source and its React peers using the docs installation. The React integration pins its compatible Vite plugin version, and the selector-parser override uses the patched release in the build toolchain.

Documentation follows the 0.x source API and makes its current limits explicit. GitHub and edit links point to `nord-forge/the-grid`.
