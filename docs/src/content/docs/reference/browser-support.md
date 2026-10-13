---
title: Browser support
description: Browser requirements, compatibility checks, and the opt-in legacy build.
---

The default stylesheet and built-in popup components use modern browser features. The following are the minimum versions implied by those features and the library's explicit JavaScript build target:

| Browser | Required version |
| --- | --- |
| Chrome | 114+ |
| Microsoft Edge | 114+ |
| Firefox | 125+ |
| Safari on macOS | 17+ |
| Safari on iOS/iPadOS | 17+ |

CI checks isolated **current Chromium, Firefox, and WebKit** with Playwright. These checks cover editing, menus, filtering, grouping, selection, uploads, and layout. Historical minimum versions and actual iOS devices are not tested in that suite; this table describes feature requirements rather than certification of every older release. Your application, framework, custom renderers, and bundler can add their own requirements.

## Features that set the requirements

| Feature used by the grid | Chrome/Edge | Firefox | Safari | Purpose |
| --- | --- | --- | --- | --- |
| `:where()` | 88+ | 78+ | 14+ | Zero-specificity theme selectors |
| `@layer` | 99+ | 97+ | 15.4+ | Application styles override the default theme |
| `color-mix()` | 111+ | 113+ | 16.2+ | Accent-based selection and focus colors |
| Popover API | 114+ | 125+ | 17+ | Built-in selects, menus, filters, column chooser, and popup editors |

Versions come from [MDN Browser Compatibility Data](https://github.com/mdn/browser-compat-data). See MDN's references for [`:where()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:where), [`@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer), [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/color-mix), and [`showPopover()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/showPopover). The grid no longer relies on `:has()`; explicit public states handle those styles.

Removing `:where()` alone would increase selector specificity and would not make older browsers work. Browsers without cascade layers ignore the entire default stylesheet. Browsers without popovers cannot place the built-in popup components correctly.

Custom `renderMenu`, `renderPopup`, `renderFilterPanel`, and `renderColumnChooser` components can replace those hosts. Select editors also need a compatible replacement. Those hooks alone do not address the stylesheet and JavaScript requirements.

## Legacy compatibility target (unreleased)

The checkout now has opt-in `@nord-forge/the-grid/legacy` and `@nord-forge/the-grid/legacy/styles.css` entries. They are planned for the next npm release and are not present in the published `0.2.0` package. See the [legacy guide](/guides/legacy-browsers/) for imports, theming, and popup behavior.

| Browser | Compatibility target | Verification |
| --- | --- | --- |
| Chrome / Edge | 88+ | Build target and missing-API tests; historical releases unverified |
| Firefox | 85+ | Build target and missing-API tests; historical releases unverified |
| Safari | 14+ | Build target and missing-API tests; historical releases and real iOS devices unverified |

The legacy stylesheet is generated from the same source, keeps `:where()`, removes layers, and supplies compatible color, focus, spacing, clipping, and logical-property declarations. Shared code replaces newer JavaScript helpers instead of installing global polyfills. The separately compiled JavaScript entry provides fixed portals only for transient popup UI when native popovers are unavailable.

CI tests the actual compiled bundle in current engines with the newer APIs disabled. This verifies fallback behavior but does not emulate historical CSS or engine bugs. Actual historical browser testing remains the next compatibility gate. Internet Explorer is outside this target.
