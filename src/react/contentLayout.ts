/** Content layout renders the displayed body and pinned rows; unknown server counts must load first. */
export const DEFAULT_CONTENT_ROW_LIMIT = 1000;
export function contentLayoutError(
    count: number | null,
    pinnedCount: number,
    limit = DEFAULT_CONTENT_ROW_LIMIT,
    loaded = false
): string | null {
    if (!Number.isSafeInteger(limit) || limit < 1) return 'contentModeRowLimit must be a positive integer.';
    if (count === null && loaded)
        return 'Content layout requires a known row count. Return rowCount from the server or use virtual layout.';
    if (count !== null && count + pinnedCount > limit)
        return `Content layout cannot render ${count + pinnedCount} rows: contentModeRowLimit is ${limit}. Use virtual layout or increase the limit.`;
    return null;
}
