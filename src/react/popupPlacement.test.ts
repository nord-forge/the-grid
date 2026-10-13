import { expect, it } from 'vitest';

import { popupPlacement } from './popupPlacement';

it('flips a popup above a cell near the bottom and clamps its actual width', () => {
    expect(
        popupPlacement(
            { top: 560, left: 700, width: 100, height: 32 },
            { width: 280, height: 180 },
            { width: 800, height: 600 }
        )
    ).toMatchObject({ top: 380, left: 512, maxHeight: 240 });
});
it('stays below when there is room and caps height to available space', () => {
    expect(
        popupPlacement(
            { top: 20, left: 10, width: 100, height: 32 },
            { width: 100, height: 500 },
            { width: 320, height: 200 }
        )
    ).toMatchObject({ top: 52, maxHeight: 140 });
});
it('keeps popups within tiny viewports and off-screen anchors', () => {
    for (const top of [-30, 20, 200]) {
        const placement = popupPlacement(
            { top, left: 300, width: 400, height: 32 },
            { width: 400, height: 240 },
            { width: 100, height: 60 }
        );
        expect(placement.left).toBeGreaterThanOrEqual(8);
        expect(placement.left + placement.maxWidth).toBeLessThanOrEqual(92);
        expect(placement.top).toBeGreaterThanOrEqual(8);
        expect(placement.top + Math.min(240, placement.maxHeight)).toBeLessThanOrEqual(52);
    }
});
