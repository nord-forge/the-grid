# @nord-forge/the-grid

A virtualized React data grid. Rows and cells are laid out in normal document flow (nothing in this package uses `position: absolute`); pinned columns and headers use `position: sticky`. It has no runtime dependencies besides React.

Status: early release (0.x). Local and server row models, sorting, filtering, grouping and tree rows with sticky group rows, pinned rows and columns, ranges, clipboard, editing with persisted writes, saved views and export queries work. The API may still change before 1.0.

## Install

```sh
npm install @nord-forge/the-grid
```

React 19 is a peer dependency. The package has no runtime dependencies of its own.

Browser requirements for the standard theme and popup components: **Chrome/Edge 114+, Firefox 125+, Safari 17+ (iOS 17+)**. CI exercises current Chromium, Firefox, and WebKit; it does not run those historical minimum versions. See the [browser support table](https://the-grid.nickbevers.dev/reference/browser-support/).

## Legacy browsers (unreleased)

The current checkout includes an opt-in compatibility build targeting **Chrome/Edge 88+, Firefox 85+, Safari 14+**. It is not included in npm version 0.2.0; it will be available in the next package release. Import both the components and the theme from the legacy entry:

```tsx
import { Grid, createSelectCellEditor } from '@nord-forge/the-grid/legacy';
import '@nord-forge/the-grid/legacy/styles.css';
```

The React API stays the same. The generated theme keeps zero specificity, removes cascade layers, and provides older-compatible colors, focus, clipping, and spacing. On browsers without the Popover API, only transient popup UI uses fixed portals; rows, cells, headers, and pinned columns remain in normal flow. Newer browsers still use native popovers.

Use the same entry for all runtime imports in a grid. Import the legacy stylesheet instead of the standard stylesheet, and load application overrides after it. To customize accent tints, set both `--the-grid-accent` and `--the-grid-accent-rgb` (for example `#0f766e` and `15, 118, 110`). Native checkboxes use their operating system colors on older browsers.

The compiled legacy bundle is tested in isolated current engines with the newer APIs disabled. Actual historical browser releases still need validation before this target can be certified. Your application and its dependencies must also be built for the target. See the [legacy guide](https://the-grid.nickbevers.dev/guides/legacy-browsers/).

## Use

```tsx
import { Grid, type ColumnDefinition } from '@nord-forge/the-grid';
import '@nord-forge/the-grid/styles.css';

type Person = { id: number; name: string; team: string };

const columns: ColumnDefinition<Person>[] = [
    { field: 'name', headerName: 'Name', sortable: true },
    { field: 'team', headerName: 'Team', filter: 'set' },
];

export function People({ people }: { people: Person[] }) {
    return (
        <div style={{ height: 480 }}>
            <Grid<Person>
                data={{ type: 'local', rows: people, getRowId: (person) => String(person.id) }}
                columns={columns}
                ariaLabel="People"
            />
        </div>
    );
}
```

## Styling

`@nord-forge/the-grid/styles.css` is a neutral default theme. Every rule sits in the `the-grid` cascade layer with zero specificity, so any rule the application writes outside that layer wins, without `!important`. Theme the grid by overriding `--the-grid-*` tokens on the grid's `className` or an ancestor, and style states through the public parts (`data-grid-part`) and state attributes. `colorScheme` picks light, dark or system colours; `density` picks comfortable or compact spacing. `GRID_PARTS` and `GRID_STATES` export the full list of parts and states at runtime; the tokens are declared at the top of `styles.css`.

```css
.my-grid {
    --the-grid-accent: #0f766e;
    --the-grid-header-background: #f8fafc;
}

.my-grid [data-grid-part='row'][data-selected] [data-grid-part='cell'] {
    font-weight: 600;
}
```

## Editors and uploads

Use `SelectCellEditor`, `NumberCellEditor`, and `CurrencyCellEditor`, or their `create*CellEditor` factories, for reusable typed editors. Select choices open on double-click by default; numeric editors support locale formatting and validation.

Supply `uploads` with your transport callback to enable cell, row, and grid attachments, picker and drop targets, validation, progress, cancellation, and `api.uploadFiles()`. The grid never provides storage or implicitly writes attachment metadata into cells. See the [editing guide](https://the-grid.nickbevers.dev/guides/editing/) and [upload guide](https://the-grid.nickbevers.dev/guides/uploads/).

## Documentation site

Read the [live documentation](https://the-grid.nickbevers.dev/).

The Astro Starlight site lives in `docs/` and includes guides, an API reference, and a live grid example. Use Node.js 22.12 or later:

```sh
npm ci --prefix docs
npm run docs:dev
```

Run `npm run docs:build` to type check and build it, or `npm run docs:preview` to preview the production build with search.

To deploy on Vercel, import **nord-forge/the-grid** with the **repository root** as Root Directory and the **Astro** framework preset. The root `vercel.json` installs only the docs dependencies, builds the site, and serves `docs/dist`. The production URL is `https://the-grid.nickbevers.dev/`; set `DOCS_SITE_URL` to override it for another domain. See [docs/README.md](docs/README.md) for details.

## Library development

| Command | What it does |
| --- | --- |
| `npm run tsc` | Type check the library and the playground |
| `npm test` | Unit tests (Vitest) for `src/` |
| `npm run build` | Build `dist/` (ESM, type declarations and `styles.css`), then guard it: the styling API rules (`check-styles`), no absolute positioning, React peers only |
| `npm run check` | All of the above plus the browser checks |
| `npm run check:ci` | Type checks, serial unit/docs tests, guarded package build, and docs build |
| `npm run release:check` | Verify release metadata and, when set, the exact `RELEASE_TAG` commit |
| `npm run package:check` | Consume the packed archive: verify its runtime exports, TypeScript declarations, and stylesheet |
| `npm run test:legacy` | Test the compiled legacy bundle and its popup fallback in isolated Chromium, Firefox, and WebKit |
| `npm run playground` | Development fixtures; `?fixture=interactive` is the full grid with a theme, colour scheme and density switcher |
| `npm run playground:check` | Browser checks for the playground fixtures (add `-- --browser=firefox` or `webkit`); results go to `playground/results/` |
| `npm run format` | Format with oxfmt |

`npm install` needs `legacy-peer-deps`, which `.npmrc` sets, because of an npm 10 peer resolution bug.

GitHub CI runs the package/docs checks and isolated browser tests. Releases publish through npm trusted publishing after its account-side setup; see [RELEASING.md](RELEASING.md).

## Layout

| Path | Ships | Purpose |
| --- | --- | --- |
| `src/` | yes | The library |
| `playground/` | no | Development fixtures and their browser checks |
| `docs/` | no | Astro Starlight docs and live examples |
| `scripts/` | no | The styling and `dist` guards |

## Rules

- No `position: absolute` in library code or CSS. The standard build also forbids fixed positioning. Only the legacy popup portal may use `position: fixed`; rows, cells, headers, and pinned sections use normal flow and sticky positioning. The build guard enforces the exception's bundle and source module, and browser checks verify computed layout.
- No third-party grid imports, names or copied internals in `src/`.
- Consumer code never needs to query grid DOM: rows, geometry and state come from the api (`src/contract/api.ts`).

## License

MIT. See [LICENSE](LICENSE).
