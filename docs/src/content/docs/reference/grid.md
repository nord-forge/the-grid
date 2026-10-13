---
title: Grid props
description: The main Grid component's data, layout, interaction, state, rendering, and persistence props.
---

`Grid<TData>` is a generic React component. Import `GridProps<TData>` when you need its complete TypeScript contract. This page covers the main props; the [source contract](https://github.com/nord-forge/the-grid/blob/main/src/contract/props.ts) includes every callback and exact signature.

## Data and columns

| Prop | Type / purpose |
| --- | --- |
| `data` | Required `DataSource<TData>`: local rows or a server fetcher |
| `columns` | Required `ColumnDefinition<TData>[]` |
| `defaultColumn` | Shared leaf column defaults |
| `registry` | Named renderers, editors, value functions, filters, and data types |
| `apiRef` | React ref receiving `GridApi<TData> \| null` |
| `context` | Application context passed to renderers and value functions |

## Layout and appearance

| Prop | Type / purpose |
| --- | --- |
| `layout` | `'virtual'` (default), or `'content'` to mount every displayed row and column and grow with content |
| `contentModeRowLimit` | Positive integer; defaults to 1000 displayed body and pinned rows |
| `rowHeight` | Number, `'measure'`, or per-row callback |
| `headerHeight` | Pixel height of each header row |
| `overscan` | `{ rows?: number; columns?: number }` |
| `density` | `'comfortable'` (default) or `'compact'` |
| `colorScheme` | `'light'` (default), `'dark'`, or `'system'` |
| `className` | Class on the grid root |
| `rowClassName`, `rowStyle` | Per-row classes and inline styles |
| `ariaLabel` | Accessible name of the grid |
| `footer` | React content beneath the body |

## Interaction

| Prop | Type / purpose |
| --- | --- |
| `interaction` | `'row'` or `'cell'` (default) |
| `rowSelection` | `'none'` (default), `'single'`, or `'multiple'` |
| `isRowSelectable` | Per-row selection permission |
| `enableClickSelection` | Row-click selection in row interaction mode |
| `enableRanges`, `enableFill` | Enable range selection and fill |
| `fillMode` | `'fill'` or `'range'` |
| `clipboard` | Clipboard hooks or `false` |
| `pasteStrategy` | `'range'` or `'rows'` |
| `rowDrag`, `rowDragLabel` | Row drag controls and label |
| `editOnClick` | Single-click editing |
| `openSelectOnDoubleClick` | Immediately open built-in select choices on double-click (default `true`); native custom selects use browser `showPicker()` support |
| `editorEscape` | `'stop'` or `'propagate'` |
| `enterKey` | `'edit'` or `'moveDown'` |
| `spaceTogglesSelection` | Space-key selection behavior |
| `enableMultiSort`, `multiSort` | Multi-column sorting controls |

## Hierarchy and pinned rows

| Prop | Type / purpose |
| --- | --- |
| `groupDisplay` | `'column'`, `'fullWidthRow'`, or `'custom'` |
| `groupColumn` | Generated group column configuration |
| `groupRowRenderer` | Custom full-width group row |
| `stickyGroupRows` | Keep expanded groups under the header |
| `isFullWidthRow`, `fullWidthRowRenderer` | Custom full-width rows |
| `isRowMaster`, `detailRenderer` | Expandable detail rows |
| `pinnedRows` | `{ top?: readonly TData[]; bottom?: readonly TData[] }` |
| `pinnedBottomMaxHeight` | Scroll cap for the bottom pinned section |
| `pagination` | `{ pageSize: number; paginateChildren?: boolean }` or `false`; server pagination is disabled by default |

## Controlled state

Use `default*` for initial values. Supply a state prop and its corresponding change handler when your application owns that state.

| Area | Initial | Controlled | Callback |
| --- | --- | --- | --- |
| Query | `defaultQuery` | `query` | `onQueryChange` |
| Selection | `defaultSelection` | `selection` | `onSelectionChange` |
| Columns | `defaultColumnState` | `columnState` | `onColumnStateChange` |
| Header groups | `defaultColumnGroupState` | `columnGroupState` | `onColumnGroupStateChange` |
| Ranges | — | `ranges` | `onRangesChange` |
| Active row | — | `activeRowId` | `onActiveRowChange` |

## Writes, menus, and overlays

| Prop | Purpose |
| --- | --- |
| `persist` | Persist optimistic write batches |
| `uploads` | File uploads at grid, row, and cell level; application transport and validation |
| `rangeEdit`, `propagateWrite` | Derive range and sibling writes |
| `headerMenuButton`, `headerFilterButton` | Header controls |
| `getContextMenuItems`, `getHeaderMenuItems` | Menu items |
| `renderMenu`, `renderPopup` | Replace menu and editor popup hosts |
| `renderColumnChooser`, `renderFilterPanel`, `filterEditors` | Column and filter UI |
| `icons` | Replace built-in glyphs |
| `popupContainer` | Element into which popups portal |
| `loadingOverlay`, `emptyOverlay`, `errorOverlay` | Custom load-state content |
| `on` | Typed event listener map |
