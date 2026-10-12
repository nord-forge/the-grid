import { Grid, type ColumnDefinition } from '@nord-forge/the-grid';
import '@nord-forge/the-grid/styles.css';

type Person = { id: number; name: string; team: string };

const columns: ColumnDefinition<Person>[] = [
  { field: 'name', headerName: 'Name', sortable: true },
  { field: 'team', headerName: 'Team', filter: 'set' },
];

export function People({ people }: { people: Person[] }) {
  return (
    <div style={{ height: 480 }}>
      <Grid<Person>
        data={{ type: 'local', rows: people, getRowId: (person) => String(person.id) }}
        columns={columns}
        ariaLabel="People"
      />
    </div>
  );
}
