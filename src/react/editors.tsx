import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { CellEditorComponent } from '../contract';
import { popupPlacement } from './popupPlacement';

export type SelectEditorOption = string | number | { value: string | number; label: string; disabled?: boolean };
export type SelectEditorOptions = { values?: readonly SelectEditorOption[]; icon?: ReactNode };
export type NumberEditorOptions = {
    locale?: string;
    min?: number;
    max?: number;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
    allowEmpty?: boolean;
};
export type CurrencyEditorOptions = NumberEditorOptions & {
    currency?: string;
    currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code';
};
const normalizeChoices = (values: readonly SelectEditorOption[]) =>
    values.map((value) => (typeof value === 'object' ? value : { value, label: String(value) }));

/** Select-only combobox. Focus stays on the trigger; popup options are announced with aria-activedescendant. */
export function createSelectCellEditor<TData = any>(options: SelectEditorOptions = {}): CellEditorComponent<TData> {
    const Editor: CellEditorComponent<TData> = ({
        draft,
        setDraft,
        stop,
        startKey,
        openOnMount,
        column,
        params,
        icons,
        error,
        errorId,
        anchor,
    }) => {
        const choices = normalizeChoices(
            (params.values as readonly SelectEditorOption[] | undefined) ?? options.values ?? []
        );
        const selected = choices.findIndex((choice) => Object.is(choice.value, draft));
        const [open, setOpen] = useState(Boolean(openOnMount || startKey));
        const [active, setActive] = useState(
            selected >= 0 && !choices[selected]?.disabled
                ? selected
                : Math.max(
                      0,
                      choices.findIndex((choice) => !choice.disabled)
                  )
        );
        const trigger = useRef<HTMLButtonElement>(null);
        const popup = useRef<HTMLDivElement>(null);
        const search = useRef({ text: '', time: 0 });
        const id = useId();
        const enabled = choices.map((choice, index) => (!choice.disabled ? index : -1)).filter((index) => index >= 0);
        const icon =
            params.icon !== undefined ? (
                (params.icon as ReactNode)
            ) : options.icon !== undefined ? (
                options.icon
            ) : icons?.select !== undefined ? (
                icons.select
            ) : (
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                    <path
                        d="m3.5 6 4.5 4.5L12.5 6"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        function highlight(index: number) {
            if (index >= 0 && !choices[index]?.disabled) setActive(index);
        }
        function find(text: string) {
            const index = choices.findIndex(
                (choice) => !choice.disabled && choice.label.toLocaleLowerCase().startsWith(text.toLocaleLowerCase())
            );
            highlight(index);
        }
        useLayoutEffect(() => {
            trigger.current?.focus({ preventScroll: true });
            if (startKey) {
                search.current = { text: startKey, time: Date.now() };
                find(startKey);
            }
        }, []);
        useLayoutEffect(() => {
            const element = popup.current;
            if (!open || !element) return;
            element.showPopover?.();
            const dismiss = (event: PointerEvent) => {
                if (!element.contains(event.target as Node) && !trigger.current?.contains(event.target as Node))
                    setOpen(false);
            };
            document.addEventListener('pointerdown', dismiss, true);
            return () => {
                document.removeEventListener('pointerdown', dismiss, true);
                if (element.isConnected && element.matches(':popover-open')) element.hidePopover();
            };
        }, [open]);
        useLayoutEffect(() => {
            const element = popup.current;
            if (!open || !element) return;
            const place = () => {
                const placement = popupPlacement(
                    anchor,
                    {
                        width: element.getBoundingClientRect().width,
                        height: element.scrollHeight + element.offsetHeight - element.clientHeight,
                    },
                    { width: window.innerWidth, height: window.innerHeight }
                );
                Object.assign(
                    element.style,
                    Object.fromEntries(Object.entries(placement).map(([key, value]) => [key, `${value}px`]))
                );
            };
            place();
            window.addEventListener('resize', place);
            return () => window.removeEventListener('resize', place);
        }, [open, anchor.left, anchor.top, anchor.width, anchor.height, choices.length]);
        useLayoutEffect(() => {
            if (open)
                popup.current
                    ?.querySelector<HTMLElement>(`[id="${CSS.escape(`${id}-${active}`)}"]`)
                    ?.scrollIntoView({ block: 'nearest' });
        }, [open, active]);
        function choose(index: number) {
            const choice = choices[index];
            if (!choice || choice.disabled) return;
            setDraft(choice.value);
            stop(true);
        }
        return (
            <span data-grid-part="select-editor">
                <button
                    ref={trigger}
                    type="button"
                    role="combobox"
                    data-grid-part="editor-input"
                    aria-label={column.headerName}
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    aria-controls={open ? id : undefined}
                    aria-activedescendant={open && choices[active] ? `${id}-${active}` : undefined}
                    aria-describedby={errorId}
                    aria-invalid={Boolean(error)}
                    title={error ?? undefined}
                    onClick={() => setOpen((value) => !value)}
                    onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing) return;
                        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!open) {
                                setOpen(true);
                                highlight(
                                    selected >= 0 && !choices[selected]?.disabled ? selected : (enabled[0] ?? -1)
                                );
                            } else {
                                const index = enabled.indexOf(active);
                                highlight(
                                    enabled[
                                        Math.max(
                                            0,
                                            Math.min(enabled.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))
                                        )
                                    ] ?? -1
                                );
                            }
                        } else if (event.key === 'Home' || event.key === 'End') {
                            event.preventDefault();
                            event.stopPropagation();
                            setOpen(true);
                            highlight((event.key === 'Home' ? enabled[0] : enabled.at(-1)) ?? -1);
                        } else if (event.key === ' ' || (event.key === 'Enter' && open)) {
                            event.preventDefault();
                            event.stopPropagation();
                            if (open) choose(active);
                            else setOpen(true);
                        } else if (event.key === 'Tab' && open && choices[active] && !choices[active].disabled) {
                            setDraft(choices[active].value); // The host commits and navigates once.
                        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                            event.preventDefault();
                            event.stopPropagation();
                            const now = Date.now();
                            const text = now - search.current.time < 700 ? search.current.text + event.key : event.key;
                            search.current = { text, time: now };
                            setOpen(true);
                            find(text);
                        }
                    }}
                >
                    <span>{choices[selected]?.label ?? String(draft ?? '')}</span>
                    {icon !== null && icon !== false && (
                        <span data-grid-part="select-icon" aria-hidden="true">
                            {icon}
                        </span>
                    )}
                </button>
                {open && (
                    <div
                        ref={popup}
                        id={id}
                        popover="manual"
                        role="listbox"
                        aria-label={column.headerName}
                        data-grid-part="select-listbox"
                        style={{
                            margin: 0,
                            inset: 'auto',
                            ...popupPlacement(
                                anchor,
                                { width: anchor.width, height: Math.min(240, choices.length * 36 + 10) },
                                typeof window === 'undefined'
                                    ? {
                                          width: anchor.left + anchor.width + 8,
                                          height: anchor.top + anchor.height + 248,
                                      }
                                    : { width: window.innerWidth, height: window.innerHeight }
                            ),
                        }}
                    >
                        {choices.map((choice, index) => (
                            <button
                                key={index}
                                id={`${id}-${index}`}
                                type="button"
                                role="option"
                                tabIndex={-1}
                                data-grid-part="select-option"
                                data-active={active === index || undefined}
                                aria-selected={active === index}
                                aria-disabled={choice.disabled || undefined}
                                disabled={choice.disabled}
                                onMouseDown={(event) => event.preventDefault()}
                                onPointerMove={() => highlight(index)}
                                onClick={() => choose(index)}
                            >
                                {choice.label}
                            </button>
                        ))}
                        {choices.length === 0 && <span>No options available</span>}
                    </div>
                )}
            </span>
        );
    };
    Editor.keyPolicy = { arrowsNavigateGrid: false };
    Editor.parse = (draft, { column }) => {
        const choices = normalizeChoices(
            (column.def.cellEditorParams?.values as readonly SelectEditorOption[] | undefined) ?? options.values ?? []
        );
        const choice =
            choices.find((choice) => Object.is(choice.value, draft)) ??
            choices.find((choice) => String(choice.value) === String(draft));
        return choice && !choice.disabled
            ? { ok: true, value: choice.value }
            : {
                  ok: false,
                  error: `Choose ${choices
                      .filter((choice) => !choice.disabled)
                      .map((choice) => choice.label)
                      .join(', ')}.`,
              };
    };
    return Editor;
}

function numericEditor<TData>(options: CurrencyEditorOptions, currency: boolean): CellEditorComponent<TData> {
    const locale = options.locale ?? 'en-GB';
    const formatter = new Intl.NumberFormat(locale, {
        style: currency ? 'currency' : 'decimal',
        currency: currency ? (options.currency ?? 'EUR') : undefined,
        currencyDisplay: options.currencyDisplay,
        useGrouping: options.useGrouping,
        minimumFractionDigits: options.minimumFractionDigits,
        maximumFractionDigits: options.maximumFractionDigits ?? (currency ? undefined : 20),
    });
    const resolved = formatter.resolvedOptions();
    const numeric = new Intl.NumberFormat(locale, { ...resolved, style: 'decimal' });
    const integer = new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 });
    const parts = formatter.formatToParts(1234.5);
    const decimal =
        parts.find((part) => part.type === 'decimal')?.value ??
        new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')!.value;
    const group = integer.formatToParts(1234).find((part) => part.type === 'group')?.value ?? ',';
    const first = parts.findIndex((part) => part.type === 'integer');
    let last = parts.length - 1;
    while (last > first && !['integer', 'fraction'].includes(parts[last]!.type)) last--;
    const prefix = currency
        ? parts
              .slice(0, first)
              .map((part) => part.value)
              .join('')
        : '';
    const suffix = currency
        ? parts
              .slice(last + 1)
              .map((part) => part.value)
              .join('')
        : '';
    const digits = Array.from({ length: 10 }, (_, value) =>
        new Intl.NumberFormat(locale, { useGrouping: false }).format(value)
    );
    const toLatin = (text: string) =>
        digits
            .reduce((value, digit, index) => value.split(digit).join(String(index)), text)
            .replace(/[\u200e\u200f\u061c]/g, '')
            .replace(/−/g, '-');
    const Editor: CellEditorComponent<TData> = ({ draft, setDraft, startKey, column, error, errorId }) => {
        const input = useRef<HTMLInputElement>(null);
        const text = typeof draft === 'number' ? numeric.format(draft) : String(draft ?? '');
        useLayoutEffect(() => {
            if (startKey !== null) setDraft(startKey);
            input.current?.focus({ preventScroll: true });
            if (startKey !== null)
                input.current?.setSelectionRange(input.current.value.length, input.current.value.length);
            else input.current?.select();
        }, []);
        return (
            <span data-grid-part="number-editor">
                {prefix && (
                    <span data-grid-part="number-prefix" aria-hidden="true">
                        {prefix}
                    </span>
                )}
                <span data-grid-part="number-value">
                    <span data-grid-part="number-measure" aria-hidden="true">
                        {text || '0'}
                    </span>
                    <input
                        ref={input}
                        type="text"
                        inputMode="decimal"
                        data-grid-part="editor-input"
                        aria-label={currency ? `${column.headerName} in ${resolved.currency}` : column.headerName}
                        aria-describedby={errorId}
                        aria-invalid={Boolean(error)}
                        title={error ?? undefined}
                        value={text}
                        onChange={(event) => setDraft(event.target.value)}
                    />
                </span>
                {suffix && (
                    <span data-grid-part="number-suffix" aria-hidden="true">
                        {suffix}
                    </span>
                )}
            </span>
        );
    };
    Editor.parse = (draft) => {
        const validate = (value: number) => {
            if (!Number.isFinite(value)) return { ok: false as const, error: 'Enter a finite number.' };
            if (options.min !== undefined && value < options.min)
                return {
                    ok: false as const,
                    error: options.min === 0 ? 'Enter a non-negative amount.' : `Enter at least ${options.min}.`,
                };
            if (options.max !== undefined && value > options.max)
                return { ok: false as const, error: `Enter no more than ${options.max}.` };
            return { ok: true as const, value };
        };
        // Initial drafts are already numbers. Preserve them without locale conversion or display rounding.
        if (typeof draft === 'number') return validate(draft);
        if (String(draft ?? '').trim() === '' && options.allowEmpty) return { ok: true, value: null };
        let text = toLatin(String(draft ?? '')).trim();
        let sign = '';
        if (/^[+-]/.test(text)) {
            sign = text[0]!;
            text = text.slice(1).trim();
        }
        const leading = toLatin(prefix).trim(),
            trailing = toLatin(suffix).trim();
        if (leading && text.startsWith(leading)) text = text.slice(leading.length).trim();
        if (trailing && text.endsWith(trailing)) text = text.slice(0, -trailing.length).trim();
        text = sign + text;
        const exponentParts = text.split(/[eE]/);
        if (exponentParts.length > 2 || (exponentParts.length === 2 && !/^[+-]?\d+$/.test(exponentParts[1]!)))
            return { ok: false, error: 'Enter a valid number.' };
        text = exponentParts[0]!;
        const segments = text.split(decimal);
        const precision = Math.max(0, (segments[1]?.length ?? 0) - Number(exponentParts[1] ?? 0));
        if (segments.length > 2 || precision > resolved.maximumFractionDigits!)
            return { ok: false, error: `Enter an amount with up to ${resolved.maximumFractionDigits} decimal places.` };
        const whole = segments[0]!;
        const ungrouped = whole.split(group).join('');
        if (whole.includes(group) && toLatin(integer.format(Number(ungrouped))) !== whole)
            return { ok: false, error: 'Enter a valid number.' };
        const normalized = ungrouped + (segments.length === 2 ? '.' + segments[1] : '');
        if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return { ok: false, error: 'Enter a valid number.' };
        return validate(Number(normalized + (exponentParts.length === 2 ? `e${exponentParts[1]}` : '')));
    };
    return Editor;
}
export function createNumberCellEditor<TData = any>(options: NumberEditorOptions = {}): CellEditorComponent<TData> {
    return numericEditor(options, false);
}
export function createCurrencyCellEditor<TData = any>(options: CurrencyEditorOptions = {}): CellEditorComponent<TData> {
    return numericEditor(options, true);
}
export const SelectCellEditor = createSelectCellEditor();
export const NumberCellEditor = createNumberCellEditor();
export const CurrencyCellEditor = createCurrencyCellEditor();

/** Registry editors configure each mounted editor and its parser from cellEditorParams. */
export function configuredNumericEditor(currency = false): CellEditorComponent<any> {
    const Editor: CellEditorComponent<any> = (props) => {
        const options = props.params as CurrencyEditorOptions;
        const Configured = useMemo(
            () => numericEditor(options, currency),
            [
                options.locale,
                options.currency,
                options.currencyDisplay,
                options.min,
                options.max,
                options.minimumFractionDigits,
                options.maximumFractionDigits,
                options.useGrouping,
                options.allowEmpty,
            ]
        );
        return <Configured {...props} />;
    };
    Editor.parse = (draft, context) =>
        numericEditor(context.column.def.cellEditorParams ?? {}, currency).parse!(draft, context);
    return Editor;
}
