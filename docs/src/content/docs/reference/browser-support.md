---
title: Browser support
description: Browser requirements, compatibility checks, and the proposed legacy build.
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
| `:has()` | 105+ | 121+ | 15.4+ | Checkbox header alignment and full-width row styling |
| `color-mix()` | 111+ | 113+ | 16.2+ | Accent-based selection and focus colors |
| Popover API | 114+ | 125+ | 17+ | Built-in selects, menus, filters, column chooser, and popup editors |

Versions come from [MDN Browser Compatibility Data](https://github.com/mdn/browser-compat-data). See MDN's references for [`:where()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:where), [`@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer), [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:has), [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/color-mix), and [`showPopover()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/showPopover).

Removing `:where()` alone would increase selector specificity and would not make older browsers work. Browsers without cascade layers ignore the entire default stylesheet. Browsers without popovers cannot place the built-in popup components correctly.

Custom `renderMenu`, `renderPopup`, `renderFilterPanel`, and `renderColumnChooser` components can replace those hosts. Select editors also need a compatible replacement. Those hooks alone do not address the stylesheet and JavaScript requirements.

## Proposed legacy target

The requested target is **Chrome/Edge 88+, Firefox 85+, Safari 14+**. A legacy build is feasible without replacing the grid's row models, API, or virtualization. It is **not shipped or supported yet**; do not import an assumed `/legacy` entry point.

The work is concentrated in the theme, popup hosts, and build:

- Generate a separate stylesheet without cascade layers. Keep `:where()` because all three target browsers support it. Replace `:has()` with explicit state attributes and give accent colors stable fallbacks.
- Add compatible overflow, focus, form-control, and spacing styles. Safari 14.0 lacks flexbox `gap`; its layout needs spacing fallbacks too.
- Replace newer helpers such as `Array.at()`, `Array.findLast()`, and `Object.hasOwn()`, and compile JavaScript for the older target. Syntax transpilation alone does not polyfill these methods.
- Provide a tested popup host for browsers without the Popover API. Positioning and clipping need attention: the standard package intentionally avoids absolute/fixed positioning, while native popovers provide the browser's top layer.
- Exercise the actual historical browsers before claiming support. Current Playwright engines with missing APIs disabled can check fallback behavior, but cannot reproduce all older CSS and layout behavior.

An opt-in export in the same package would keep the same React components and TypeScript API while letting modern applications retain the layered theme and native popovers. Internet Explorer is outside this proposed target.
