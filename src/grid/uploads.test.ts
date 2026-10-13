import { describe, expect, it, vi } from 'vitest';

import type { DataRow, FileUploadOptions, FileUploadTarget, GridApi } from '../contract';
import { FileUploadController, acceptsFile } from './uploads';
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const file = (name = 'note.txt', type = 'text/plain', content = 'abc') => new File([content], name, { type });
function setup(overrides: Partial<FileUploadOptions<any>> = {}) {
    const options: FileUploadOptions<any> = { upload: async ({ file }) => ({ name: file.name }), ...overrides };
    const controller = new FileUploadController({
        options: () => options,
        resolve: (target) =>
            target.level === 'grid'
                ? { row: null, column: null }
                : target.rowId === '1' && (target.level !== 'cell' || target.colId === 'name')
                  ? { row: { id: '1', kind: 'data', data: {} } as DataRow<any>, column: null }
                  : null,
        api: () => ({}) as GridApi<any>,
    });
    return { controller, options };
}
describe('file uploads', () => {
    it.each<FileUploadTarget>([
        { level: 'grid' },
        { level: 'row', rowId: '1' },
        { level: 'cell', rowId: '1', colId: 'name' },
    ])('uploads at $level with metadata', async (target) => {
        const { controller } = setup();
        const [task] = await controller.upload([file()], target);
        expect(task).toMatchObject({ target, status: 'uploaded', progress: 100, result: { name: 'note.txt' } });
        controller.cancel(task!.id);
        expect(controller.getSnapshot()[0]?.status).toBe('uploaded');
    });
    it('validates MIME types, extensions, size and batch limits before transport', async () => {
        const upload = vi.fn(async () => null);
        const { controller } = setup({ upload, accept: '.TXT,image/*', maxFileSize: 4, maxFiles: 2 });
        const tasks = await controller.upload(
            [file('photo.png', 'image/png'), file('note.txt', '', '12345'), file('other.txt')],
            { level: 'grid' }
        );
        expect(tasks.map((task) => task.status)).toEqual(['uploaded', 'rejected', 'rejected']);
        expect(upload).toHaveBeenCalledTimes(1);
        expect(acceptsFile(file('NOTE.TXT', ''), '.txt')).toBe(true);
        expect(acceptsFile(file('x.exe', 'application/octet-stream'), 'image/*')).toBe(false);
    });
    it('denies disabled targets, missing rows, missing cells and permissions for API uploads too', async () => {
        const upload = vi.fn(async () => null);
        const { controller } = setup({
            upload,
            targets: { grid: false },
            canUpload: (target) => target.level !== 'row',
        });
        for (const target of [
            { level: 'grid' },
            { level: 'row', rowId: '1' },
            { level: 'cell', rowId: '9', colId: 'name' },
            { level: 'cell', rowId: '1', colId: 'bad' },
        ] as FileUploadTarget[])
            expect((await controller.upload([file()], target))[0]?.status).toBe('rejected');
        expect(upload).not.toHaveBeenCalled();
    });
    it('reports custom rejection and transport errors', async () => {
        const { controller } = setup({
            validate: (f) => (f.name === 'bad.txt' ? 'Blocked' : undefined),
            upload: async () => {
                throw new Error('Offline');
            },
        });
        const tasks = await controller.upload([file('bad.txt'), file()], { level: 'grid' });
        expect(tasks.map((task) => [task.status, task.error])).toEqual([
            ['rejected', 'Blocked'],
            ['failed', 'Offline'],
        ]);
    });
    it('limits concurrency, clamps progress, cancels queued and running work and ignores late completion', async () => {
        const completions: (() => void)[] = [];
        const signals: AbortSignal[] = [];
        const { controller } = setup({
            concurrency: 1,
            upload: ({ signal, reportProgress }) => {
                signals.push(signal);
                reportProgress(50);
                reportProgress(10);
                reportProgress(NaN);
                return new Promise((resolve) => completions.push(() => resolve('late')));
            },
        });
        const done = controller.upload([file('first.txt'), file('second.txt'), file('third.txt')], { level: 'grid' });
        await tick();
        expect(controller.getSnapshot().map((task) => task.status)).toEqual(['uploading', 'queued', 'queued']);
        expect(controller.getSnapshot()[0]?.progress).toBe(50);
        controller.cancel(controller.getSnapshot()[1]!.id);
        controller.cancel(controller.getSnapshot()[0]!.id);
        await tick();
        expect(signals[0]?.aborted).toBe(true);
        expect(completions).toHaveLength(2);
        completions[0]!();
        completions[1]!();
        const tasks = await done;
        expect(tasks.map((task) => task.status)).toEqual(['cancelled', 'cancelled', 'uploaded']);
        controller.clear();
        expect(controller.getSnapshot()).toEqual([]);
    });
    it('rechecks permission for queued tasks and cancels everything on destruction', async () => {
        let allowed = true;
        let finish!: () => void;
        const { controller } = setup({
            concurrency: 1,
            canUpload: () => allowed,
            upload: () =>
                new Promise((resolve) => {
                    finish = () => resolve(null);
                }),
        });
        const done = controller.upload([file(), file()], { level: 'grid' });
        await tick();
        allowed = false;
        finish();
        expect((await done).map((task) => task.status)).toEqual(['uploaded', 'rejected']);
        allowed = true;
        const pending = controller.upload([file()], { level: 'grid' });
        await tick();
        controller.destroy();
        expect((await pending)[0]?.status).toBe('cancelled');
        expect(controller.canUpload({ level: 'grid' })).toBe(false);
    });
});
