import {
    Grid,
    createNumberCellEditor,
    createCurrencyCellEditor,
    createSelectCellEditor,
    type ColumnDefinition,
} from '@nord-forge/the-grid';
import { StrictMode, useMemo } from 'react';
import '@nord-forge/the-grid/styles.css';

type Invoice = { id: string; quantity: number; cost: number; tier: number };
const columns: ColumnDefinition<Invoice>[] = [
    {
        field: 'quantity',
        headerName: 'Quantity',
        width: 130,
        editable: true,
        cellEditor: createNumberCellEditor<Invoice>({ min: 0, max: 100, maximumFractionDigits: 0 }),
    },
    {
        field: 'cost',
        headerName: 'Euro amount',
        width: 150,
        editable: true,
        cellEditor: createCurrencyCellEditor<Invoice>({ locale: 'de-DE', currency: 'EUR', min: 0 }),
        valueFormatter: ({ value }) =>
            new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(value)),
    },
    {
        field: 'tier',
        headerName: 'Plan',
        width: 150,
        editable: true,
        cellEditor: createSelectCellEditor<Invoice>({
            values: [
                { value: 1, label: 'Basic' },
                { value: 2, label: 'Pro' },
                { value: 3, label: 'Enterprise', disabled: true },
            ],
        }),
        valueFormatter: ({ value }) => (value === 1 ? 'Basic' : value === 2 ? 'Pro' : 'Enterprise'),
    },
];
export default function EditorShowcase() {
    const data = useMemo(
        () => ({
            type: 'local' as const,
            rows: [{ id: 'invoice-1', quantity: 12, cost: 1234.5, tier: 1 }],
            getRowId: (row: Invoice) => row.id,
        }),
        []
    );
    return (
        <div style={{ height: 180 }}>
            <StrictMode>
                <Grid data={data} columns={columns} ariaLabel="Built-in editors example" interaction="cell" />
            </StrictMode>
        </div>
    );
}
