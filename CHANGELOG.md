# Changelog

## 0.3.0 - 2026-10-13

- Add opt-in beta legacy JavaScript and CSS entries targeting Chrome/Edge 88+, Firefox 85+, and Safari 14+, with generated CSS fallbacks and fixed portals only for transient UI on browsers without native popovers. Testing is still underway; historical browser support is not yet verified.
- Replace relational CSS selectors with public state attributes and newer JavaScript helpers with compatible equivalents.
- Verify legacy exports and declarations in the packed consumer and run isolated browser fallback checks in CI. Historical browser versions remain unverified.

## 0.2.0 - 2026-10-13

- Document browser feature requirements and the proposed 2021 browser target; pin the standard JavaScript build target.
- Complete content layout with all rows and columns mounted, measured heights, page focus scrolling, server count discovery, and an enforced displayed/pinned row limit.
- Add upload retries with fresh attempt IDs and revalidation, plus a controlled attachment list with previews, downloads, and asynchronous removal.
- Normalize invalid upload concurrency values so queued uploads cannot get stuck.
- Add GitHub CI and npm trusted-publishing workflows, with version/tag/lockfile/changelog verification before publication.
- Fix published declaration imports for NodeNext consumers and verify the packed archive's runtime exports, types, and stylesheet in CI.

- Preserve unchanged numeric values across locales and accept scientific notation and pasted negative currency amounts.
- Make retained API, row, and geometry handles safe after grid destruction.
- Replace named editor placeholders with working text, multiline, select, number, currency, checkbox, and date editors; preserve application overrides.
- Keep select dropdowns inside the viewport and preserve typeahead when typing starts an edit.
- Replace the docs' native theme select with a styled, keyboard-accessible menu that preserves saved and system theme preferences.

- Center header and row selection checkboxes and expose full default cell, column, and group labels through native hover titles.

- Reusable select, number, and currency editors with locale parsing, validation, icon customization, and keyboard navigation.
- Built-in select choices open on double-click across browsers without requiring native picker support.
- Cell, row, and grid uploads with application transport, validation, progress, cancellation, permissions, and picker/drop/API entry points.

## 0.1.0

First public release.

- Virtualized rows and columns in normal document flow, with sticky headers, pinned columns and pinned rows.
- Local and server row models, with server rows loaded in blocks.
- Sorting, filtering through pluggable filter kinds, quick search and saved views.
- Row grouping in a group column or as full-width rows, tree data, master/detail rows, and sticky group rows.
- Cell ranges, keyboard navigation, clipboard copy and paste, fill handle.
- Editing with validation, popup editors and persisted writes with optimistic updates and rollback.
- A geometry API for hit testing, anchors and scrolling, so applications never query grid DOM.
- A neutral default theme in its own cascade layer, themed through `--the-grid-*` tokens and public parts.
