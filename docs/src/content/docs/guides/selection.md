---
title: Selection, ranges, and clipboard
description: Select rows by ID, address cells by identity, and enable spreadsheet-style ranges and clipboard actions.
---

## Row selection

Choose `rowSelection="single"` or `"multiple"`. Selection defaults to `'none'`. Add a checkbox column for explicit selection controls:

```tsx
const columns: ColumnDefinition<Person>[] = [
  { colId: 'select', width: 44, checkboxSelection: true, headerCheckboxSelection: true },
  { field: 'name', headerName: 'Name' },
];

<Grid data={data} columns={columns} rowSelection="multiple" interaction="row" />
```

`interaction="row"` selects on row clicks. `interaction="cell"` supports focusable cells and ranges. Use `isRowSelectable` for row-specific restrictions and `enableClickSelection={false}` when selection is driven by another control.

## Selection state

Selection can be explicit IDs or all rows matching the query except excluded IDs:

```ts
type RowSelection =
  | { mode: 'ids'; ids: ReadonlySet<string> }
  | { mode: 'all'; excludedIds: ReadonlySet<string> };
```

`selectAll()` can represent unloaded server rows. `getSelectedRows()` returns loaded rows; it does not fetch the entire query. Use `getSelection()` when a bulk action must represent all selected rows on the backend.

```ts
api.setSelected(['person-1', 'person-7'], true, { clearOthers: true });
api.deselectAll();
```

## Cell ranges

Enable `enableRanges` for rectangular selection. Cells use row IDs and column IDs instead of DOM indexes:

```ts
api.setRanges([{
  anchor: { rowId: 'person-1', colId: 'name' },
  end: { rowId: 'person-7', colId: 'team' },
}]);
```

Ranges follow display order. Filtering and hiding shrink the range; removing an anchor row drops it. `getResolvedRanges()` gives the loaded row IDs, column IDs, and unloaded indexes at the current model version.

## Clipboard and fill

Copy uses formatted values as TSV and an HTML table. Paste, clear, and fill write only to editable cells allowed by `clipboard.canWrite`.

- `clipboard.format` customizes a cell's copied text.
- `clipboard.parse` transforms or rejects pasted text.
- `clipboard.serialize` supports application-controlled copying, including remote data.
- `clipboard.paste` provides a custom paste handler.
- `clipboard={false}` disables clipboard handling.
- `enableFill` adds the fill handle; `fillMode="range"` extends a range without writing values.

Use `persist` to save writes from editing, paste, fill, clear, and `writeCells` through the same [write pipeline](/guides/editing/).

## Keyboard interaction

Arrow keys and Tab move cell focus. Shift with an arrow extends a range when ranges are enabled. Enter, F2, double-click, or typing starts an editable cell's editor. Escape cancels an edit. Space toggles the focused row's selection unless `spaceTogglesSelection` is disabled.
