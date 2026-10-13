import { Grid, AttachmentList, type GridAttachment, type ColumnDefinition, type GridApi } from '@nord-forge/the-grid';
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
    const [attachments, setAttachments] = useState<readonly GridAttachment[]>([]);
    const urls = useRef(new Set<string>());
    const attempts = useRef(new WeakSet<File>());
    const nextId = useRef(0);
    useEffect(
        () => () => {
            for (const url of urls.current) URL.revokeObjectURL(url);
        },
        []
    );
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
                            upload: async (context) => {
                                // fail files fail once, then succeed through the same retry action as real transports.
                                await demoUpload({
                                    ...context,
                                    file:
                                        context.file.name.toLowerCase().includes('fail') &&
                                        attempts.current.has(context.file)
                                            ? new File([context.file], context.file.name.replace(/fail/gi, 'retry'), {
                                                  type: context.file.type,
                                              })
                                            : context.file,
                                }).catch((error) => {
                                    attempts.current.add(context.file);
                                    throw error;
                                });
                                const url = URL.createObjectURL(context.file);
                                urls.current.add(url);
                                const attachment: GridAttachment = {
                                    id: `attachment-${++nextId.current}`,
                                    name: context.file.name,
                                    size: context.file.size,
                                    contentType: context.file.type,
                                    url,
                                    previewUrl: context.file.type.startsWith('image/') ? url : undefined,
                                    target: context.target,
                                };
                                setAttachments((current) => [...current, attachment]);
                                return attachment;
                            },
                        }}
                    />
                </div>
            </div>
            <h3>Attachments</h3>
            <div data-grid-part="root" className="docs-grid not-content">
                <AttachmentList
                    attachments={attachments}
                    onRemove={async (attachment) => {
                        setAttachments((current) => current.filter((item) => item.id !== attachment.id));
                        if (attachment.url) {
                            URL.revokeObjectURL(attachment.url);
                            urls.current.delete(attachment.url);
                        }
                    }}
                />
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
                    <button
                        type="button"
                        onClick={() => {
                            for (const url of urls.current) URL.revokeObjectURL(url);
                            urls.current.clear();
                            attempts.current = new WeakSet();
                            setAttachments([]);
                            setRevision((value) => value + 1);
                        }}
                    >
                        Reset uploads
                    </button>
                </div>
            </details>
        </section>
    );
}
