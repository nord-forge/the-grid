---
title: Saved views and exports
description: Capture a grid view, restore it, and build an export query for your backend.
---

## Capture and restore

Use `captureViewState` and `applyViewState` for serializable view preferences. A view contains search, sort, filters, column state, column group state, and optional application settings.

```ts
import { applyViewState, captureViewState, type GridViewState } from '@nord-forge/the-grid';

const view = captureViewState(api, { viewSettings: { density: 'compact' } });
localStorage.setItem('people-view', JSON.stringify(view));

const saved = localStorage.getItem('people-view');
if (saved) {
  applyViewState(api, JSON.parse(saved) as GridViewState);
}
```

Run this in browser code after the grid is ready. Validate externally supplied view payloads before applying them. Store `viewSettings` in your application; the helper carries them but does not apply application UI settings.

Applying a view clears missing search and filter state and resets empty column state. Columns introduced after a view was saved are merged into their defined positions. A present sort model is applied in priority order; an empty array clears sorting.

## Save when a view changes

Subscribe to `viewStateChanged` for filters, search, sort, grouping, and column changes that affect a saved view. Resize changes emit this event when the resize finishes.

```ts
const unsubscribe = api.on('viewStateChanged', () => {
  localStorage.setItem('people-view', JSON.stringify(captureViewState(api)));
});

// Call unsubscribe when your owning component unmounts.
```

`isViewStateEqual(a, b)` compares meaningful view preferences while ignoring widths and normalizing empty values. It is useful for marking a view as changed.

## Export queries

`getExportQuery()` builds a payload for a server export. It includes displayed columns in their current order, search, wire-format filters, sort, and external filters. Checkbox selection columns are excluded.

```ts
import { getExportQuery } from '@nord-forge/the-grid';

const response = await fetch('/api/people/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(getExportQuery(api, {
    exclude: (column) => column.colId === 'actions',
    defaultSort: [{ colId: 'name', sort: 'asc' }],
  })),
});
```

Your backend generates the file, resolves headers, and formats values. The helper does not create CSV or spreadsheet files in the browser. This lets an export cover the full server query rather than only loaded blocks.

`additionalFilters` merges application-imposed filters over the grid's filters. Empty query fields are omitted.
