import { useLayoutEffect, useRef } from 'react';

import type { CellEditorComponent } from '../contract';

/** A popup textarea. Enter inserts a newline; Tab commits and Escape cancels. */
export const LargeTextCellEditor: CellEditorComponent<any> = ({
    draft,
    setDraft,
    startKey,
    column,
    error,
    errorId,
}) => {
    const input = useRef<HTMLTextAreaElement>(null);
    useLayoutEffect(() => {
        if (startKey !== null) setDraft(startKey);
        input.current?.focus({ preventScroll: true });
        const element = input.current;
        if (element) {
            const end = element.value.length;
            element.setSelectionRange(startKey !== null ? end : 0, end);
        }
    }, []);
    return (
        <textarea
            ref={input}
            rows={6}
            data-grid-part="editor-input"
            aria-label={column.headerName}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            title={error ?? undefined}
            style={{ minWidth: 240, minHeight: 120 }}
            value={startKey ?? String(draft ?? '')}
            onChange={(event) => setDraft(event.target.value)}
        />
    );
};
LargeTextCellEditor.presentation = 'popup';
LargeTextCellEditor.keyPolicy = { enter: 'newline', arrowsNavigateGrid: false };

function dateEditor(asString: boolean): CellEditorComponent<any> {
    const Editor: CellEditorComponent<any> = ({ draft, setDraft, column, error, errorId, params }) => {
        const input = useRef<HTMLInputElement>(null);
        useLayoutEffect(() => {
            input.current?.focus({ preventScroll: true });
        }, []);
        const text =
            draft instanceof Date
                ? Number.isFinite(draft.getTime())
                    ? draft.toISOString().slice(0, 10)
                    : ''
                : String(draft ?? '');
        return (
            <input
                ref={input}
                type="date"
                data-grid-part="editor-input"
                aria-label={column.headerName}
                aria-invalid={Boolean(error)}
                aria-describedby={errorId}
                title={error ?? undefined}
                min={typeof params.min === 'string' ? params.min : undefined}
                max={typeof params.max === 'string' ? params.max : undefined}
                value={text}
                onChange={(event) => setDraft(event.target.value)}
            />
        );
    };
    Editor.keyPolicy = { arrowsNavigateGrid: false };
    Editor.parse = (draft, { column }) => {
        const params = column.def.cellEditorParams ?? {};
        if ((draft === null || draft === undefined || draft === '') && params.allowEmpty !== false)
            return { ok: true, value: null };
        const text =
            draft instanceof Date && Number.isFinite(draft.getTime())
                ? draft.toISOString().slice(0, 10)
                : String(draft ?? '');
        const date = new Date(`${text}T00:00:00.000Z`);
        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(text) ||
            !Number.isFinite(date.getTime()) ||
            date.toISOString().slice(0, 10) !== text
        )
            return { ok: false, error: 'Enter a valid date.' };
        if (typeof params.min === 'string' && text < params.min)
            return { ok: false, error: `Enter a date on or after ${params.min}.` };
        if (typeof params.max === 'string' && text > params.max)
            return { ok: false, error: `Enter a date on or before ${params.max}.` };
        return { ok: true, value: asString ? text : draft instanceof Date ? draft : date };
    };
    return Editor;
}

/** Date values use UTC calendar days. The string variant saves YYYY-MM-DD. */
export const DateCellEditor = dateEditor(false);
export const DateStringCellEditor = dateEditor(true);

export const CheckboxCellEditor: CellEditorComponent<any> = ({ draft, setDraft, column, error, errorId }) => {
    const input = useRef<HTMLInputElement>(null);
    useLayoutEffect(() => {
        input.current?.focus({ preventScroll: true });
    }, []);
    return (
        <input
            ref={input}
            type="checkbox"
            aria-label={column.headerName}
            style={{ alignSelf: 'center' }}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            title={error ?? undefined}
            checked={draft === true || draft === 'true' || draft === 1 || draft === '1'}
            onChange={(event) => setDraft(event.target.checked)}
        />
    );
};
CheckboxCellEditor.parse = (draft) => {
    if (draft === true || draft === 'true' || draft === 1 || draft === '1') return { ok: true, value: true };
    if (draft === false || draft === 'false' || draft === 0 || draft === '0') return { ok: true, value: false };
    return { ok: false, error: 'Choose checked or unchecked.' };
};
