import type { GridProps } from '../contract';
import { Grid } from '../react/Grid';
import { PopupSurfaceContext } from '../react/popupSurface';
import { LegacyPopupSurface } from './PopupSurface';

/** Same grid API, with a portal fallback for the built-in popup surfaces. */
export function LegacyGrid<TData>(props: GridProps<TData>) {
    return (
        <PopupSurfaceContext.Provider value={LegacyPopupSurface}>
            <Grid {...props} />
        </PopupSurfaceContext.Provider>
    );
}
