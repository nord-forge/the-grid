---
title: Styling and themes
description: Customize the grid using CSS tokens, public parts, density, and interaction states.
---

## Start with the default theme

```tsx
import '@nord-forge/the-grid/styles.css';

<Grid data={data} columns={columns} className="my-grid" colorScheme="system" density="comfortable" />
```

The default theme is neutral. Every rule is inside the `the-grid` cascade layer with zero specificity. Your application's CSS outside that layer takes precedence without `!important`.

## Override tokens

Set tokens directly on the grid's `className`. Grid-level overrides also take precedence over the built-in light and dark token definitions.

```css
.my-grid {
  --the-grid-accent: #0f766e;
  --the-grid-header-background: #f0fdfa;
  --the-grid-header-foreground: #134e4a;
  --the-grid-radius: 8px;
  --the-grid-font-size: 13px;
}

.my-grid[data-color-scheme='dark'] {
  --the-grid-accent: #5eead4;
  --the-grid-header-background: #173c38;
  --the-grid-header-foreground: #ccfbf1;
}
```

| Tokens | Control |
| --- | --- |
| `--the-grid-font-family`, `--the-grid-font-size`, `--the-grid-line-height` | Typography |
| `--the-grid-background`, `--the-grid-foreground`, `--the-grid-muted-foreground` | Base surfaces and text |
| `--the-grid-header-background`, `--the-grid-header-foreground` | Header colors |
| `--the-grid-border-color`, `--the-grid-row-border-color`, `--the-grid-column-border-color` | Lines |
| `--the-grid-accent`, `--the-grid-focus-ring-color` | Interaction accent and focus |
| `--the-grid-selected-row-background`, `--the-grid-range-background` | Selection and ranges |
| `--the-grid-cell-padding-x`, `--the-grid-cell-padding-y` | Cell padding |
| `--the-grid-radius`, `--the-grid-group-indent` | Frame corners and hierarchy spacing |
| `--the-grid-invalid-color`, `--the-grid-invalid-background` | Validation errors |

The complete token list is declared at the top of the [default stylesheet](https://github.com/nord-forge/the-grid/blob/main/src/styles/grid.css).

## Public parts and states

Style public `data-grid-part` values and documented state attributes rather than internal structure or generated class names.

```css
.my-grid [data-grid-part='row'][data-selected] [data-grid-part='cell'] {
  font-weight: 600;
}

.my-grid [data-grid-part='cell'][data-pending] {
  opacity: 0.7;
}

.my-grid [data-grid-part='cell'][data-invalid] {
  text-decoration: underline wavy var(--the-grid-invalid-color);
}
```

`GRID_PARTS` and `GRID_STATES` export the full public lists with descriptions. `GRID_IDENTITY_ATTRIBUTES` lists row and column identity attributes. These attributes describe presentation and identity; read application data and geometry through the API.

Do not style the dimensions of `row-spacer` or `col-spacer`: virtualization owns those dimensions.

## Density and row height

`comfortable` defaults to 32px rows and headers. `compact` defaults to 28px rows and headers with smaller cell padding. Explicit `rowHeight` and `headerHeight` values override the density defaults.

Use the height props for layout changes. Styling row heights alone does not update the virtualization model.

## Light and dark themes

`colorScheme` accepts `'light'` (default), `'dark'`, or `'system'`. System mode follows the operating system. If your app has its own theme switcher, pass its resolved light or dark mode to the grid.

## Replace interface pieces

Use `icons` for sort, filter, menu, and expand glyphs. `icons.select` is passed to custom cell editors through `CellEditorProps.icons` for their select indicator. The `renderMenu`, `renderPopup`, `renderColumnChooser`, and `renderFilterPanel` props let the grid use your application's components. Menus and popup editors can portal into `popupContainer`.
