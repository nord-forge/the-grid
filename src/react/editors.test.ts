import { describe, expect, it } from 'vitest';

import type { CellEditorComponent, DataRow } from '../contract';
import { ColumnModel } from '../grid/columns';
import { GridStore } from '../grid/store';
import { DateCellEditor, DateStringCellEditor, CheckboxCellEditor } from './basicEditors';
import { createSelectCellEditor, createCurrencyCellEditor, createNumberCellEditor } from './editors';

function parse(editor: CellEditorComponent<any>, value: unknown, params = {}) {
    const column = new ColumnModel([{ field: 'value', editable: true, cellEditorParams: params }]).getResolved(
        'value'
    )!;
    return editor.parse!(value, { column, row: { id: '1', kind: 'data', data: { value: 1 } } as DataRow<any> });
}
describe('reusable editors', () => {
    it.each(['de-DE', 'fr-FR', 'ar-EG', 'en-GB'])(
        'preserves unchanged numeric drafts in %s, without display rounding',
        (locale) => {
            for (const value of [1234.5, -1234.5, 1e21, 1e-7, 1.23456]) {
                expect(parse(createNumberCellEditor({ locale }), value)).toEqual({ ok: true, value });
                expect(parse(createCurrencyCellEditor({ locale }), value)).toEqual({ ok: true, value });
            }
            expect(parse(createNumberCellEditor({ locale, min: 0 }), -1)).toMatchObject({ ok: false });
            expect(parse(createNumberCellEditor({ locale }), Infinity)).toMatchObject({ ok: false });
        }
    );
    it.each(['en-GB', 'de-DE', 'fr-FR', 'ar-EG', 'en-US'])('accepts negative formatted currency in %s', (locale) => {
        const value = -1234.5;
        const text = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);
        expect(parse(createCurrencyCellEditor({ locale }), text)).toEqual({ ok: true, value });
    });
    it('accepts scientific notation and validates its resulting precision and bounds', () => {
        expect(parse(createNumberCellEditor(), '1e21')).toEqual({ ok: true, value: 1e21 });
        expect(parse(createNumberCellEditor(), '1e-7')).toEqual({ ok: true, value: 1e-7 });
        expect(parse(createNumberCellEditor({ locale: 'de-DE' }), '1,25e2')).toEqual({ ok: true, value: 125 });
        for (const text of ['1e', '1e2e3', '1e309', '1e-3'])
            expect(parse(createCurrencyCellEditor(), text)).toMatchObject({ ok: false });
        expect(parse(createNumberCellEditor({ max: 100 }), '1e3')).toMatchObject({ ok: false });
    });
    it('parses dates strictly, preserves their type and validates calendar dates and bounds', () => {
        const date = new Date('2024-02-29T15:00:00Z');
        expect(parse(DateCellEditor, date)).toEqual({ ok: true, value: date });
        expect(parse(DateCellEditor, '2024-02-29')).toEqual({ ok: true, value: new Date('2024-02-29T00:00:00Z') });
        expect(parse(DateStringCellEditor, '2024-02-29')).toEqual({ ok: true, value: '2024-02-29' });
        for (const text of ['2023-02-29', '2024-04-31', '2024-13-01', 'invalid'])
            expect(parse(DateCellEditor, text)).toMatchObject({ ok: false });
        expect(parse(DateCellEditor, '')).toEqual({ ok: true, value: null });
        expect(parse(DateCellEditor, '', { allowEmpty: false })).toMatchObject({ ok: false });
        expect(parse(DateCellEditor, '2024-02-29', { min: '2024-03-01' })).toMatchObject({ ok: false });
        expect(parse(DateCellEditor, '2024-02-29', { max: '2024-02-28' })).toMatchObject({ ok: false });
    });
    it('preserves boolean values and rejects arbitrary checkbox text', () => {
        for (const value of [true, 'true', 1, '1'])
            expect(parse(CheckboxCellEditor, value)).toEqual({ ok: true, value: true });
        for (const value of [false, 'false', 0, '0'])
            expect(parse(CheckboxCellEditor, value)).toEqual({ ok: true, value: false });
        expect(parse(CheckboxCellEditor, 'yes')).toMatchObject({ ok: false });
    });
    it('resolves named editors and typed defaults through the real store, honoring overrides', () => {
        const rows = [{ id: '1', number: 1234.5, flag: false, date: new Date('2024-02-29T00:00:00Z'), text: 'Basic' }];
        const store = new GridStore({
            rows,
            getRowId: (row) => row.id,
            columns: [
                {
                    field: 'number',
                    editable: true,
                    dataType: 'number',
                    cellEditorParams: { locale: 'de-DE', max: 2000 },
                },
                { field: 'flag', editable: true, dataType: 'boolean' },
                { field: 'date', editable: true, dataType: 'date' },
                {
                    field: 'text',
                    editable: true,
                    cellEditor: 'selectEditor',
                    cellEditorParams: { values: ['Basic', 'Pro'] },
                },
            ],
        });
        for (const [colId, draft, value] of [
            ['number', '1.500,25', 1500.25],
            ['flag', true, true],
            ['date', '2024-03-01', new Date('2024-03-01T00:00:00Z')],
            ['text', 'Pro', 'Pro'],
        ] as const) {
            expect(store.startEditing({ rowId: '1', colId })).toBe(true);
            store.editing.setDraft(draft);
            expect(store.stopEditing(true, 'api')).toBe(true);
            expect(store.columns.getResolved(colId)!.getValue(store.getRow('1') as DataRow<any>)).toEqual(value);
        }
        store.destroy();
        const override = createNumberCellEditor({ min: 10 });
        const overridden = new GridStore({
            rows,
            columns: [{ field: 'number', dataType: 'number' }],
            registry: { editors: { numberEditor: override } },
        });
        expect(overridden.columns.getResolved('number')!.editor).toBe(override);
        overridden.destroy();
    });
    it('preserves typed select values, labels, per-column values and disabled options', () => {
        const editor = createSelectCellEditor({
            values: [
                { value: 1, label: 'One' },
                { value: 2, label: 'Two', disabled: true },
            ],
        });
        expect(parse(editor, '1')).toEqual({ ok: true, value: 1 });
        expect(parse(createSelectCellEditor({ values: [1, '1'] }), '1')).toEqual({ ok: true, value: '1' });
        expect(parse(editor, 2)).toMatchObject({ ok: false });
        expect(parse(editor, 'other')).toMatchObject({ ok: false });
        expect(parse(editor, 'Other', { values: ['Other'] })).toEqual({ ok: true, value: 'Other' });
    });
    it.each([
        ['en-GB', 'EUR', '€1,234.50', 1234.5],
        ['de-DE', 'EUR', '1.234,50 €', 1234.5],
        ['fr-FR', 'EUR', '1 234,50 €', 1234.5],
        ['en-US', 'USD', '$1,234.50', 1234.5],
        ['ja-JP', 'JPY', '￥1,234', 1234],
        ['ar-EG', 'EGP', new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(1234.5), 1234.5],
    ])('parses %s %s currency formatting', (locale, currency, text, value) => {
        expect(parse(createCurrencyCellEditor({ locale, currency }), text)).toEqual({ ok: true, value });
    });
    it('validates bounds, precision, finite values, blanks and grouping', () => {
        const editor = createCurrencyCellEditor({ min: 0, max: 5000 });
        for (const value of ['-1', '', 'Infinity', '1,2', '10.999', '5001'])
            expect(parse(editor, value)).toMatchObject({ ok: false });
        expect(parse(editor, '2500.75')).toEqual({ ok: true, value: 2500.75 });
        expect(parse(createNumberCellEditor({ allowEmpty: true }), '  ')).toEqual({ ok: true, value: null });
        expect(parse(createNumberCellEditor(), '.5')).toEqual({ ok: true, value: 0.5 });
        expect(parse(createNumberCellEditor(), '-1234.123456')).toEqual({ ok: true, value: -1234.123456 });
    });
    it('supports Indian grouping and numeric copy/paste', () => {
        expect(parse(createNumberCellEditor({ locale: 'en-IN' }), '1,23,456.75')).toEqual({
            ok: true,
            value: 123456.75,
        });
    });
});
