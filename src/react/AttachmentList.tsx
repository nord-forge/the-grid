import { useState, type ReactNode } from 'react';

import type { GridAttachment } from '../contract';

export type AttachmentListProps<T extends GridAttachment = GridAttachment> = {
    attachments: readonly T[];
    /** Optional target filtering belongs to the application; pass the attachments for the cell, row or grid. */
    onRemove?: (attachment: T) => void | Promise<void>;
    canRemove?: (attachment: T) => boolean;
    renderPreview?: (attachment: T) => ReactNode;
    ariaLabel?: string;
    emptyMessage?: ReactNode;
    className?: string;
};

/** Controlled attachment list. Download URLs and persistence are supplied by the application. */
export function AttachmentList<T extends GridAttachment>({
    attachments,
    onRemove,
    canRemove,
    renderPreview,
    ariaLabel = 'Attachments',
    emptyMessage = 'No attachments yet.',
    className,
}: AttachmentListProps<T>) {
    const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
    const [errors, setErrors] = useState<Record<string, string>>({});
    async function remove(attachment: T) {
        if (!onRemove || pending.has(attachment.id)) return;
        setPending((current) => new Set(current).add(attachment.id));
        setErrors((current) => ({ ...current, [attachment.id]: '' }));
        try {
            await onRemove(attachment);
        } catch (error) {
            setErrors((current) => ({
                ...current,
                [attachment.id]: error instanceof Error ? error.message : 'Could not remove attachment.',
            }));
        } finally {
            setPending((current) => {
                const next = new Set(current);
                next.delete(attachment.id);
                return next;
            });
        }
    }
    return (
        <section className={className} data-grid-part="attachments" aria-label={ariaLabel}>
            {!attachments.length ? (
                <p data-grid-part="attachment-empty">{emptyMessage}</p>
            ) : (
                <ul data-grid-part="attachment-list">
                    {attachments.map((attachment) => (
                        <li key={attachment.id} data-grid-part="attachment-item">
                            {renderPreview ? (
                                renderPreview(attachment)
                            ) : attachment.contentType?.startsWith('image/') && attachment.previewUrl ? (
                                <img
                                    data-grid-part="attachment-preview"
                                    src={attachment.previewUrl}
                                    alt={`Preview of ${attachment.name}`}
                                    loading="lazy"
                                />
                            ) : null}
                            <span data-grid-part="attachment-info">
                                <span>{attachment.name}</span>
                                {attachment.target ? (
                                    <small>
                                        {attachment.target.level}
                                        {attachment.target.level !== 'grid' ? ` · ${attachment.target.rowId}` : ''}
                                        {attachment.target.level === 'cell' ? ` / ${attachment.target.colId}` : ''}
                                    </small>
                                ) : null}
                                {attachment.size !== undefined ? (
                                    <small>{new Intl.NumberFormat().format(attachment.size)} bytes</small>
                                ) : null}
                            </span>
                            {attachment.url ? (
                                <a
                                    href={attachment.url}
                                    download={attachment.name}
                                    aria-label={`Download ${attachment.name}`}
                                >
                                    Download
                                </a>
                            ) : null}
                            {onRemove && (canRemove?.(attachment) ?? true) ? (
                                <button
                                    type="button"
                                    disabled={pending.has(attachment.id)}
                                    aria-label={`Remove ${attachment.name}`}
                                    onClick={() => {
                                        void remove(attachment);
                                    }}
                                >
                                    {pending.has(attachment.id) ? 'Removing…' : 'Remove'}
                                </button>
                            ) : null}
                            {errors[attachment.id] ? <span role="alert">{errors[attachment.id]}</span> : null}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
