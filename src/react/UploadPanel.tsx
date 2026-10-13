import { useRef, useState } from 'react';

import type { CellPosition, FileUploadOptions, FileUploadTarget, FileUploadTask } from '../contract';
import type { FileUploadController } from '../grid/uploads';

export function UploadPanel<TData>({
    controller,
    options,
    focused,
    tasks,
}: {
    controller: FileUploadController<TData>;
    options: FileUploadOptions<TData>;
    focused: CellPosition | null;
    tasks: readonly FileUploadTask[];
}) {
    const input = useRef<HTMLInputElement>(null);
    const [level, setLevel] = useState<FileUploadTarget['level']>('grid');
    const target: FileUploadTarget | null =
        level === 'grid'
            ? { level }
            : !focused
              ? null
              : level === 'row'
                ? { level, rowId: focused.rowId }
                : { level, ...focused };
    const allowed = target !== null && controller.canUpload(target);
    const available = (kind: FileUploadTarget['level']) =>
        kind === 'grid'
            ? controller.canUpload({ level: 'grid' })
            : focused !== null &&
              controller.canUpload(
                  kind === 'row' ? { level: 'row', rowId: focused.rowId } : { level: 'cell', ...focused }
              );
    return (
        <section data-grid-part="upload-panel" aria-label="File uploads">
            <div data-grid-part="upload-controls">
                <label>
                    Upload to{' '}
                    <select
                        aria-label="Upload target"
                        value={level}
                        onChange={(event) => setLevel(event.target.value as FileUploadTarget['level'])}
                    >
                        <option value="grid" disabled={!available('grid')}>
                            Grid
                        </option>
                        <option value="row" disabled={!available('row')}>
                            Focused row
                        </option>
                        <option value="cell" disabled={!available('cell')}>
                            Focused cell
                        </option>
                    </select>
                </label>
                <input
                    ref={input}
                    type="file"
                    hidden
                    data-grid-part="upload-input"
                    aria-label="Choose upload files"
                    accept={options.accept}
                    multiple={options.multiple !== false}
                    disabled={!allowed}
                    onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        event.target.value = '';
                        if (target) void controller.upload(files, target);
                    }}
                />
                <button type="button" disabled={!allowed} onClick={() => input.current?.click()}>
                    Choose files
                </button>
                <span>
                    {target && allowed
                        ? level === 'grid'
                            ? 'Grid attachment'
                            : level === 'row'
                              ? `Row ${target.level === 'row' ? target.rowId : ''}`
                              : `Cell ${target.level === 'cell' ? `${target.rowId} / ${target.colId}` : ''}`
                        : 'Select a permitted cell or row first.'}
                </span>
                {tasks.some((task) => !['queued', 'uploading'].includes(task.status)) && (
                    <button type="button" onClick={() => controller.clear()}>
                        Clear finished uploads
                    </button>
                )}
            </div>
            <div data-grid-part="upload-summary" role="status" aria-live="polite" aria-atomic="true">
                {tasks.length
                    ? `${tasks.filter((task) => task.status === 'uploaded').length} uploaded, ${tasks.filter((task) => task.status === 'queued' || task.status === 'uploading').length} pending, ${tasks.filter((task) => task.status === 'failed' || task.status === 'rejected').length} failed, ${tasks.filter((task) => task.status === 'cancelled').length} cancelled.`
                    : 'Drop files on a cell, row, or the grid header, or choose files.'}
            </div>
            {tasks.length > 0 && (
                <ul data-grid-part="upload-list" aria-label="Upload activity">
                    {tasks.map((task) => (
                        <li key={task.id} data-grid-part="upload-item">
                            <span>
                                {task.file.name} · {task.target.level}
                                {task.target.level !== 'grid' ? ` ${task.target.rowId}` : ''}
                                {task.target.level === 'cell' ? ` / ${task.target.colId}` : ''}
                            </span>
                            {task.status === 'uploading' && (
                                <progress
                                    aria-label={`Upload progress for ${task.file.name}`}
                                    max={100}
                                    value={task.progress}
                                />
                            )}
                            <span>{task.error ?? task.status}</span>
                            {(task.status === 'queued' || task.status === 'uploading') && (
                                <button
                                    type="button"
                                    aria-label={`Cancel upload ${task.file.name}`}
                                    onClick={() => controller.cancel(task.id)}
                                >
                                    Cancel
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
