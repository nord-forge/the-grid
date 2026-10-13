import { Grid, type GridApi } from '@nord-forge/the-grid';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import '@nord-forge/the-grid/styles.css';

import { demoColumns } from './demoColumns';
import { makeRows, type Person } from './demoData';

export default function GridDemo({ preview = false }: { preview?: boolean }) {
    const api = useRef<GridApi<Person> | null>(null);
    const [revision, setRevision] = useState(0);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(0);
    const [grouped, setGrouped] = useState(false);
    const [changes, setChanges] = useState(0);
    const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
    const [selectIcon, setSelectIcon] = useState<'chevron' | 'caret' | 'none'>('chevron');
    const [openSelectOnDoubleClick, setOpenSelectOnDoubleClick] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const settingsId = useId();
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const count = preview ? 24 : 1000;
    const rows = useMemo(() => makeRows(count), [count, revision]);
    const data = useMemo(
        () => ({ type: 'local' as const, rows, getRowId: (person: Person) => person.id, expandedByDefault: true }),
        [rows]
    );

    useEffect(() => {
        const root = document.documentElement;
        const update = () => setTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
        update();
        const observer = new MutationObserver(update);
        observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    function reset() {
        setSearch('');
        setSelected(0);
        setGrouped(false);
        setChanges(0);
        setRevision((value) => value + 1);
    }

    return (
        <section className="grid-demo" aria-label="Interactive grid example">
            <div className="demo-toolbar">
                <label className="demo-search">
                    <span aria-hidden="true">⌕</span>
                    <input
                        aria-label="Search demo rows"
                        placeholder="Search people…"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            api.current?.setQuickFilter(event.target.value);
                        }}
                    />
                </label>
                <button
                    type="button"
                    aria-pressed={grouped}
                    onClick={() => {
                        const next = !grouped;
                        setGrouped(next);
                        api.current?.setRowGroupColumns(next ? ['team'] : []);
                    }}
                >
                    Group by team
                </button>
                <button type="button" onClick={reset}>
                    Reset
                </button>
                {!preview && (
                    <button
                        type="button"
                        aria-label="Demo settings"
                        aria-expanded={settingsOpen}
                        aria-controls={settingsOpen ? settingsId : undefined}
                        onClick={() => setSettingsOpen((value) => !value)}
                    >
                        Settings
                    </button>
                )}
            </div>
            {settingsOpen && (
                <div id={settingsId} className="demo-settings" aria-label="Demo settings">
                    {!preview && (
                        <label className="demo-density">
                            Density{' '}
                            <select
                                value={density}
                                onChange={(event) => setDensity(event.target.value as 'comfortable' | 'compact')}
                            >
                                <option value="comfortable">Comfortable</option>
                                <option value="compact">Compact</option>
                            </select>
                        </label>
                    )}
                    {!preview && (
                        <label className="demo-density">
                            Select icon{' '}
                            <select
                                value={selectIcon}
                                onChange={(event) => setSelectIcon(event.target.value as 'chevron' | 'caret' | 'none')}
                            >
                                <option value="chevron">Chevron</option>
                                <option value="caret">Caret</option>
                                <option value="none">None</option>
                            </select>
                        </label>
                    )}
                    {!preview && (
                        <label className="demo-auto-open">
                            <input
                                type="checkbox"
                                checked={openSelectOnDoubleClick}
                                onChange={(event) => setOpenSelectOnDoubleClick(event.target.checked)}
                            />
                            Open dropdown on double-click
                        </label>
                    )}
                </div>
            )}
            <div className="demo-viewport" style={{ height: preview ? 310 : 440 }}>
                <Grid<Person>
                    key={revision}
                    apiRef={api}
                    data={data}
                    columns={demoColumns}
                    defaultColumn={{ sortable: true, resizable: true }}
                    className="docs-grid"
                    colorScheme={theme}
                    density={density}
                    openSelectOnDoubleClick={openSelectOnDoubleClick}
                    icons={{
                        select:
                            selectIcon === 'none' ? (
                                false
                            ) : selectIcon === 'caret' ? (
                                <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
                                    <path d="M3 5.5h10L8 11z" />
                                </svg>
                            ) : undefined,
                    }}
                    rowSelection="multiple"
                    interaction="cell"
                    enableRanges
                    enableFill
                    stickyGroupRows
                    headerFilterButton="always"
                    ariaLabel="People example"
                    on={{
                        selectionChanged: () => setSelected(api.current?.getSelectedRows().length ?? 0),
                        rowsChanged: () => setSelected(api.current?.getSelectedRows().length ?? 0),
                        cellValueChanged: () => setChanges((value) => value + 1),
                    }}
                />
            </div>
            <div className="demo-footer">
                <span aria-live="polite">
                    {count.toLocaleString('en-GB')} rows · {selected} selected · {changes} changes
                </span>
                <span>Double-click to edit. Changes stay here.</span>
            </div>
        </section>
    );
}
