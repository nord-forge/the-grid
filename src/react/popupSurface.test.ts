import { expect, it, vi } from 'vitest';

import { hideNativePopover, showNativePopover } from './popupSurface';

it('does not query unsupported popover selectors or call missing APIs', () => {
    const matches = vi.fn(() => {
        throw new Error('Unsupported selector');
    });
    const element = { isConnected: true, matches } as unknown as HTMLElement;
    expect(() => showNativePopover(element)).not.toThrow();
    expect(() => hideNativePopover(element)).not.toThrow();
    expect(matches).not.toHaveBeenCalled();
});
it('shows native popovers and hides only connected open popovers', () => {
    const element = { isConnected: true, matches: vi.fn(() => true), showPopover: vi.fn(), hidePopover: vi.fn() };
    showNativePopover(element as unknown as HTMLElement);
    hideNativePopover(element as unknown as HTMLElement);
    expect(element.showPopover).toHaveBeenCalledOnce();
    expect(element.hidePopover).toHaveBeenCalledOnce();
    element.isConnected = false;
    hideNativePopover(element as unknown as HTMLElement);
    expect(element.hidePopover).toHaveBeenCalledOnce();
});
