import type { GridApi } from './api';
import type { ResolvedColumn } from './columns';
import type { DataRow, RowId } from './rows';

export type FileUploadTarget =
    | { level: 'grid' }
    | { level: 'row'; rowId: RowId }
    | { level: 'cell'; rowId: RowId; colId: string };
export type FileUploadStatus = 'queued' | 'uploading' | 'uploaded' | 'rejected' | 'failed' | 'cancelled';
export type FileUploadTask = {
    id: string;
    file: File;
    target: FileUploadTarget;
    status: FileUploadStatus;
    /** Percentage between 0 and 100. */
    progress: number;
    error?: string;
    result?: unknown;
};
export type FileUploadContext<TData> = {
    file: File;
    target: FileUploadTarget;
    /** Row and column at the time the upload was accepted. */
    row: DataRow<TData> | null;
    column: ResolvedColumn<TData> | null;
    api: GridApi<TData>;
    signal: AbortSignal;
    reportProgress: (percent: number) => void;
};
export type FileUploadOptions<TData> = {
    /** Enabled levels. Default: grid, row and cell. Drop routing picks the nearest enabled target. */
    targets?: { grid?: boolean; row?: boolean; cell?: boolean };
    /** Same comma-separated MIME types, wildcards and extensions as an HTML file input. */
    accept?: string;
    maxFileSize?: number;
    /** Maximum files in one picker/drop/API batch. */
    maxFiles?: number;
    multiple?: boolean;
    /** Simultaneous uploads. Default 3. */
    concurrency?: number;
    /** Additional target permission, applied equally to drops, picker and API calls. */
    canUpload?: (
        target: FileUploadTarget,
        context: { row: DataRow<TData> | null; column: ResolvedColumn<TData> | null }
    ) => boolean;
    validate?: (file: File, target: FileUploadTarget) => string | null | undefined;
    /** Application-owned transport. Resolve with attachment metadata; reject to show an error. Honor signal for cancellation. */
    upload: (context: FileUploadContext<TData>) => Promise<unknown>;
    onChange?: (tasks: readonly FileUploadTask[]) => void;
};
