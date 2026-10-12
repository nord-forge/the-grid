---
title: Server data
description: Fetch virtualized blocks from an HTTP API with abort signals, caching, and explicit row counts.
---

A server data source fetches blocks as they become visible. Your backend performs sorting, filtering, search, and grouping using the request it receives.

## Bring your own fetcher

```tsx
import { Grid, type ServerDataSource } from '@nord-forge/the-grid';

const data: ServerDataSource<Person> = {
  type: 'server',
  getRowId: (person) => String(person.id),
  blockSize: 100,
  maxBlocksInCache: 10,
  async getRows(request) {
    const response = await fetch('/api/people/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: request.signal,
      body: JSON.stringify({
        startRow: request.startRow,
        endRow: request.endRow,
        sortModel: request.sortModel,
        filterModel: request.filterModel,
        groupKeys: request.groupKeys,
        rowGroupCols: request.rowGroupCols,
        search: request.q,
        externalFilters: request.externalFilters,
      }),
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const body = await response.json();
    return { rows: body.rows, rowCount: body.total };
  },
};
```

Return the total count for the requested group level, rather than the number of rows in the current block. Use `rowCount: null` while the total is unknown. Pass the abort signal to your fetcher: obsolete queries and evicted blocks are cancelled.

## HTTP GET adapter

`createHttpDataSource` builds the query string for you. Its default response shape is `{ data: TData[], metadata: { found: number } }`.

```tsx
import { createHttpDataSource } from '@nord-forge/the-grid';

const data = createHttpDataSource<Person>({
  url: '/api/people',
  getRowId: (person) => String(person.id),
  blockSize: 100,
  init: { credentials: 'include' },
});
```

The adapter sends `startRow` and `endRow`, plus non-empty `sortModel`, `filterModel`, `groupKeys`, `rowGroupCols`, `q`, and `filter[key]` parameters. Model arrays and objects are JSON encoded. Use `extraParams`, `parseResponse`, or a custom `fetch` to adapt your backend.

## Loading and errors

Unloaded indexes return loading rows. Failed blocks return failed rows. `getStatus()` reports `idle`, `loading`, `ready`, `empty`, or `error`. The default error overlay offers a retry action; use `errorOverlay` to customize it.

Set `loadWithoutQuery: false` to wait for search text, a filter, a group key, or an external filter before requesting rows.

## Pagination and refresh

Server grids scroll continuously through blocks by default. Enable pagination with `pagination={{ pageSize: 100 }}`, or choose another page size. `blockSize` controls fetches independently of the displayed page size. Set `paginateChildren: false` to page top-level rows while keeping expanded children with their parents.

`api.setPage(page)` uses a zero-based page index. `getPagination()` returns the page, page size, known row count, and page count, or `null` when pagination is disabled.

```ts
api.refresh({ purge: false }); // Keep current rows visible while refetching.
api.refresh({ route: ['Design'], purge: true }); // Refresh a particular group level.
```

## Loaded rows and complete queries

Iteration and `getSelectedRows()` only return loaded server rows. Selecting all can represent the entire query without fetching every row. Send the selection or an [export query](/guides/saved-views/#export-queries) to your backend for bulk operations across the full dataset.
