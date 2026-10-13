import { createContext, useContext, type ComponentType, type HTMLAttributes, type RefObject } from 'react';

import type { Rect } from '../contract';

/** Internal rendering boundary: the legacy entry supplies its portal without adding it to the standard bundle. */
export type PopupSurfaceProps = HTMLAttributes<HTMLDivElement> & {
    elementRef: RefObject<HTMLDivElement | null>;
    anchor: Rect;
    anchorElement?: RefObject<HTMLElement | null>;
};

export const GridRootContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export function NativePopupSurface({
    elementRef,
    anchor: _anchor,
    anchorElement: _element,
    ...props
}: PopupSurfaceProps) {
    return <div {...props} ref={elementRef} popover="manual" data-popup-mode="native" />;
}

export const PopupSurfaceContext = createContext<ComponentType<PopupSurfaceProps>>(NativePopupSurface);

export function PopupSurface(props: PopupSurfaceProps) {
    const Surface = useContext(PopupSurfaceContext);
    return <Surface {...props} />;
}

export function showNativePopover(element: HTMLElement) {
    if (typeof element.showPopover === 'function') element.showPopover();
}

export function hideNativePopover(element: HTMLElement) {
    // Older browsers also reject the :popover-open selector, so guard the entire operation.
    if (typeof element.hidePopover === 'function' && element.isConnected && element.matches(':popover-open'))
        element.hidePopover();
}
