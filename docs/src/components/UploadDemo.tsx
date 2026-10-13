import { Grid, type ColumnDefinition, type GridApi } from '@nord-forge/the-grid';
import { useEffect, useMemo, useRef, useState } from 'react';
import '@nord-forge/the-grid/styles.css';

import { makeRows, type Person } from './demoData';
import { demoUpload } from './demoUploads';

const columns: ColumnDefinition<Person>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'team', headerName: 'Team', flex: 1, minWidth: 130 },
];

export default function UploadDemo() {
    const api = useRef<GridApi<Person> | null>(null);
    const [revision, setRevision] = useState(0);
    const [dropScope, setDropScope] = useState<'cell' | 'row' | 'grid'>('cell');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const data = useMemo(
        () => ({ type: 'local' as const, rows: makeRows(4), getRowId: (person: Person) => person.id }),
        [revision]
    );
    useEffect(() => {
        const root = document.documentElement;
        const update = () => setTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
        update();
        const observer = new MutationObserver(update);
        observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);
    return (
        <section className="upload-demo" aria-label="File upload example">
            <p className="demo-instructions">
                Choose files for the grid, or select a cell to attach them to a row or cell. Uploads are simulated;
                files stay in your browser.
            </p>
            <div className="grid-demo">
                <div className="demo-viewport" style={{ height: 360 }}>
                    <Grid<Person>
                        key={revision}
                        apiRef={api}
                        data={data}
                        columns={columns}
                        className="docs-grid"
                        colorScheme={theme}
                        ariaLabel="Upload example"
                        interaction="cell"
                        defaultColumn={{ sortable: false, resizable: false }}
                        uploads={{
                            targets: { grid: true, row: dropScope !== 'grid', cell: dropScope === 'cell' },
                            accept: '.txt,.csv,.pdf,image/*',
                            maxFileSize: 2 * 1024 * 1024,
                            maxFiles: 5,
                            concurrency: 2,
                            upload: demoUpload,
                        }}
                    />
                </div>
            </div>
            <details className="demo-upload-settings">
                <summary>Drop settings</summary>
                <div className="demo-settings">
                    <label className="demo-density">
                        Drop scope{' '}
                        <select
                            value={dropScope}
                            onChange={(event) => setDropScope(event.target.value as 'cell' | 'row' | 'grid')}
                        >
                            <option value="cell">Nearest cell</option>
                            <option value="row">Nearest row</option>
                            <option value="grid">Grid</option>
                        </select>
                    </label>
                    <button type="button" onClick={() => setRevision((value) => value + 1)}>
                        Reset uploads
                    </button>
                </div>
            </details>
        </section>
    );
}
