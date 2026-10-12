import type { CellRendererProps, ColumnDefinition } from '@nord-forge/the-grid';
import { createBudgetEditor, createChoiceEditor } from './DemoEditors';
import { statuses, teams, type Person } from './demoData';

const TeamEditor = createChoiceEditor<Person>(teams);
const StatusEditor = createChoiceEditor<Person>(statuses);
const BudgetEditor = createBudgetEditor<Person>();
const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' });

function ChoiceCell({ formattedValue }: CellRendererProps<Person>) {
  return <span className="demo-choice"><span>{formattedValue}</span><span className="demo-choice-arrow" aria-hidden="true">▾</span></span>;
}

function StatusCell({ value }: CellRendererProps<Person>) {
  return <span className="demo-choice"><span className="demo-status" data-status={String(value).toLowerCase().replace(' ', '-')}><span aria-hidden="true">●</span> {String(value)}</span><span className="demo-choice-arrow" aria-hidden="true">▾</span></span>;
}

export const demoColumns: ColumnDefinition<Person>[] = [
  { colId: 'select', headerName: '', width: 44, minWidth: 44, maxWidth: 44, pinned: 'left', checkboxSelection: true, headerCheckboxSelection: true, resizable: false, sortable: false },
  { field: 'name', headerName: 'Name', width: 190, pinned: 'left', editable: true, filter: 'text' },
  { field: 'team', headerName: 'Team', width: 145, editable: true, filter: 'set', enableRowGroup: true, cellRenderer: ChoiceCell, cellEditor: TeamEditor },
  { field: 'role', headerName: 'Role', width: 145, editable: true, filter: 'text' },
  { field: 'status', headerName: 'Status', width: 120, editable: true, filter: 'set', cellRenderer: StatusCell, cellEditor: StatusEditor },
  { field: 'budget', headerName: 'Budget', flex: 1, minWidth: 125, editable: true, filter: 'number', cellEditor: BudgetEditor, cellClass: 'demo-currency', valueFormatter: ({ value }) => currency.format(Number(value)) },
];
