import {
    Grid,
    createSelectCellEditor,
    createCurrencyCellEditor,
    type GridApi,
    type ColumnDefinition,
} from '@nord-forge/the-grid/legacy';
import { StrictMode, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@nord-forge/the-grid/legacy/styles.css';

import './legacy-fixture.css';

type Person = { id: string; name: string; team: string; status: string; budget: number; notes: string };
const columns: ColumnDefinition<Person>[] = [
    {
        colId: 'selection',
        headerName: '',
        width: 44,
        pinned: 'left',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        sortable: false,
        resizable: false,
    },
    { field: 'name', width: 160, pinned: 'left', editable: true, filter: 'text' },
    {
        field: 'team',
        width: 180,
        editable: true,
        filter: 'set',
        cellEditor: createSelectCellEditor({ values: ['Engineering', 'Design', 'Operations'] }),
    },
    {
        field: 'status',
        width: 140,
        editable: true,
        cellEditor: createSelectCellEditor({
            values: ['Active', 'Invited', { value: 'Disabled', label: 'Disabled', disabled: true }],
        }),
    },
    {
        field: 'budget',
        width: 180,
        editable: true,
        cellEditor: createCurrencyCellEditor({ currency: 'EUR', minimumFractionDigits: 2 }),
        valueFormatter: ({ value }) =>
            new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(Number(value)),
    },
    { field: 'notes', width: 220, editable: true, cellEditor: 'largeTextEditor' },
];
declare global {
    interface Window {
        __legacyGrid: GridApi<Person> | null;
        __legacyRoot: ReturnType<typeof createRoot>;
    }
}

function App() {
    const api = useRef<GridApi<Person> | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const data = useMemo(
        () => ({
            type: 'local' as const,
            rows: Array.from({ length: 100 }, (_, index) => ({
                id: `row-${index + 1}`,
                name: `Person ${index + 1}`,
                team: index % 2 ? 'Design' : 'Engineering',
                status: 'Active',
                budget: 1200 + index,
                notes: 'Ready for review',
            })),
            getRowId: (row: Person) => row.id,
        }),
        []
    );
    return (
        <>
            <h1>Legacy browser fixture</h1>
            <div className="fixture-controls">
                <button onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}>
                    Change theme
                </button>
                <button onClick={() => api.current?.showColumnChooser()}>Choose columns</button>
                <button onClick={() => api.current?.setRowGroupColumns(['team'])}>Group by team</button>
                <button
                    onClick={() => {
                        api.current?.setRowGroupColumns([]);
                        api.current?.setSortModel([]);
                        api.current?.setColumnFilter('name', null);
                    }}
                >
                    Reset query
                </button>
                <button onClick={() => document.getElementById('app')?.classList.toggle('brand-red')}>
                    Change brand
                </button>
                <button onClick={() => api.current?.geometry.setScroll({ top: 1000, left: 300 })}>Scroll grid</button>
            </div>
            <div className="clip-shell">
                <Grid<Person>
                    apiRef={api}
                    columns={columns}
                    data={data}
                    className="legacy-grid"
                    colorScheme={theme}
                    interaction="cell"
                    rowSelection="multiple"
                    groupDisplay="fullWidthRow"
                    headerMenuButton
                    headerFilterButton="always"
                    pinnedRows={{
                        bottom: [{ id: 'total', name: 'Total', team: '', status: '', budget: 120000, notes: '' }],
                    }}
                    ariaLabel="Legacy people"
                    on={{
                        ready: () => {
                            window.__legacyGrid = api.current;
                        },
                    }}
                />
            </div>
            <p id="after-grid">Popups must not move this paragraph or be clipped by the grid’s transformed parent.</p>
            <button>Outside control</button>
            <div style={{ height: 1000 }} />
        </>
    );
}
window.__legacyRoot = createRoot(document.getElementById('app')!);
window.__legacyRoot.render(
    <StrictMode>
        <App />
    </StrictMode>
);
