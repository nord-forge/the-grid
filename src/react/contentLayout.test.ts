import { expect, it } from 'vitest';

import { contentLayoutError } from './contentLayout';

it('enforces an inclusive displayed row limit including pinned rows', () => {
    expect(contentLayoutError(999, 1)).toBeNull();
    expect(contentLayoutError(1000, 1)).toMatch(/1001 rows/);
    expect(contentLayoutError(4, 2, 5)).toMatch(/6 rows/);
    expect(contentLayoutError(1001, 0, 2000)).toBeNull();
    expect(contentLayoutError(0, 0)).toBeNull();
    expect(contentLayoutError(null, 0)).toBeNull();
    expect(contentLayoutError(null, 0, 1000, true)).toMatch(/known row count/);
});
it.each([0, -1, 1.5, Infinity, NaN])('rejects invalid limit %s', (limit) => {
    expect(contentLayoutError(2, 0, limit)).toMatch(/positive integer/);
});
