---
title: Deploy the docs
description: Run the Astro Starlight documentation site locally and deploy it to Vercel.
---

The docs live in `docs/` as an independent Astro Starlight application. They build into a static site with a client-side React island for the live example. There is no server adapter or required runtime service.

## Local development

Use Node.js 22.12 or later. From the repository root:

```sh
npm ci --prefix docs
npm run docs:dev
```

Open `http://localhost:4321`. To validate and build:

```sh
npm run docs:build
npm run docs:preview
```

`docs:build` runs Astro's type checks before building. Its output is `docs/dist/`, including the Pagefind search index. Search is available in the production build and preview.

## Deploy on Vercel

1. Import [nord-forge/the-grid](https://github.com/nord-forge/the-grid) into Vercel.
2. Keep **Root Directory** at the repository root, rather than `docs`.
3. Choose the **Astro** framework preset if it is not selected automatically.
4. Use Node.js **24.x**, or a supported version at least 22.12.
5. Deploy. The tracked `vercel.json` configures the install, build, and output paths.

| Setting | Value |
| --- | --- |
| Install command | `npm ci --prefix docs` |
| Build command | `npm run build --prefix docs` |
| Output directory | `docs/dist` |
| Root directory | Repository root |

The root directory matters: examples import the current library source from `src/`. Keeping the repository root available lets Vercel build the docs without needing a separately published npm package or installing the library's development tooling.

## Production URL

Optionally set the Vercel environment variable `DOCS_SITE_URL` to your full production URL, such as `https://grid.your-domain.com`. Astro uses it for canonical URLs and Starlight's sitemap integration. Rebuild after changing it.

No environment variables are required for the docs or live example. The example data is generated in the browser.

## Edit content

Write Markdown or MDX in `docs/src/content/docs/`. Navigation is configured in `docs/astro.config.mjs`; styling lives in `docs/src/styles/site.css`.

The site uses the supplied SVG wordmark with light and dark variants and a matching favicon. The logo's wordmark uses the font stack defined in the SVG.

## Deployment references

See [Astro's Vercel deployment guide](https://docs.astro.build/en/guides/deploy/vercel/) and [Starlight's configuration reference](https://starlight.astro.build/reference/configuration/) for platform and framework options.
