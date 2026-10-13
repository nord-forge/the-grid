import { useContext, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { popupPlacement } from '../react/popupPlacement';
import { GridRootContext, NativePopupSurface, type PopupSurfaceProps } from '../react/popupSurface';

export function LegacyPopupSurface(props: PopupSurfaceProps) {
    return typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function' ? (
        <NativePopupSurface {...props} />
    ) : (
        <PortalPopupSurface {...props} />
    );
}

/** Only this legacy-only module may position transient UI with fixed coordinates. Grid layout stays in flow. */
function PortalPopupSurface({ elementRef, anchor, anchorElement, style, ...props }: PopupSurfaceProps) {
    const owner = useContext(GridRootContext);
    const [host] = useState(() => (typeof document === 'undefined' ? null : document.createElement('div')));
    const latest = useRef({ anchor, anchorElement });
    latest.current = { anchor, anchorElement };
    const origin = useRef<{ top: number; left: number } | null>(null);
    const update = useRef(() => {});

    useLayoutEffect(() => {
        if (!host) return;
        host.setAttribute('data-grid-part', 'root');
        host.setAttribute('data-popup-portal', '');
        Object.assign(host.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '0',
            height: '0',
            minHeight: '0',
            margin: '0',
            padding: '0',
            border: '0',
            overflow: 'visible',
            pointerEvents: 'none',
            zIndex: '2147483647',
            transform: 'none',
            filter: 'none',
            perspective: 'none',
            contain: 'none',
            clipPath: 'none',
        });
        document.body.appendChild(host);
        const syncTheme = () => {
            const grid = owner?.current;
            if (!grid) return;
            host.className = grid.className;
            host.dataset.colorScheme = grid.dataset.colorScheme ?? 'light';
            host.dataset.density = grid.dataset.density ?? 'comfortable';
            const computed = getComputedStyle(grid);
            for (let i = 0; i < computed.length; i++) {
                const property = computed[i]!;
                if (property.startsWith('--the-grid-'))
                    host.style.setProperty(property, computed.getPropertyValue(property));
            }
            Object.assign(host.style, {
                fontFamily: computed.fontFamily,
                fontSize: computed.fontSize,
                fontWeight: computed.fontWeight,
                fontStyle: computed.fontStyle,
                lineHeight: computed.lineHeight,
                letterSpacing: computed.letterSpacing,
            });
            host.style.color = computed.color;
            host.style.colorScheme = computed.colorScheme;
        };
        const place = () => {
            const element = elementRef.current;
            if (!element) return;
            const current = latest.current;
            const gridRect = owner?.current?.getBoundingClientRect();
            const live = current.anchorElement?.current?.getBoundingClientRect();
            const rect = live ?? {
                ...current.anchor,
                top: current.anchor.top + (gridRect && origin.current ? gridRect.top - origin.current.top : 0),
                left: current.anchor.left + (gridRect && origin.current ? gridRect.left - origin.current.left : 0),
            };
            const placement = popupPlacement(
                rect,
                {
                    width: Math.max(element.getBoundingClientRect().width, rect.width),
                    height: element.scrollHeight + element.offsetHeight - element.clientHeight,
                },
                { width: window.innerWidth, height: window.innerHeight }
            );
            // Keep the menu's CSS minimum while ensuring even narrow windows can contain it.
            placement.minWidth = Math.min(
                placement.maxWidth,
                Math.max(placement.minWidth, parseFloat(getComputedStyle(element).minWidth) || 0)
            );
            for (const [property, value] of Object.entries(placement)) {
                (element.style as unknown as Record<string, string>)[property] = `${value}px`;
            }
        };
        update.current = () => {
            syncTheme();
            place();
        };
        const observer = new MutationObserver(update.current);
        for (
            let ancestor: HTMLElement | null | undefined = owner?.current;
            ancestor;
            ancestor = ancestor.parentElement
        ) {
            observer.observe(ancestor, { attributes: true });
        }
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        media.addEventListener('change', update.current);
        window.addEventListener('resize', update.current);
        document.addEventListener('scroll', place, true);
        update.current();
        return () => {
            observer.disconnect();
            media.removeEventListener('change', update.current);
            window.removeEventListener('resize', update.current);
            document.removeEventListener('scroll', place, true);
            update.current = () => {};
            host.remove();
        };
    }, [host, owner, elementRef]);
    useLayoutEffect(() => {
        origin.current = owner?.current?.getBoundingClientRect() ?? null;
        update.current();
    }, [anchor.top, anchor.left, anchor.width, anchor.height]);
    useLayoutEffect(() => update.current());

    return host
        ? createPortal(
              <div
                  {...props}
                  ref={elementRef}
                  data-popup-mode="portal"
                  style={{
                      ...style,
                      position: 'fixed',
                      width: 'max-content',
                      margin: 0,
                      overflow: 'auto',
                      pointerEvents: 'auto',
                  }}
              />,
              host
          )
        : null;
}
