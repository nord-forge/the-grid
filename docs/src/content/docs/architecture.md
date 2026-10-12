---
title: Architecture and status
description: How the grid separates data, state, virtualization, React rendering, and styling.
---

The grid is a virtualized React component built in normal document flow. Rows and cells use flex or grid. Headers and pinned sections use `position: sticky`.

## Layers

| Layer | Responsibility |
| --- | --- |
| `contract/` | Public types for data, state, columns, rendering, events, and geometry |
| `models/` and `rows/` | Local and server row models, projections, grouping, tree data, and pinned rows |
| `grid/` | State, selection, ranges, navigation, editing, clipboard, writes, views, and export queries |
| `virtual/` | Height indexing, row and column windows, layout, and scroll mapping |
| `react/` | Component rendering, measurement hooks, filter UI, and API wiring |
| `styles/` | Default theme, public parts, tokens, and state attributes |

Application code addresses rows and cells by identity and reads data, state, and geometry through the API. It does not need to find mounted row elements.

## Package boundaries

React and React DOM are peer dependencies. The library has no additional runtime dependencies. The playground and this Astro documentation site are development applications and do not ship in the npm package.

The library build checks its output for unexpected dependencies, absolute positioning, and invalid styling API usage. Unit and browser checks cover the data models and interaction behavior.

## Current status

The package is an early 0.x release. Supported features include local and server data, sorting, filtering, grouping, tree rows, sticky groups, pinned rows and columns, ranges, clipboard, editing, persisted writes, saved views, and server export queries.

The API may change before 1.0. Pivot and value-related column fields are carried through state and requests but do not have a pivot UI. Content layout remains incomplete, and its declared row limit is not enforced. Server page sizes are configurable independently of fetch block sizes.

## File uploads

There is currently no built-in file upload feature at cell, row, or grid level. Applications can supply an upload control through a custom cell renderer, editor, or detail row, or wrap the grid with their own upload area. Transport, progress, file validation, and upload drop routing belong to that application integration.

Existing drag-and-drop behavior handles row reordering.

## Contribute

See the [repository](https://github.com/nord-forge/the-grid) for the source, issue tracker, and development commands. The grid is MIT licensed.
