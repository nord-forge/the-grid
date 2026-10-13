import type { Rect } from '../contract';

/** Placement for a top-layer popup, including its measured content size. */
export function popupPlacement(
    anchor: Rect,
    size: { width: number; height: number },
    viewport: { width: number; height: number }
) {
    const margin = Math.min(8, viewport.width / 2, viewport.height / 2);
    const below = Math.max(0, viewport.height - margin - anchor.top - anchor.height);
    const above = Math.max(0, anchor.top - margin);
    const upwards = size.height > below && above > below;
    const maxHeight = Math.min(240, upwards ? above : below, Math.max(0, viewport.height - margin * 2));
    const height = Math.min(size.height, maxHeight);
    const maxWidth = Math.max(0, viewport.width - margin * 2);
    const width = Math.min(size.width, maxWidth);
    return {
        left: Math.max(margin, Math.min(anchor.left, viewport.width - margin - width)),
        top: Math.max(
            margin,
            Math.min(upwards ? anchor.top - height : anchor.top + anchor.height, viewport.height - margin - height)
        ),
        minWidth: Math.min(anchor.width, maxWidth),
        maxWidth,
        maxHeight,
    };
}
