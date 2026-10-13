import type {
    DataRow,
    FileUploadOptions,
    FileUploadTarget,
    FileUploadTask,
    GridApi,
    ResolvedColumn,
} from '../contract';
import type { GridStore } from './store';

type TargetContext<TData> = { row: DataRow<TData> | null; column: ResolvedColumn<TData> | null };
type Deps<TData> = {
    options: () => FileUploadOptions<TData> | undefined;
    resolve: (target: FileUploadTarget) => TargetContext<TData> | null;
    api: () => GridApi<TData>;
};
type Pending<TData> = {
    id: string;
    options: FileUploadOptions<TData>;
    context: TargetContext<TData>;
    finish: (task: FileUploadTask) => void;
};

export function acceptsFile(file: Pick<File, 'name' | 'type'>, accept: string | undefined): boolean {
    if (!accept?.trim()) return true;
    return accept
        .toLowerCase()
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .some((value) =>
            value.startsWith('.')
                ? file.name.toLowerCase().endsWith(value)
                : value.endsWith('/*')
                  ? file.type.toLowerCase().startsWith(value.slice(0, -1))
                  : file.type.toLowerCase() === value
        );
}

/** Resolve identities through the row/column models; mounted DOM and edit permissions are unrelated. */
export function resolveUploadTarget<TData>(
    store: GridStore<TData>,
    target: FileUploadTarget
): TargetContext<TData> | null {
    if (target.level === 'grid') return { row: null, column: null };
    const row = store.getRow(target.rowId);
    if (!row || row.kind !== 'data' || row.section !== 'body') return null;
    const column = target.level === 'cell' ? store.columns.getResolved(target.colId) : null;
    if (target.level === 'cell' && (!column || !store.snapshot.columns.some((item) => item.colId === target.colId)))
        return null;
    return { row, column: column ?? null };
}

/** Upload lifecycle independent of mounted rows. Returned metadata is never implicitly written into cells. */
export class FileUploadController<TData> {
    #tasks: readonly FileUploadTask[] = [];
    #listeners = new Set<() => void>();
    #pending: Pending<TData>[] = [];
    #running = new Map<string, { abort: AbortController; finish: (task: FileUploadTask) => void }>();
    #next = 0;
    #destroyed = false;
    constructor(private readonly deps: Deps<TData>) {}
    getSnapshot = () => this.#tasks;
    subscribe = (listener: () => void) => {
        this.#listeners.add(listener);
        return () => {
            this.#listeners.delete(listener);
        };
    };
    canUpload(target: FileUploadTarget): boolean {
        const options = this.deps.options();
        if (!options || this.#destroyed || options.targets?.[target.level] === false) return false;
        const context = this.deps.resolve(target);
        return Boolean(context && (options.canUpload?.(target, context) ?? true));
    }
    #notify() {
        for (const listener of this.#listeners) listener();
        this.deps.options()?.onChange?.(this.#tasks);
    }
    #update(id: string, update: Partial<FileUploadTask>): FileUploadTask {
        this.#tasks = this.#tasks.map((task) => (task.id === id ? { ...task, ...update } : task));
        const task = this.#tasks.find((task) => task.id === id)!;
        this.#notify();
        return task;
    }
    upload(files: readonly File[], target: FileUploadTarget): Promise<readonly FileUploadTask[]> {
        if (this.#destroyed) return Promise.resolve([]);
        const options = this.deps.options();
        const context = this.deps.resolve(target);
        const allowed = this.canUpload(target);
        const limit = options?.multiple === false ? 1 : (options?.maxFiles ?? Infinity);
        const promises = files.map((file, index) => {
            let error =
                !allowed || !options || !context
                    ? 'Uploads are not allowed at this target.'
                    : index >= limit
                      ? `Choose no more than ${limit} file(s).`
                      : !acceptsFile(file, options.accept)
                        ? 'This file type is not accepted.'
                        : options.maxFileSize !== undefined && file.size > options.maxFileSize
                          ? `File exceeds the ${options.maxFileSize} byte size limit.`
                          : undefined;
            if (!error) {
                try {
                    error = options?.validate?.(file, target) ?? undefined;
                } catch (cause) {
                    error = cause instanceof Error ? cause.message : 'File validation failed.';
                }
            }
            const task: FileUploadTask = {
                id: `upload-${++this.#next}`,
                file,
                target: { ...target },
                progress: 0,
                status: error ? 'rejected' : 'queued',
                ...(error ? { error } : {}),
            };
            this.#tasks = [...this.#tasks, task];
            if (error) return Promise.resolve(task);
            return new Promise<FileUploadTask>((finish) =>
                this.#pending.push({ id: task.id, options: options!, context: context!, finish })
            );
        });
        this.#notify();
        this.#pump();
        return Promise.all(promises);
    }
    /** A fresh task revalidates the file and current target. Old transport completions cannot touch it. */
    retry(id: string): Promise<FileUploadTask | null> {
        const task = this.#tasks.find((task) => task.id === id);
        if (this.#destroyed || !task || !['failed', 'cancelled', 'rejected'].includes(task.status))
            return Promise.resolve(null);
        const retry = this.upload([task.file], task.target);
        this.#tasks = this.#tasks.filter((task) => task.id !== id);
        this.#notify();
        return retry.then((tasks) => tasks[0] ?? null);
    }
    #pump() {
        while (
            !this.#destroyed &&
            this.#pending.length &&
            this.#running.size < uploadConcurrency(this.#pending[0]!.options.concurrency)
        ) {
            const pending = this.#pending.shift()!;
            const task = this.#tasks.find((task) => task.id === pending.id)!;
            // Permissions and row existence may have changed while queued.
            if (!this.canUpload(task.target)) {
                pending.finish(
                    this.#update(task.id, { status: 'rejected', error: 'Upload target is no longer available.' })
                );
                continue;
            }
            const abort = new AbortController();
            this.#running.set(task.id, { abort, finish: pending.finish });
            this.#update(task.id, { status: 'uploading' });
            const cancelled = new Promise<never>((_, reject) =>
                abort.signal.addEventListener('abort', () => reject(new Error('Upload cancelled.')), { once: true })
            );
            const work = Promise.resolve().then(() => {
                if (abort.signal.aborted) throw new Error('Upload cancelled.');
                return pending.options.upload({
                    ...pending.context,
                    file: task.file,
                    target: task.target,
                    api: this.deps.api(),
                    signal: abort.signal,
                    reportProgress: (percent) => {
                        if (
                            !abort.signal.aborted &&
                            Number.isFinite(percent) &&
                            this.#tasks.find((item) => item.id === task.id)?.status === 'uploading'
                        )
                            this.#update(task.id, {
                                progress: Math.max(
                                    this.#tasks.find((item) => item.id === task.id)!.progress,
                                    Math.min(100, Math.max(0, percent))
                                ),
                            });
                    },
                });
            });
            void Promise.race([work, cancelled])
                .then(
                    (result) => {
                        if (!abort.signal.aborted)
                            pending.finish(this.#update(task.id, { status: 'uploaded', progress: 100, result }));
                    },
                    (cause) => {
                        if (!abort.signal.aborted)
                            pending.finish(
                                this.#update(task.id, {
                                    status: 'failed',
                                    error: cause instanceof Error ? cause.message : 'Upload failed.',
                                })
                            );
                    }
                )
                .finally(() => {
                    this.#running.delete(task.id);
                    this.#pump();
                });
        }
    }
    cancel(id: string): void {
        if (!this.#tasks.some((task) => task.id === id && (task.status === 'queued' || task.status === 'uploading')))
            return;
        const queued = this.#pending.find((item) => item.id === id);
        const running = this.#running.get(id);
        if (!queued && !running) return;
        this.#pending = this.#pending.filter((item) => item.id !== id);
        running?.abort.abort();
        const task = this.#update(id, { status: 'cancelled' });
        (queued ?? running)!.finish(task);
    }
    clear(): void {
        this.#tasks = this.#tasks.filter((task) => task.status === 'queued' || task.status === 'uploading');
        this.#notify();
    }
    destroy(): void {
        this.#destroyed = true;
        for (const task of this.#tasks)
            if (task.status === 'queued' || task.status === 'uploading') this.cancel(task.id);
        this.#listeners.clear();
    }
}

function uploadConcurrency(value = 3): number {
    return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 3;
}
