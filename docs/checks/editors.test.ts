import { describe, expect, it } from 'vitest';
import { GridStore } from '../../src/grid/store';
import { demoColumns } from '../src/components/demoColumns';
import { makeRows, type Person } from '../src/components/demoData';

function setup() {
  return new GridStore<Person>({
    rows: makeRows(4),
    getRowId: (person) => person.id,
    columns: demoColumns,
    defaultColumn: { sortable: true, resizable: true },
    interaction: 'cell',
    enableRanges: true,
    enableFill: true,
  });
}

function person(store: GridStore<Person>, id: string): Person {
  const row = store.getRow(id);
  if (!row || row.kind !== 'data') throw new Error('Expected a data row');
  return row.data;
}

const cell = (colId: string, rowId = 'person-1') => ({ rowId, colId });

describe('Live example editors', () => {
  it.each([['team', 'Design'], ['status', 'On leave']])('commits the %s dropdown through the grid', async (field, value) => {
    const store = setup();
    await store.startEditing(cell(field));
    store.editing.setDraft(value);
    expect(await store.stopEditing(true, 'api')).toBe(true);
    expect(person(store, 'person-1')[field as 'team' | 'status']).toBe(value);
  });

  it('keeps invalid budget edits open, then commits a corrected numeric amount', async () => {
    const store = setup();
    await store.startEditing(cell('budget'));
    store.editing.setDraft('-50');
    expect(await store.stopEditing(true, 'enter')).toBe(false);
    expect(person(store, 'person-1').budget).toBe(1200);
    expect(store.editSession?.error).toMatch(/non-negative/);
    store.editing.setDraft('2500.75');
    expect(await store.stopEditing(true, 'enter')).toBe(true);
    expect(person(store, 'person-1').budget).toBe(2500.75);
    expect(typeof person(store, 'person-1').budget).toBe('number');
  });

  it('discards a numeric draft on Escape', async () => {
    const store = setup();
    await store.startEditing(cell('budget'));
    store.editing.setDraft('42.50');
    await store.stopEditing(false, 'escape');
    expect(person(store, 'person-1').budget).toBe(1200);
    expect(store.editSession).toBeNull();
  });

  it.each([['team', 'Design', 'Marketing'], ['status', 'On leave', 'Unknown']])('validates pasted %s options without overwriting rejected cells', async (field, valid, invalid) => {
    const store = setup();
    const original = person(store, 'person-2')[field as 'team' | 'status'];
    store.focusCell(cell(field));
    expect(await store.paste(`${valid}\n${invalid}`)).toEqual({ written: 1, rejected: 1 });
    expect(person(store, 'person-1')[field as 'team' | 'status']).toBe(valid);
    expect(person(store, 'person-2')[field as 'team' | 'status']).toBe(original);
    expect(store.cellError(cell(field, 'person-2'))).toMatch(/Choose/);
  });

  it('round-trips formatted euro values through copy and paste as numbers', async () => {
    const store = setup();
    store.setRanges([{ anchor: cell('budget'), end: cell('budget') }]);
    const copied = store.copy()!.text;
    expect(copied).toBe('€1,200.00');
    store.setRanges([]);
    store.focusCell(cell('budget', 'person-2'));
    expect(await store.paste(copied)).toEqual({ written: 1, rejected: 0 });
    expect(person(store, 'person-2').budget).toBe(1200);
  });

  it('rejects blank, malformed, and over-precision budget paste values', async () => {
    const store = setup();
    store.focusCell(cell('budget'));
    expect(await store.paste('\n1,2\n10.999\nInfinity')).toEqual({ written: 0, rejected: 4 });
    expect(person(store, 'person-1').budget).toBe(1200);
    expect(person(store, 'person-2').budget).toBe(1373);
  });

  it('fills numeric budgets using the formatted source without changing their type', async () => {
    const store = setup();
    store.setRanges([{ anchor: cell('budget'), end: cell('budget') }]);
    store.startFill();
    store.dragOverCell(cell('budget', 'person-3'));
    await store.pointerUp();
    expect(person(store, 'person-2').budget).toBe(1200);
    expect(person(store, 'person-3').budget).toBe(1200);
  });

  it('uses committed budget values for numeric sorting and filtering', async () => {
    const store = setup();
    store.focusCell(cell('budget'));
    await store.paste('900\n100');
    store.setSortModel([{ colId: 'budget', sort: 'asc' }]);
    expect(store.projection.displayedRows[0]?.id).toBe('person-2');
    store.setFilterModel({ budget: { filterType: 'number', type: 'lessThan', filter: 500 } });
    expect(store.projection.displayedRows.map((row) => row.id)).toEqual(['person-2']);
  });
});
