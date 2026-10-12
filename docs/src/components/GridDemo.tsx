import { useEffect, useMemo, useRef, useState } from 'react';
import { Grid, type GridApi } from '@nord-forge/the-grid';
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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const count = preview ? 24 : 1000;
  const rows = useMemo(() => makeRows(count), [count, revision]);
  const data = useMemo(() => ({ type: 'local' as const, rows, getRowId: (person: Person) => person.id, expandedByDefault: true }), [rows]);

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
          <input aria-label="Search demo rows" placeholder="Search people…" value={search} onChange={(event) => {
            setSearch(event.target.value);
            api.current?.setQuickFilter(event.target.value);
          }} />
        </label>
        {!preview && <label className="demo-density">Density <select value={density} onChange={(event) => setDensity(event.target.value as 'comfortable' | 'compact')}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>}
        <button type="button" aria-pressed={grouped} onClick={() => {
          const next = !grouped;
          setGrouped(next);
          api.current?.setRowGroupColumns(next ? ['team'] : []);
        }}>Group by team</button>
        <button type="button" onClick={reset}>Reset</button>
      </div>
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
          rowSelection="multiple"
          interaction="cell"
          enableRanges
          enableFill
          stickyGroupRows
          headerMenuButton
          headerFilterButton="always"
          ariaLabel="People example"
          on={{
            selectionChanged: () => setSelected(api.current?.getSelectedRows().length ?? 0),
            rowsChanged: () => setSelected(api.current?.getSelectedRows().length ?? 0),
            cellValueChanged: () => setChanges((value) => value + 1),
          }}
        />
      </div>
      <div className="demo-footer"><span aria-live="polite">{count.toLocaleString('en-GB')} rows · {selected} selected · {changes} changes</span><span>Double-click to edit. Changes stay in this demo.</span></div>
    </section>
  );
}
