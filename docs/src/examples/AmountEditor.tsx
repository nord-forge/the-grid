import type { CellEditorComponent, ColumnDefinition } from '@nord-forge/the-grid';

type Invoice = { id: string; amount: number };

export const AmountEditor: CellEditorComponent<Invoice> = ({ draft, setDraft, error }) => (
  <input
    autoFocus
    data-grid-part="editor-input"
    aria-label="Amount"
    aria-invalid={Boolean(error)}
    title={error ?? undefined}
    value={String(draft ?? '')}
    onChange={(event) => setDraft(event.target.value)}
  />
);

AmountEditor.parse = (draft) => {
  const value = Number(draft);
  return String(draft).trim() !== '' && Number.isFinite(value)
    ? { ok: true, value }
    : { ok: false, error: 'Enter a number' };
};

export const columns: ColumnDefinition<Invoice>[] = [
  { field: 'amount', headerName: 'Amount', editable: true, cellEditor: AmountEditor },
];
