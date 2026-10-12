---
title: Columns and cells
description: Define column values, sizing, pinned columns, custom renderers, and registries.
---

Define columns with `ColumnDefinition<TData>[]`. A definition can be a leaf column or a header group with nested children.

## Values and identity

`field` reads a property from your data, including dotted paths such as `address.city`. It also supplies the column's ID by default. Set `colId` explicitly for computed columns or when multiple columns use the same field.

```tsx
import type { ColumnDefinition } from '@nord-forge/the-grid';

type Person = { id: string; name: string; salary: number; address: { city: string } };

const columns: ColumnDefinition<Person>[] = [
  { field: 'name', headerName: 'Name', pinned: 'left', width: 200 },
  { field: 'address.city', headerName: 'City', flex: 1, minWidth: 140 },
  {
    field: 'salary',
    headerName: 'Salary',
    sortable: true,
    valueFormatter: ({ value }) => `€${Number(value).toLocaleString('en-GB')}`,
  },
  { colId: 'annual', headerName: 'Annual salary', valueGetter: ({ data }) => data.salary * 12 },
];
```

`valueGetter` computes the raw value. `valueFormatter` turns it into display text. `valueSetter` writes a new value into `data` and returns whether anything changed. A computed column needs a setter to support writes.

## Size, pin, and hide

| Property | Purpose |
| --- | --- |
| `width`, `minWidth`, `maxWidth` | Pixel sizing and bounds |
| `flex` | Share of remaining width |
| `resizable` | Allow dragging the header edge |
| `pinned` | `'left'`, `'right'`, or `null` |
| `hide` | Initial visibility |
| `movable`, `lockPosition` | Column movement and position constraints |
| `lockVisible`, `lockPinned` | Prevent visibility or pinning changes |

Set `defaultColumn` on the grid for shared defaults. Column definitions override those defaults.

```tsx
<Grid data={data} columns={columns} defaultColumn={{ sortable: true, resizable: true, minWidth: 100 }} />
```

## Custom cell renderers

A renderer receives the row data, raw and formatted values, resolved column, grid API, context, and `cellRendererParams`.

```tsx
import type { CellRendererProps } from '@nord-forge/the-grid';

function PersonCell({ data }: CellRendererProps<Person>) {
  return <a data-grid-interactive href={`/people/${data.id}`}>{data.name}</a>;
}

const nameColumn = { field: 'name', headerName: 'Person', cellRenderer: PersonCell };
```

Use `data-grid-interactive` on custom controls so the grid can distinguish interaction with the control from interaction with the row. Keep renderer components stable instead of creating new component functions on every render.

## Header groups

```tsx
const columns: ColumnDefinition<Person>[] = [
  {
    groupId: 'profile',
    headerName: 'Profile',
    children: [
      { field: 'name', headerName: 'Name' },
      { field: 'address.city', headerName: 'City' },
    ],
  },
];
```

Header groups describe the columns. [Row grouping](/guides/grouping/) organizes the data independently.

## Registry keys

Function and component properties can also be string keys resolved through the grid's `registry`. This is useful when column definitions come from a server.

```tsx
<Grid<Person>
  data={data}
  columns={[{ field: 'name', cellRenderer: 'person' }]}
  registry={{ renderers: { person: PersonCell } }}
/>
```

The registry also supports editors, headers, getters, setters, formatters, comparators, filter kinds, and named data types. A column's `dataType` selects a registered set of defaults.
