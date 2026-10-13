import { Grid, type ColumnDefinition } from '@nord-forge/the-grid';
import { StrictMode, useMemo } from 'react';
import '@nord-forge/the-grid/styles.css';

type Record = { id: string; enabled: boolean; due: Date; deadline: string; notes: string };
const columns: ColumnDefinition<Record>[] = [
    { field: 'enabled', headerName: 'Enabled', width: 90, editable: true, dataType: 'boolean' },
    { field: 'due', headerName: 'Date value', width: 145, editable: true, dataType: 'date' },
    { field: 'deadline', headerName: 'Date string', width: 145, editable: true, dataType: 'dateString' },
    { field: 'notes', headerName: 'Notes', flex: 1, minWidth: 160, editable: true, cellEditor: 'largeTextEditor' },
];

export default function RegistryEditorShowcase() {
    const data = useMemo(
        () => ({
            type: 'local' as const,
            rows: [
                {
                    id: 'record-1',
                    enabled: false,
                    due: new Date('2026-10-13T00:00:00Z'),
                    deadline: '2026-10-20',
                    notes: 'Ready for review',
                },
            ],
            getRowId: (row: Record) => row.id,
        }),
        []
    );
    return (
        <div style={{ height: 180 }}>
            <StrictMode>
                <Grid
                    className="docs-grid"
                    data={data}
                    columns={columns}
                    ariaLabel="Registry editors example"
                    interaction="cell"
                />
            </StrictMode>
        </div>
    );
}
