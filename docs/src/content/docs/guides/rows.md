---
title: Local rows and layout
description: Use stable row identities, transactions, pinned rows, and variable row heights.
---

## Local data

A local data source holds your complete dataset in memory. Sorting, filtering, grouping, and quick filtering run in the browser.

```tsx
<Grid<Person>
  data={{ type: 'local', rows: people, getRowId: (person) => String(person.id) }}
  columns={columns}
  ariaLabel="People"
/>
```

Keep row IDs stable across refreshes and edits. Focus, selection, ranges, and transactions address rows by ID. Changing the order must not change an ID.

## Transactions

Use the API to add, update, or remove rows without replacing the complete collection. Transactions are supported by local row models.

```ts
api.applyTransaction({
  add: { rows: [{ id: 42, name: 'Alex', team: 'Design' }], index: 0 },
  update: [{ id: 7, name: 'Sam', team: 'Engineering' }],
  remove: ['12'],
});
```

`patchRows([{ id, data }])` replaces loaded data by ID. `refresh()` recomputes the local projection. `refreshCells()` rerenders cells after in-place changes without sorting or filtering again.

## Virtual layout

The default `virtual` layout mounts rows and columns near a bounded viewport. Set a height on the parent so it can scroll and measure the visible window.

:::caution[Content layout is incomplete]
The public API declares `layout="content"` and `contentModeRowLimit`. Currently, content layout removes the root's fixed height but still uses the virtualizers, and the row limit is not enforced. Use the default virtual layout for production grids.
:::

## Row heights

Use a number for a fixed row height, `'measure'` to size rows to their content, or a callback for a per-row choice.

```tsx
<Grid data={data} columns={columns} rowHeight="measure" />
```

A column with `autoHeight: true` stays mounted during horizontal scrolling so its content can keep determining the row height. Call `api.geometry.resetRowHeights()` when changes outside the grid require fresh measurements.

## Pinned rows

Pinned rows sit above or below the scrolling body. They are separate from displayed body indexes.

```tsx
<Grid<Person>
  data={data}
  columns={columns}
  pinnedRows={{ bottom: summaryRows }}
  pinnedBottomMaxHeight={160}
/>
```

Use distinct stable IDs for summary rows. `pinnedBottomMaxHeight` lets a large bottom section scroll independently. You can replace a pinned section with `api.setPinnedRows('bottom', rows)`.

## Row dragging

Set `rowDrag` to show drag handles. The grid emits `rowDragEnded`; your application updates the collection. The exported `moveRows` helper can apply the event's row IDs and target index to your array. The grid does not automatically reorder your source data.
