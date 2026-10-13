import { expect, it, vi } from 'vitest';

import type { GeometryApi } from '../contract';
import { GridStore } from '../grid/store';
import { createGridApi } from './gridApi';

it('makes every API mutation inert and returns empty reads after destruction', async () => {
    const rows = [{ id: '1', name: 'Alex' }];
    const store = new GridStore({
        rows,
        getRowId: (row) => row.id,
        columns: [{ field: 'name', editable: true }],
        interaction: 'cell',
    });
    const ensureCellVisible = vi.fn();
    const setQuickFilter = vi.fn();
    const autoSizeColumns = vi.fn();
    const showColumnChooser = vi.fn();
    const whenSettled = vi.fn(async () => {});
    const geometry = {
        ensureCellVisible,
        setScroll: vi.fn(),
        scrollBy: vi.fn(),
        resetRowHeights: vi.fn(),
        ensureIndexVisible: vi.fn(),
        getCellBounds: vi.fn(),
    } as unknown as GeometryApi;
    const api = createGridApi({
        store,
        geometry,
        dataSource: () => ({ type: 'local', rows }),
        whenSettled,
        setQuickFilter,
        autoSizeColumns,
        showColumnChooser,
        getLaidOutColumn: () => undefined,
    });
    const cell = { rowId: '1', colId: 'name' };
    api.setSearch('Alex');
    expect(api.getSearch()).toBe('Alex');
    store.destroy();
    const state = {
        query: store.query,
        columns: store.columns.getColumnState(),
        selection: store.selection,
        ranges: store.ranges,
        focus: store.focusedCell,
    };
    api.applyTransaction({ add: { rows: [{ id: '2', name: 'Sam' }] } });
    api.patchRows([{ id: '1', data: { id: '1', name: 'Changed' } }]);
    api.refresh({ purge: true });
    api.setPinnedRows('top', [{ id: '3', name: 'Pinned' }]);
    api.refreshCells();
    api.setExpanded('1', true);
    api.setColumnDefinitions([{ field: 'id' }]);
    api.applyColumnState([{ colId: 'name', hide: true }]);
    api.resetColumnState();
    api.setColumnGroupState([]);
    api.resetColumnGroupState();
    api.setColumnsVisible(['name'], false);
    api.setRowGroupColumns(['name']);
    api.setSortModel([{ colId: 'name', sort: 'desc' }]);
    api.setFilterModel({ name: { filterType: 'text', type: 'equals', filter: 'other' } });
    api.setColumnFilter('name', null);
    api.setSearch('other');
    api.setExternalFilters({ id: 'other' });
    api.setQuickFilter('other');
    api.setSelected(['1'], true);
    api.selectAll();
    api.deselectAll();
    api.setActiveRowId('1');
    api.setFocusedCell(cell);
    expect(api.moveFocus('next')).toBeNull();
    api.setRanges([{ anchor: cell, end: cell }]);
    api.clearRanges();
    api.startEditing(cell);
    api.stopEditing(true);
    api.setPage(1);
    api.setOverlay('loading');
    api.autoSizeColumns();
    api.showColumnChooser();
    api.setState({ focusedCell: cell });
    expect(api.setCellValue(cell, 'Changed')).toBe(false);
    expect(await api.writeCells([{ cell, value: 'Changed' }])).toEqual({ written: 0, rejected: 0 });
    expect(await api.retryUpload('upload-1')).toBeNull();
    await api.whenSettled();
    expect(store.rowModel.getRowCount()).toBe(1);
    expect(store.getRow('1')).toMatchObject({ data: { name: 'Alex' } });
    expect(store.getPinnedRows('top')).toEqual([]);
    expect({
        query: store.query,
        columns: store.columns.getColumnState(),
        selection: store.selection,
        ranges: store.ranges,
        focus: store.focusedCell,
    }).toEqual(state);
    for (const callback of [ensureCellVisible, setQuickFilter, autoSizeColumns, showColumnChooser, whenSettled])
        expect(callback).not.toHaveBeenCalled();
    expect(api.isDestroyed()).toBe(true);
    expect(api.getState()).toMatchObject({ columnState: [], focusedCell: null, query: { search: '' }, ranges: [] });
    expect(api.getSelection()).toEqual({ mode: 'ids', ids: new Set() });
    expect(api.getSourceRows()).toEqual([]);
    expect(api.getColumns()).toEqual([]);
    expect(api.getDisplayedColumns()).toEqual([]);
    expect(api.getColumn('name')).toBeUndefined();
    expect(api.getCellValue(cell)).toBeUndefined();
    expect(api.getSearch()).toBe('');
    expect(api.getStatus()).toEqual({ state: 'idle' });
    expect(api.getDataSource()).toEqual({ type: 'local', rows: [] });
    expect(api.getPagination()).toBeNull();
    expect(api.getEditingCell()).toBeNull();
    const listener = vi.fn();
    const unsubscribe = api.on('ready', listener);
    expect(unsubscribe).toBeTypeOf('function');
    unsubscribe();
    expect(listener).not.toHaveBeenCalled();
});

it('guards row and geometry handles retained before destruction', () => {
    const store = new GridStore({ rows: [{ id: '1' }], getRowId: (row) => row.id, columns: [{ field: 'id' }] });
    const geometry = {
        getCellBounds: vi.fn(() => ({ top: 0, left: 0, width: 100, height: 32 })),
        ensureCellVisible: vi.fn(),
        setScroll: vi.fn(),
        scrollBy: vi.fn(),
        resetRowHeights: vi.fn(),
    } as unknown as GeometryApi;
    const api = createGridApi({
        store,
        geometry,
        dataSource: () => ({ type: 'local', rows: [] }),
        whenSettled: async () => {},
        setQuickFilter: () => {},
        getLaidOutColumn: () => undefined,
    });
    const rowHandle = api.rows,
        geometryHandle = api.geometry;
    const cell = { rowId: '1', colId: 'id' };
    expect(geometryHandle.getCellBounds(cell)).toMatchObject({ width: 100 });
    expect(rowHandle.getRowCount()).toBe(1);
    store.destroy();
    geometryHandle.ensureCellVisible(cell);
    geometryHandle.setScroll({ top: 10 });
    geometryHandle.scrollBy({ top: 10 });
    geometryHandle.resetRowHeights();
    expect(geometryHandle.getCellBounds(cell)).toBeUndefined();
    expect(geometry.ensureCellVisible).not.toHaveBeenCalled();
    expect(geometry.setScroll).not.toHaveBeenCalled();
    expect(geometry.scrollBy).not.toHaveBeenCalled();
    expect(geometry.resetRowHeights).not.toHaveBeenCalled();
    expect(geometry.getCellBounds).toHaveBeenCalledTimes(1);
    expect(rowHandle.getRowCount()).toBe(0);
    expect(rowHandle.version).toBe(0);
    expect(rowHandle.status).toEqual({ state: 'idle' });
    expect(rowHandle.getRow('1')).toBeUndefined();
    expect(rowHandle.getRowAtIndex(0)).toBeUndefined();
    expect(rowHandle.getIndexOf('1')).toBeUndefined();
    expect(rowHandle.getPinnedRows('top')).toEqual([]);
    const visit = vi.fn();
    rowHandle.forEachRow(visit);
    expect(visit).not.toHaveBeenCalled();
});
