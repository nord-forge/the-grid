---
title: Legacy browsers
description: Use the opt-in compatibility bundle and theme for the 2021 browser target.
---

**Availability: unreleased.** This entry exists in the current checkout and is planned for the next npm release. The published `0.2.0` package does not include it.

The compatibility target is **Chrome/Edge 88+, Firefox 85+, Safari 14+**. The grid API and React 19.2 peer requirements are the same as the standard build. Historical versions are not yet certified: CI tests the compiled legacy bundle in current Chromium, Firefox, and WebKit with popovers and newer JavaScript methods disabled.

## Choose the legacy entry

```tsx
import { Grid, createSelectCellEditor, type ColumnDefinition } from '@nord-forge/the-grid/legacy';
import '@nord-forge/the-grid/legacy/styles.css';

const columns: ColumnDefinition<Person>[] = [
  { field: 'name', editable: true },
  { field: 'team', editable: true, cellEditor: createSelectCellEditor({ values: ['Engineering', 'Design'] }) },
];
```

Use the same runtime entry for the grid, editors, and factories. The two bundles have their own internal React contexts; mixing their runtime components would bypass the legacy popup host. The contracts and TypeScript API are shared.

Import the legacy stylesheet **instead of** `styles.css`. It is generated from the same theme, keeps `:where()` and zero specificity, and is not wrapped in a cascade layer. Load application overrides after it, particularly when they also have zero specificity.

Your app's bundler and dependencies must target these browsers too. The legacy library cannot transpile your app, React, or third-party code. It adds no global polyfills or runtime dependencies.

## Styles and colors

The generated theme replaces color mixing, flex gaps, logical shorthands, focus selectors, and overflow clipping with compatible declarations. Public states (`data-selection-header`, `data-full-width`, and `data-resize-hover`) replace relational selectors in both builds.

Set the accent and its RGB channels together when customizing the legacy theme:

```css
.my-grid {
  --the-grid-accent: #0f766e;
  --the-grid-accent-rgb: 15, 118, 110;
}
```

The RGB channels supply the semi-transparent selection, range, and focus tints. They default to the neutral theme's accent. Native checkboxes use operating system colors where `accent-color` is unavailable. The fallback focus selector shows an indicator on pointer focus as well as keyboard focus.

## Popup fallback

Browsers with native popovers keep the standard top-layer popup behavior. Without that API, built-in selects, menus, filters, column choosers, and popup editors use body portals with fixed viewport coordinates. Rows, cells, pinned columns, and headers retain their normal-flow layout.

Portals are clamped to the viewport, can flip above the anchor, follow page scrolling and resize, and close through the usual keyboard and outside-click paths. The grid's class names and computed theme tokens are copied to the portal and updated when the owner's theme attributes change. Ancestor-dependent selectors do not automatically follow a body portal; use the grid class and public parts or theme tokens when styling popups.

The grid root for a portal has `data-popup-portal`, and a popup reports `data-popup-mode="portal"` or `"native"`. Custom `renderMenu`, `renderPopup`, `renderFilterPanel`, and `renderColumnChooser` implementations remain responsible for their own browser compatibility. These hooks are not replaced by the legacy host.

## Verification

Run `npm run build`, then `npm run test:legacy`. The checks consume the compiled bundle and generated CSS, disable unsupported APIs, and exercise editing, keyboard navigation, selection, menus, filters, theme changes, clipping, resize, scrolling, and cleanup. Package checks verify both public JavaScript entries and their declarations.

The development fixture is `/legacy.html` in the playground after a library build. Actual Chrome 88, Firefox 85, and Safari 14 runs, including real iOS devices where relevant, remain the next compatibility gate. These tests are fallback checks, not an emulation of those browser engines.
