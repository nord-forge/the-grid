import { describe, expect, it } from 'vitest';

import type { CellEditorComponent, DataRow } from '../contract';
import { ColumnModel } from '../grid/columns';
import { createSelectCellEditor, createCurrencyCellEditor, createNumberCellEditor } from './editors';

function parse(editor: CellEditorComponent<any>, value: unknown, params = {}) {
    const column = new ColumnModel([{ field: 'value', editable: true, cellEditorParams: params }]).getResolved(
        'value'
    )!;
    return editor.parse!(value, { column, row: { id: '1', kind: 'data', data: { value: 1 } } as DataRow<any> });
}
describe('reusable editors', () => {
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
