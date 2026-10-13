import postcss from 'postcss';

/** Generate the opt-in legacy theme from the same source as the standard layered theme. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(`${root}/src/styles/grid.css`, 'utf8');
const css = postcss.parse(source);
css.walkComments((comment) => comment.remove());
css.walkAtRules('layer', (layer) => layer.replaceWith(layer.nodes));
const vertical = new Set(['column-chooser', 'filter-editor', 'filter-condition', 'filter-choices']);
css.walkRules((rule) => {
    rule.selector = rule.selector.replaceAll(':focus-visible', ':focus');
    rule.walkDecls((declaration) => {
        const logical = declaration.prop.match(/^(padding|margin)-(inline|block)$/);
        if (logical) {
            const values = postcss.list.space(declaration.value);
            for (const [side, value] of [
                ['start', values[0]],
                ['end', values[1] ?? values[0]],
            ])
                rule.insertBefore(declaration, { prop: `${declaration.prop}-${side}`, value });
            declaration.remove();
            return;
        }
        if (declaration.value.includes('color-mix(')) {
            const percent = declaration.value.match(/var\(--the-grid-accent\)\s+(\d+)%/)?.[1];
            if (!percent) throw new Error(`Unsupported legacy color mix: ${declaration.value}`);
            declaration.value = `rgba(var(--the-grid-accent-rgb), ${Number(percent) / 100})`;
        }
        if (declaration.prop === 'overflow' && declaration.value === 'clip') {
            declaration.value = 'visible';
            rule.append({
                prop: 'clip-path',
                value:
                    rule.selector === ":where([data-grid-part='root'])"
                        ? 'inset(0 round var(--the-grid-radius))'
                        : 'inset(0)',
            });
        }
        if (declaration.prop === 'overflow-wrap' && declaration.value === 'anywhere') declaration.value = 'break-word';
        if (declaration.prop === 'align-self' && declaration.value === 'end') declaration.value = 'flex-end';
        if (declaration.prop === 'accent-color') declaration.remove(); // Native OS checkbox colors on this target.
        if (declaration.prop === 'gap') {
            const parts = [...rule.selector.matchAll(/data-grid-part='([^']+)'/g)].map((match) => match[1]);
            const column = parts.some((part) => vertical.has(part));
            const spacing = postcss.rule({ selector: `${rule.selector} > :where(* + *)` });
            spacing.append({ prop: column ? 'margin-top' : 'margin-inline-start', value: declaration.value });
            rule.after(spacing);
            declaration.remove();
        }
    });
    if (rule.selector === ":where([data-grid-part='root'])") {
        rule.prepend({ prop: '--the-grid-accent-rgb', value: '82, 82, 91' });
    }
});
const legacy = css.toString();
if (
    /@layer|:has\(|color-mix\(|:focus-visible|\bgap\s*:|overflow\s*:\s*clip|(?:padding|margin)-(?:inline|block)\s*:|!important/.test(
        legacy
    )
) {
    throw new Error('Legacy stylesheet still contains an unsupported feature.');
}
writeFileSync(`${root}/dist/styles.css`, source);
writeFileSync(
    `${root}/dist/legacy.css`,
    `/* Generated legacy theme. Import instead of styles.css. Zero-specificity selectors, no cascade layer. */\n${legacy}\n`
);
console.log('Built standard and legacy stylesheets from one source.');
