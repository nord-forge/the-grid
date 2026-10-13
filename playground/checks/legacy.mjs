import { chromium, firefox, webkit } from 'playwright';
import { build, preview } from 'vite';

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const outDir = mkdtempSync(join(tmpdir(), 'the-grid-legacy-fixture-'));
const requested = process.argv.find((arg) => arg.startsWith('--browser='))?.slice(10) ?? 'all';
const names = requested === 'all' ? ['chromium', 'firefox', 'webkit'] : [requested];
const checks = [];
const config = {
    configFile: `${root}/playground/vite.config.ts`,
    logLevel: 'warn',
    build: {
        outDir,
        emptyOutDir: true,
        target: ['chrome88', 'edge88', 'firefox85', 'safari14'],
        rolldownOptions: { input: `${root}/playground/legacy.html` },
    },
    preview: { host: '127.0.0.1', port: 5197, strictPort: true },
};
let server;
try {
    await build(config);
    server = await preview(config);
    for (const name of names) {
        const browser = await { chromium, firefox, webkit }[name].launch({ headless: true });
        try {
            const nativeContext = await browser.newContext({ viewport: { width: 1000, height: 800 } });
            const nativePage = await nativeContext.newPage();
            await nativePage.goto('http://127.0.0.1:5197/legacy.html');
            const nativeCell = nativePage.locator(
                '[data-grid-part="row"][data-row-id="row-1"] [data-grid-part="cell"][data-col-id="team"]'
            );
            await nativeCell.dblclick();
            const nativePopup = nativePage.getByRole('listbox');
            await nativePopup.waitFor();
            assert.equal(await nativePopup.getAttribute('data-popup-mode'), 'native');
            assert.equal(await nativePage.locator('[data-popup-portal]').count(), 0);
            await nativePage.getByRole('option', { name: 'Design', exact: true }).click();
            await nativePage.waitForFunction(() => window.__legacyGrid.getSourceRows()[0].team === 'Design');
            await nativeContext.close();
            checks.push(`${name}: legacy build preserves native popovers when available`);
            console.log(`PASS legacy ${name}: native popovers are preserved when available`);
            const context = await browser.newContext({ viewport: { width: 1000, height: 800 } });
            await context.addInitScript(() => {
                for (const method of ['at', 'findLast'])
                    Object.defineProperty(Array.prototype, method, { configurable: true, value: undefined });
                Object.defineProperty(Object, 'hasOwn', { configurable: true, value: undefined });
                for (const method of ['showPopover', 'hidePopover', 'togglePopover'])
                    Object.defineProperty(HTMLElement.prototype, method, { configurable: true, value: undefined });
                const matches = Element.prototype.matches;
                Element.prototype.matches = function (selector) {
                    if (selector.includes(':popover-open'))
                        throw new DOMException('Unsupported selector', 'SyntaxError');
                    return matches.call(this, selector);
                };
            });
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));
            const target = (field, row = 'row-1') =>
                page.locator(
                    `[data-grid-part="row"][data-row-id="${row}"] [data-grid-part="cell"][data-col-id="${field}"]`
                );
            const reset = async () => {
                await page.goto('http://127.0.0.1:5197/legacy.html');
                await page.waitForFunction(() => Boolean(window.__legacyGrid));
                await target('team').waitFor();
            };
            const check = async (label, run) => {
                await reset();
                await run();
                checks.push(`${name}: ${label}`);
                console.log(`PASS legacy ${name}: ${label}`);
            };
            await check('older APIs are absent; rows remain in normal flow and selection is centered', async () => {
                assert.equal(await page.evaluate(() => typeof Array.prototype.at), 'undefined');
                const positions = await page
                    .locator('.clip-shell *')
                    .evaluateAll((elements) =>
                        elements
                            .filter((element) => ['absolute', 'fixed'].includes(getComputedStyle(element).position))
                            .map((element) => element.outerHTML)
                    );
                assert.deepEqual(positions, []);
                const checkbox = page.getByRole('checkbox', { name: 'Select all rows', exact: true });
                const centered = await checkbox.evaluate((element) => {
                    const box = element.getBoundingClientRect();
                    const cell = element.closest('[data-grid-part="header-cell"]').getBoundingClientRect();
                    return Math.abs(box.x + box.width / 2 - cell.x - cell.width / 2) < 1;
                });
                assert(centered);
                await checkbox.check();
                await page.waitForFunction(() => window.__legacyGrid.getSelectedRows().length === 100);
                await target('team').click();
                await page.keyboard.press('ArrowLeft');
                await page.waitForFunction(() => window.__legacyGrid.getFocusedCell()?.colId === 'name');
            });
            await check('select portal is anchored, unclipped and does not alter body layout', async () => {
                const before = await page.locator('#after-grid').boundingBox();
                await target('team').dblclick();
                const popup = page.getByRole('listbox', { name: 'Team' });
                await popup.waitFor();
                assert.equal(await popup.getAttribute('data-popup-mode'), 'portal');
                assert.equal(await popup.evaluate((element) => getComputedStyle(element).position), 'fixed');
                const box = await popup.boundingBox();
                const anchor = await target('team').boundingBox();
                assert(Math.abs(box.x - anchor.x) < 2);
                assert(box.y >= anchor.y + anchor.height - 2);
                assert.deepEqual(await page.locator('#after-grid').boundingBox(), before);
                assert.equal(await popup.evaluate((element) => Boolean(element.closest('.clip-shell'))), false);
                await page.getByRole('option', { name: 'Design', exact: true }).click();
                await page.waitForFunction(() => window.__legacyGrid.getSourceRows()[0].team === 'Design');
                assert.equal(await page.locator('[data-popup-portal]').count(), 0);
            });
            await check('resize hover marks the neighbouring header without relational selectors', async () => {
                const handle = page.locator(
                    '[data-grid-part="header-cell"][data-col-id="status"] [data-grid-part="resize-handle"][data-edge="start"]'
                );
                await handle.hover();
                await page.waitForFunction(() =>
                    document
                        .querySelector('[data-grid-part="header-cell"][data-col-id="team"]')
                        ?.hasAttribute('data-resize-hover')
                );
                assert.match(
                    await page
                        .locator(
                            '[data-grid-part="header-cell"][data-col-id="team"] [data-grid-part="resize-handle"][data-edge="end"]'
                        )
                        .evaluate((element) => getComputedStyle(element).backgroundImage),
                    /linear-gradient/
                );
                await page.locator('h1').hover();
                await page.waitForFunction(
                    () =>
                        !document
                            .querySelector('[data-grid-part="header-cell"][data-col-id="team"]')
                            ?.hasAttribute('data-resize-hover')
                );
            });
            await check('keyboard commit, cancellation and active option scrolling', async () => {
                await target('team').dblclick();
                await page.keyboard.press('End');
                await page.keyboard.press('Enter');
                await page.waitForFunction(() => window.__legacyGrid.getSourceRows()[0].team === 'Operations');
                await target('team').dblclick();
                await page.keyboard.press('Home');
                await page.keyboard.press('Escape');
                assert.equal(await page.evaluate(() => window.__legacyGrid.getSourceRows()[0].team), 'Operations');
                assert.equal(await page.locator('[data-popup-portal]').count(), 0);
            });
            await check('theme and live brand tokens reach the portal', async () => {
                await target('team').dblclick();
                await page.evaluate(() => document.getElementById('app').classList.add('brand-red'));
                await page.waitForFunction(
                    () =>
                        getComputedStyle(document.querySelector('[data-popup-portal]'))
                            .getPropertyValue('--the-grid-accent')
                            .trim() === '#b91c1c'
                );
                const fonts = await page.evaluate(() => {
                    const owner = getComputedStyle(document.querySelector('.clip-shell [data-grid-part="root"]'));
                    const portal = getComputedStyle(document.querySelector('[data-popup-portal]'));
                    return {
                        owner: [owner.fontFamily, owner.fontSize, owner.letterSpacing],
                        portal: [portal.fontFamily, portal.fontSize, portal.letterSpacing],
                    };
                });
                assert.deepEqual(
                    fonts.portal,
                    fonts.owner,
                    'Portal text must retain the owning grid’s inherited typography'
                );
                await page.getByRole('button', { name: 'Change theme' }).click();
                await target('team').dblclick();
                await page.waitForFunction(
                    () => document.querySelector('[data-popup-portal]')?.getAttribute('data-color-scheme') === 'dark'
                );
                assert.equal(
                    await page.getByRole('listbox').evaluate((element) => getComputedStyle(element).backgroundColor),
                    'rgb(24, 24, 27)'
                );
            });
            await check('menus, column chooser and text filter remain interactive', async () => {
                await page.getByRole('button', { name: 'Name column menu', exact: true }).click();
                await page.getByRole('menu').waitFor();
                await page.keyboard.press('ArrowDown');
                await page.keyboard.press('Escape');
                await page.getByRole('button', { name: 'Choose columns', exact: true }).click();
                const chooser = page.getByRole('dialog', { name: 'Choose columns' });
                await chooser.getByRole('checkbox', { name: 'Status', exact: true }).uncheck();
                await page.waitForFunction(
                    () => !window.__legacyGrid.getDisplayedColumns().some((column) => column.colId === 'status')
                );
                await page.keyboard.press('Escape');
                await page.getByRole('button', { name: 'Filter Name', exact: true }).click();
                const filter = page.getByRole('dialog', { name: 'Filter Name' });
                await filter.locator('[data-grid-part="filter-input"]').fill('Person 10');
                await page.waitForFunction(() => Object.keys(window.__legacyGrid.getFilterModel()).includes('name'));
                await page.keyboard.press('Escape');
                assert.equal(await page.locator('[data-popup-portal]').count(), 0);
            });
            await check('popup textarea, numeric editor and full-width groups work', async () => {
                await page.evaluate(() =>
                    window.__legacyGrid.geometry.ensureCellVisible({ rowId: 'row-1', colId: 'notes' })
                );
                await target('notes').dblclick();
                const input = page.locator('[data-popup-portal] textarea');
                await input.fill('Legacy popup edit');
                await page.keyboard.press('Tab');
                // Multiline editor uses Tab to commit; Enter remains a newline.
                await page.waitForFunction(() => window.__legacyGrid.getSourceRows()[0].notes === 'Legacy popup edit');
                await page.evaluate(() =>
                    window.__legacyGrid.geometry.ensureCellVisible({ rowId: 'row-1', colId: 'budget' })
                );
                await target('budget').dblclick();
                await target('budget').locator('input').fill('1500.25');
                await page.keyboard.press('Enter');
                await page.waitForFunction(() => window.__legacyGrid.getSourceRows()[0].budget === 1500.25);
                await page.getByRole('button', { name: 'Group by team' }).click();
                const group = page.locator('[data-grid-part="row"][data-row-kind="group"]').first();
                assert.equal(await group.getAttribute('data-full-width'), 'true');
                const shadow = await group.evaluate((element) => getComputedStyle(element).boxShadow);
                assert.notEqual(shadow, 'none');
            });
            await check('portal follows page scroll, clamps on resize, and cleans up outside clicks', async () => {
                await target('team').dblclick();
                await page.evaluate(() => window.scrollTo(0, 80));
                const popup = page.getByRole('listbox');
                const anchor = await target('team').boundingBox();
                const box = await popup.boundingBox();
                assert(Math.abs(box.y - (anchor.y + anchor.height)) < 2);
                await page.setViewportSize({ width: 500, height: 700 });
                await page.waitForFunction(() => {
                    const box = document.querySelector('[role="listbox"]').getBoundingClientRect();
                    return box.right <= innerWidth - 7 && box.left >= 7;
                });
                await page.getByRole('button', { name: 'Outside control', exact: true }).click();
                await popup.waitFor({ state: 'detached' });
                assert.equal(await page.locator('[data-popup-portal]').count(), 0);
            });
            await check('unmounting an open popup removes its body portal', async () => {
                await target('team').dblclick();
                await page.getByRole('listbox').waitFor();
                await page.evaluate(() => window.__legacyRoot.unmount());
                assert.equal(await page.locator('[data-popup-portal]').count(), 0);
            });
            assert.deepEqual(errors, [], 'Legacy fixture must not emit browser errors');
            const artifacts = join(
                process.env.GRID_BROWSER_ARTIFACTS ?? join(root, 'playground/results'),
                'legacy',
                name
            );
            mkdirSync(artifacts, { recursive: true });
            await reset();
            await target('team').dblclick();
            await page.screenshot({ path: join(artifacts, 'legacy-select.png') });
        } finally {
            await browser.close();
        }
    }
    console.log(
        `Verified ${checks.length} legacy fallback checks across ${names.length} engines. Historical browser releases are not emulated by these tests.`
    );
} finally {
    await server?.httpServer.close();
    rmSync(outDir, { recursive: true, force: true });
}
