---
title: Sorting and filtering
description: Use column filters, quick filtering, server search, and controlled query state.
---

## Sorting

Mark a column `sortable: true`. Clicking the header changes its sort. Shift-click adds another column to the sort order when multi-sort is enabled.

```ts
api.setSortModel([
  { colId: 'team', sort: 'asc' },
  { colId: 'name', sort: 'asc' },
]);
```

The array order sets priority. A custom column `comparator` compares raw values for local sorting. The server receives the sort model unchanged and handles its own ordering.

## Column filters

Set a column's `filter` to a kind such as `'text'`, `'number'`, `'date'`, `'set'`, or `'boolean'`. Use `headerFilterButton="always"` to expose a filter button before a filter is active.

```ts
api.setFilterModel({
  name: { filterType: 'text', type: 'contains', filter: 'alex' },
  budget: { filterType: 'number', type: 'greaterThan', filter: 2000 },
  team: { filterType: 'set', values: ['Design', 'Engineering'] },
});

api.setColumnFilter('team', null); // Clear one column.
api.setFilterModel({}); // Clear every column filter.
```

Set filters include chosen values by default (`anyOf`). Set `type: 'noneOf'` to exclude them. Dates use `YYYY-MM-DD` strings, rather than JavaScript `Date` objects.

The contract also supports coordinates within a radius and application-defined filter kinds. Coordinates do not have a built-in filter editor; provide your own UI when you use them.

## Combined conditions

A column can join simple conditions with `AND` or `OR`. Combined filters support one level; nested combined conditions are dropped.

```ts
api.setColumnFilter('budget', {
  filterType: 'number',
  operator: 'AND',
  conditions: [
    { filterType: 'number', type: 'greaterThanOrEqual', filter: 1000 },
    { filterType: 'number', type: 'lessThan', filter: 5000 },
  ],
});
```

## Quick filter and server search

`setQuickFilter(text)` is local-only and matches formatted values in visible columns. `setSearch(text)` updates query search and is sent as `q` to a server data source. Debounce server search in your application.

`setExternalFilters({ organization: 42 })` sets relationship or scope filters independently of the column filter model.

## Controlled query state

Use `defaultQuery` for initial state. To own the current query in React, supply `query` and `onQueryChange` together.

```tsx
const [query, setQuery] = useState<QueryState>({
  sortModel: [],
  filterModel: {},
  search: '',
  externalFilters: {},
  rowGroupColIds: [],
});

<Grid data={data} columns={columns} query={query} onQueryChange={setQuery} />
```

Import `QueryState` from `@nord-forge/the-grid` and `useState` from React. Use the same controlled pattern for selection, column state, column group state, and ranges.
