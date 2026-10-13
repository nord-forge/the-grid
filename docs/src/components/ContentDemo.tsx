import { Grid, type ColumnDefinition, type GridApi, type DataSource } from '@nord-forge/the-grid';
import { useMemo, useRef, useState } from 'react';
import '@nord-forge/the-grid/styles.css';

type Item = { id: string; name: string; notes: string };
const columns: ColumnDefinition<Item>[] = [
    { field: 'name', width: 150, editable: true },
    { field: 'notes', width: 320, autoHeight: true, cellStyle: { whiteSpace: 'normal' }, editable: true },
    ...Array.from({ length: 6 }, (_, index) => ({
        colId: `extra-${index}`,
        headerName: `Detail ${index + 1}`,
        width: 130,
        valueGetter: ({ data }: { data: Item }) => data.id,
    })),
];
export default function ContentDemo() {
    const api = useRef<GridApi<Item> | null>(null);
    const [count, setCount] = useState(3);
    const [limit, setLimit] = useState(5);
    const [mode, setMode] = useState<'content' | 'virtual'>('content');
    const [server, setServer] = useState(false);
    const [knownCount, setKnownCount] = useState(true);
    const [requests, setRequests] = useState(0);
    const data = useMemo<DataSource<Item>>(() => {
        const rows = Array.from({ length: count }, (_, index) => ({
            id: `item-${index + 1}`,
            name: `Item ${index + 1}`,
            notes:
                index % 2
                    ? 'A longer note that wraps across multiple lines and determines this row’s height. '.repeat(3)
                    : 'Short note.',
        }));
        return server
            ? {
                  type: 'server',
                  blockSize: 2,
                  getRowId: (row) => row.id,
                  getRows: async ({ startRow, endRow }) => {
                      setRequests((value) => value + 1);
                      return { rows: rows.slice(startRow, endRow), rowCount: knownCount ? rows.length : null };
                  },
              }
            : { type: 'local', rows, getRowId: (row) => row.id };
    }, [count, server, knownCount]);
    return (
        <section className="grid-demo not-content" aria-label="Content layout demo">
            <div className="demo-toolbar">
                <button
                    type="button"
                    onClick={() => {
                        setRequests(0);
                        setServer((value) => !value);
                    }}
                >
                    Data: {server ? 'server' : 'local'}
                </button>
                <button type="button" onClick={() => setCount((value) => (value === 3 ? 6 : 3))}>
                    Toggle 3 / 6 rows
                </button>
                <button type="button" onClick={() => setLimit((value) => (value === 5 ? 10 : 5))}>
                    Row limit: {limit}
                </button>
                <button type="button" onClick={() => setMode((value) => (value === 'content' ? 'virtual' : 'content'))}>
                    Layout: {mode}
                </button>
                <button
                    type="button"
                    onClick={() => api.current?.setFocusedCell({ rowId: `item-${count}`, colId: 'name' })}
                >
                    Focus last row
                </button>
                {server ? (
                    <button type="button" onClick={() => setKnownCount((value) => !value)}>
                        Server count: {knownCount ? 'known' : 'unknown'}
                    </button>
                ) : null}
            </div>
            {server ? <p role="status">Server requests: {requests}</p> : null}
            <div style={{ height: mode === 'virtual' ? 180 : undefined }}>
                <Grid
                    key={server ? 'server' : 'local'}
                    data={data}
                    columns={columns}
                    apiRef={api}
                    layout={mode}
                    contentModeRowLimit={limit}
                    rowHeight="measure"
                    className="docs-grid"
                    interaction="cell"
                    ariaLabel="Content layout example"
                />
            </div>
        </section>
    );
}
