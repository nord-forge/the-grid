import type { CellEditorComponent } from '@nord-forge/the-grid';
import { useLayoutEffect, useRef, type ReactNode } from 'react';

export function createChoiceEditor<TData>(choices: readonly string[]): CellEditorComponent<TData> {
    const ChoiceEditor: CellEditorComponent<TData> = ({ draft, setDraft, stop, column, error, params, icons }) => {
        const icon =
            params.icon !== undefined ? (
                (params.icon as ReactNode)
            ) : icons?.select !== undefined ? (
                icons.select
            ) : (
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                    <path
                        d="m3.5 6 4.5 4.5L12.5 6"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        return (
            <span className="demo-select-editor">
                <select
                    autoFocus
                    data-grid-part="editor-input"
                    aria-label={column.headerName}
                    aria-invalid={Boolean(error)}
                    title={error ?? undefined}
                    value={String(draft ?? '')}
                    onChange={(event) => {
                        setDraft(event.target.value);
                        stop(true);
                    }}
                >
                    {choices.map((choice) => (
                        <option key={choice} value={choice}>
                            {choice}
                        </option>
                    ))}
                </select>
                {icon !== null && icon !== false && (
                    <span className="demo-select-icon" aria-hidden="true">
                        {icon}
                    </span>
                )}
            </span>
        );
    };

    ChoiceEditor.parse = (draft) => {
        const value = String(draft ?? '').trim();
        return choices.includes(value) ? { ok: true, value } : { ok: false, error: `Choose ${choices.join(', ')}.` };
    };
    return ChoiceEditor;
}

export function createBudgetEditor<TData>(): CellEditorComponent<TData> {
    const BudgetEditor: CellEditorComponent<TData> = ({ draft, setDraft, startKey, column, error }) => {
        const input = useRef<HTMLInputElement>(null);
        useLayoutEffect(() => {
            if (startKey !== null) setDraft(startKey);
            input.current?.focus({ preventScroll: true });
            input.current?.select();
            // Only initialize the draft when this editor mounts.
        }, []);

        return (
            <input
                ref={input}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                data-grid-part="editor-input"
                aria-label={`${column.headerName} in euros`}
                aria-invalid={Boolean(error)}
                title={error ?? undefined}
                value={String(draft ?? '')}
                onChange={(event) => setDraft(event.target.value)}
            />
        );
    };

    BudgetEditor.parse = (draft) => {
        // Copy uses formatted values, so accept the demo's euro/thousands formatting too.
        const text = String(draft ?? '')
            .trim()
            .replace(/^€\s*/, '');
        if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) {
            return { ok: false, error: 'Enter a non-negative amount with up to two decimal places.' };
        }
        const value = Number(text.replace(/,/g, ''));
        return Number.isFinite(value) ? { ok: true, value } : { ok: false, error: 'Enter a finite amount.' };
    };
    return BudgetEditor;
}
