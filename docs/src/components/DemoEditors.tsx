import { createCurrencyCellEditor, createSelectCellEditor } from '@nord-forge/the-grid';

export function createChoiceEditor<TData>(choices: readonly string[]) {
    return createSelectCellEditor<TData>({ values: choices });
}
export function createBudgetEditor<TData>() {
    return createCurrencyCellEditor<TData>({ locale: 'en-GB', currency: 'EUR', min: 0, maximumFractionDigits: 2 });
}
