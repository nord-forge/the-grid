---
title: Grouping and tree rows
description: Group local and server rows, show hierarchy, and keep group labels visible while scrolling.
---

## Group by columns

Use `rowGroup: true` on a column, or call `setRowGroupColumns`. `enableRowGroup` allows a column to be offered by grouping UI.

```tsx
const columns: ColumnDefinition<Person>[] = [
  { field: 'team', headerName: 'Team', rowGroup: true, rowGroupIndex: 0 },
  { field: 'name', headerName: 'Name' },
];

<Grid<Person>
  data={{ type: 'local', rows: people, getRowId: (person) => String(person.id), expandedByDefault: true }}
  columns={columns}
  stickyGroupRows
  ariaLabel="People by team"
/>
```

For multiple group columns, `rowGroupIndex` sets their order. The local data source's `expandedByDefault` can be a boolean, a number, or a predicate over group rows.

## Display styles

| `groupDisplay` | Behavior |
| --- | --- |
| `'column'` (default) | Generated group column with indentation, toggles, and child counts |
| `'fullWidthRow'` | Groups occupy a full-width row |
| `'custom'` | Your `isFullWidthRow` and `fullWidthRowRenderer` render group rows |

Customize the generated column through `groupColumn`. A `labelRenderer` replaces only the label; a `renderer` replaces the complete group cell. Use `groupRowRenderer` for full-width group rows.

`stickyGroupRows` keeps open group rows below the header while their children scroll. Nested groups stack, and the next group pushes the current group out.

## Local tree data

Return a path for each row with `getDataPath`:

```tsx
type Folder = { id: string; name: string; path: string[] };

<Grid<Folder>
  data={{
    type: 'local',
    rows: folders,
    getRowId: (folder) => folder.id,
    getDataPath: (folder) => folder.path,
    expandedByDefault: true,
  }}
  columns={[{ field: 'name', headerName: 'Folder' }]}
/>
```

## Server hierarchy

Server grouping requests carry `groupKeys` for the parent route and `rowGroupCols` for the active grouping columns. Group records use `_group`, `_groupKey`, `_groupField`, and `_childCount` metadata.

For server tree data, supply `getTreeKey(data)`: return a child route key for expandable rows, or `null` for leaves. Expanding the row requests that route through `groupKeys`.

## Details

Use `isRowMaster` and `detailRenderer` for expandable detail content. `api.setExpanded(rowId, true)` opens a group, tree row, or master row. Detail rows are measured so their content determines their height.
