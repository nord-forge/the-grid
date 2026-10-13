import { expect, it, vi } from 'vitest';

import type { GeometryApi, GridApi, FileUploadOptions } from '../contract';
import { GridStore } from '../grid/store';
import { FileUploadController, resolveUploadTarget } from '../grid/uploads';
import { createGridApi } from './gridApi';

it('routes API uploads through the real row and column models, permissions and transport', async () => {
    const rows = [{ id: '1', name: 'Alex' }];
    const store = new GridStore({
        rows,
        getRowId: (row) => row.id,
        columns: [
            { field: 'name', editable: true },
            { colId: 'hidden', hide: true },
        ],
    });
    let api!: GridApi<(typeof rows)[number]>;
    const upload = vi.fn(async ({ row, column, target, api: callbackApi }) => {
        expect(callbackApi).toBe(api);
        expect(row?.data.name).toBe('Alex');
        expect(column?.colId).toBe('name');
        expect(target.level).toBe('cell');
        return { id: 'attachment-1' };
    });
    const options: FileUploadOptions<(typeof rows)[number]> = { upload };
    const uploads = new FileUploadController({
        options: () => options,
        api: () => api,
        resolve: (target) => resolveUploadTarget(store, target),
    });
    const geometry = { ensureCellVisible: vi.fn() } as unknown as GeometryApi;
    api = createGridApi({
        store,
        geometry,
        uploads,
        dataSource: () => ({ type: 'local', rows, getRowId: (row) => row.id }),
        whenSettled: async () => {},
        setQuickFilter: () => {},
        getLaidOutColumn: () => undefined,
    });
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' });
    const tasks = await api.uploadFiles([file], { level: 'cell', rowId: '1', colId: 'name' });
    expect(tasks[0]).toMatchObject({ status: 'uploaded', result: { id: 'attachment-1' } });
    expect(api.getUploads()).toHaveLength(1);
    expect((await api.uploadFiles([file], { level: 'cell', rowId: '1', colId: 'hidden' }))[0]?.status).toBe('rejected');
    expect((await api.uploadFiles([file], { level: 'row', rowId: 'missing' }))[0]?.status).toBe('rejected');
    store.setPinnedRows('top', [{ id: 'pinned', name: 'Pinned' }]);
    expect(resolveUploadTarget(store, { level: 'row', rowId: store.getPinnedRows('top')[0]!.id })).toBeNull();
    options.canUpload = () => false;
    expect((await api.uploadFiles([file], { level: 'cell', rowId: '1', colId: 'name' }))[0]?.status).toBe('rejected');
    expect(upload).toHaveBeenCalledTimes(1);
    api.clearUploads();
    expect(api.getUploads()).toEqual([]);
    api.startEditing({ rowId: '1', colId: 'name' }, { openOnMount: true });
    expect(store.editSession?.openOnMount).toBe(true);
    store.destroy();
    expect(await api.uploadFiles([file], { level: 'grid' })).toEqual([]);
    expect(api.getUploads()).toEqual([]);
});
