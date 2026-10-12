import { useEffect, useMemo, useRef, useState } from 'react';
import { Grid, type CellRendererProps, type ColumnDefinition, type GridApi } from '@nord-forge/the-grid';
import '@nord-forge/the-grid/styles.css';

type Person = {
  id: string;
  name: string;
  team: string;
  role: string;
  status: string;
  budget: number;
};

const names = ['Alex Morgan', 'Sam Chen', 'Robin De Smet', 'Jamie Park', 'Casey Laurent', 'Taylor Jacobs', 'Noor Peeters', 'Charlie Williams', 'Luca Rossi', 'Drew Kim', 'Morgan Dubois', 'Avery Patel'];
const teams = ['Engineering', 'Design', 'Operations', 'Product'];
const roles = ['Developer', 'Designer', 'Team lead', 'Specialist'];
const statuses = ['Active', 'Active', 'On leave', 'Invited'];

function makeRows(count: number): Person[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `person-${index + 1}`,
    name: names[index % names.length]!,
    team: teams[index % teams.length]!,
    role: roles[Math.floor(index / 3) % roles.length]!,
    status: statuses[Math.floor(index / 2) % statuses.length]!,
    budget: 1200 + ((index * 173) % 4800),
  }));
}

function StatusCell({ value }: CellRendererProps<Person>) {
  return <span className="demo-status" data-status={String(value).toLowerCase().replace(' ', '-')}><span aria-hidden="true">●</span> {String(value)}</span>;
}

const columns: ColumnDefinition<Person>[] = [
  { colId: 'select', headerName: '', width: 44, minWidth: 44, maxWidth: 44, pinned: 'left', checkboxSelection: true, headerCheckboxSelection: true, resizable: false, sortable: false },
  { field: 'name', headerName: 'Name', width: 190, pinned: 'left', editable: true, filter: 'text' },
  { field: 'team', headerName: 'Team', width: 145, filter: 'set', enableRowGroup: true },
  { field: 'role', headerName: 'Role', width: 145, editable: true, filter: 'text' },
  { field: 'status', headerName: 'Status', width: 120, filter: 'set', cellRenderer: StatusCell },
  { field: 'budget', headerName: 'Budget', width: 125, filter: 'number', valueFormatter: ({ value }) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value)) },
];

export default function GridDemo({ preview = false }: { preview?: boolean }) {
  const api = useRef<GridApi<Person> | null>(null);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(0);
  const [grouped, setGrouped] = useState(false);
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
          columns={columns}
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
          on={{ selectionChanged: () => setSelected(api.current?.getSelectedRows().length ?? 0) }}
        />
      </div>
      <div className="demo-footer"><span aria-live="polite">{count.toLocaleString('en-GB')} rows · {selected} selected</span><span>Sort a column. Double-click a name to edit.</span></div>
    </section>
  );
}
