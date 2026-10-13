---
title: Grid API and events
description: Access grid state, data, columns, selection, editing, and geometry through a typed API.
---

## Get the API

```tsx
import { useRef } from 'react';
import { Grid, type GridApi } from '@nord-forge/the-grid';

const apiRef = useRef<GridApi<Person> | null>(null);

<Grid<Person>
  data={data}
  columns={columns}
  apiRef={apiRef}
  on={{ ready: () => apiRef.current?.autoSizeColumns() }}
/>
```

Use this inside a React component. The API becomes usable at `ready`. Reads come from grid state, including offscreen data and geometry, rather than DOM elements. Calls after destruction are no-ops returning empty values; check `isDestroyed()` when needed.

This also applies to retained `api.rows` and `api.geometry` handles. After destruction, row counts and geometry sizes are zero, collections are empty, missing cells return `undefined`, and statuses are `idle`. `getDataSource()` returns an empty local source and `whenSettled()` resolves immediately. Delayed callbacks can safely retain the API without restarting edits, uploads, scrolling, or data requests.

## Data and state

| Method | Purpose |
| --- | --- |
| `getState()`, `setState(partial)` | Read or apply grid state |
| `getDataSource()`, `getStatus()` | Data source and load status |
| `getSourceRows()` | Local source rows, or `null` for server data |
| `applyTransaction(transaction)` | Add, update, or remove local rows |
| `patchRows(updates)` | Replace loaded row data by ID |
| `refresh(options)` | Recompute local data or refetch server blocks |
| `refreshCells(options)` | Rerender cells without rerunning the query |
| `setPinnedRows(section, rows)` | Replace a pinned section |
| `setExpanded(rowId, expanded)` | Expand a group, tree, or master row |

`api.rows` exposes `getRow`, `getRowAtIndex`, `getIndexOf`, `getRowCount`, `forEachRow`, and `getPinnedRows`. Iteration visits loaded rows and never fetches as a side effect.

## Columns and queries

| Methods | Purpose |
| --- | --- |
| `getColumns()`, `getColumn(id)`, `getDisplayedColumns()` | Resolved columns and display order |
| `setColumnDefinitions(definitions)` | Replace definitions |
| `getColumnState()`, `applyColumnState(state, options)`, `resetColumnState()` | Column preferences |
| `getColumnGroupState()`, `setColumnGroupState(state)`, `resetColumnGroupState()` | Header group visibility |
| `setColumnsVisible(ids, visible)` | Show or hide columns |
| `setRowGroupColumns(ids)`, `getRowGroupColumns()` | Active row grouping |
| `getSortModel()`, `setSortModel(model)` | Sorting |
| `getFilterModel()`, `setFilterModel(model)`, `setColumnFilter(id, condition)` | Column filters |
| `getSearch()`, `setSearch(text)` | Query search |
| `setExternalFilters(filters)` | Scope and relationship filters |
| `setQuickFilter(text)` | Local quick filter |
| `autoSizeColumns(ids?)`, `showColumnChooser(anchor?)` | Sizing and visibility UI |

## Selection, focus, and writes

| Methods | Purpose |
| --- | --- |
| `getSelection()`, `getSelectedRows()`, `isSelected(id)` | Selected IDs or loaded selected rows |
| `setSelected(ids, selected, options)`, `selectAll()`, `deselectAll()` | Selection changes |
| `getActiveRowId()`, `setActiveRowId(id)` | Active record identity |
| `getFocusedCell()`, `setFocusedCell(cell, options)`, `moveFocus(direction)` | Cell navigation |
| `getRanges()`, `getResolvedRanges()`, `setRanges(ranges)`, `clearRanges()` | Rectangular ranges |
| `getCellValue(cell, options)` | Raw or formatted values |
| `startEditing(cell, options)`, `stopEditing(commit)`, `getEditingCell()` | Editor lifecycle |
| `writeCells(cells)` | Batched writes through persistence and rollback |
| `setCellValue(cell, value)` | Lower-level cell setter and change event |

## Geometry and lifecycle

`api.geometry` answers layout questions without querying grid elements:

- `getRowBounds`, `getRowBoundsAtIndex`, `getCellBounds`, and `getCellAnchor`.
- `getVisibleRange`, `getContentSize`, and `getViewportSize`.
- `getScroll`, `setScroll`, and `scrollBy`.
- `ensureIndexVisible` and `ensureCellVisible`.
- `hitTest`, `edgeProximity`, `getRowIndexAtOffset`, and `resetRowHeights`.

Bounds use grid content coordinates. Cell anchors use client coordinates for popups. `whenSettled()` resolves after pending measurement, scroll anchoring, and rendering finish.

`getPagination()` returns the current page metadata or `null`. `setPage(page)` changes the page. `setOverlay('loading' | 'empty' | null)` overrides the automatic overlay.

## Events

Pass listeners through the `on` prop or subscribe imperatively:

```ts
const unsubscribe = api.on('cellValueChanged', ({ cell, newValue, source }) => {
  console.log(cell.rowId, cell.colId, newValue, source);
});
```

State changes apply before events fire. Listeners see the new state through the API. Return the unsubscribe function from an owning effect or call it on cleanup.

| Event group | Events |
| --- | --- |
| Lifecycle | `ready`, `firstRowsRendered`, `destroyed` |
| Rows and loading | `rowsChanged`, `statusChanged`, `blockLoaded`, `pinnedRowsChanged` |
| Query | `queryChanged`, `sortChanged`, `filterChanged` |
| Columns | `columnStateChanged`, `columnGroupStateChanged`, `displayedColumnsChanged` |
| Viewport | `visibleRangeChanged`, `scroll`, `rowHeightChanged` |
| Selection | `selectionChanged`, `activeRowChanged`, `focusChanged`, `rangesChanged` |
| Pointer | `cellClicked`, `cellDoubleClicked`, `cellContextMenu`, `rowClicked`, `rowDoubleClicked` |
| Editing and clipboard | `editStarted`, `editStopped`, `cellValueChanged`, `pasteStarted`, `pasteEnded`, `writesSettled` |
| View, page, and drag | `viewStateChanged`, `pageChanged`, `rowDragEnded` |

See [GridApi](https://github.com/nord-forge/the-grid/blob/main/src/contract/api.ts), [GeometryApi](https://github.com/nord-forge/the-grid/blob/main/src/contract/geometry.ts), and [GridEventMap](https://github.com/nord-forge/the-grid/blob/main/src/contract/events.ts) for the exact typed signatures.

## File uploads

`uploadFiles(files, target)` validates and uploads to a grid, row, or cell target and resolves with terminal task states. `getUploads()` reads activity; `cancelUpload(id)` aborts a task; `clearUploads()` removes finished tasks. Supply the grid's `uploads` configuration first. See [file uploads](/guides/uploads/) for signatures and transport examples.
