import { chromium, firefox, webkit } from 'playwright';

import { decodePng } from '../../playground/checks/png.mjs';

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Playwright owns isolated, headless test profiles. No personal browser is used.
const base = process.argv.find((arg) => arg.startsWith('--url='))?.slice(6) ?? 'http://127.0.0.1:4321';
const browserName = process.argv.find((arg) => arg.startsWith('--browser='))?.slice(10) ?? 'chromium';
if (browserName === 'all') {
    for (const name of ['chromium', 'firefox', 'webkit']) {
        execFileSync(
            process.execPath,
            [
                fileURLToPath(import.meta.url),
                ...process.argv.slice(2).filter((arg) => !arg.startsWith('--browser=')),
                `--browser=${name}`,
            ],
            { stdio: 'inherit' }
        );
    }
    process.exit(0);
}
const artifacts = `/private/tmp/the-grid-browser-review/${browserName}`;
mkdirSync(artifacts, { recursive: true });
const checks = [];
const errors = [];
const browser = await { chromium, firefox, webkit }[browserName].launch({ headless: true });

async function check(name, run) {
    await run();
    checks.push(name);
    console.log(`PASS ${name}`);
}

const cell = (page, column, row = 'person-1') =>
    page.locator(`[data-grid-part="row"][data-row-id="${row}"] [data-grid-part="cell"][data-col-id="${column}"]`);
async function open(page, route = 'examples/') {
    const response = await page.goto(new URL(route, `${base.replace(/\/$/, '')}/`).href);
    assert([200, 304].includes(response.status()), `Unexpected HTTP ${response.status()}`);
    // Starlight initializes search during an idle callback after load. Let that import finish before
    // a test navigates again, so navigation cannot cancel it and produce a teardown rejection.
    await page.locator('site-search .pagefind-ui__search-input').waitFor({ state: 'attached' });
    if (route === 'guides/editing/') await page.getByRole('grid', { name: 'Built-in editors example' }).waitFor();
    else await cell(page, 'team').waitFor();
}

async function settings(page, expanded) {
    const button = page.getByRole('button', { name: 'Demo settings', exact: true });
    if (((await button.getAttribute('aria-expanded')) === 'true') !== expanded) await button.click();
}

async function edit(page, column, row = 'person-1') {
    const target = cell(page, column, row);
    if (column === 'team' || column === 'status') {
        // Keyboard entry leaves the native picker closed for direct option/icon/border assertions.
        await target.click();
        await page.keyboard.press('F2');
    } else {
        await target.dblclick();
    }
    await target.locator('[data-grid-part="editor-input"]').waitFor();
    const input = target.locator('[data-grid-part="editor-input"]');
    return input;
}

async function editingBorders(page, row, column, theme) {
    const target = cell(page, column, row);
    const before = await target.boundingBox();
    await edit(page, column, row);
    const geometry = await target.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const editor = element.querySelector('[data-grid-editor]').getBoundingClientRect();
        const first =
            Boolean(element.closest('[data-first-row]')) &&
            !element.closest('[data-grid-part="root"]').hasAttribute('data-scrolled-top');
        return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            editor: { x: editor.x, y: editor.y, right: editor.right, bottom: editor.bottom },
            sectionStart: element.hasAttribute('data-section-start'),
            first,
            color: getComputedStyle(element).getPropertyValue('--the-grid-editing-outline-color').trim(),
        };
    });
    assert.equal(geometry.height, before.height, 'Editing must not change row height');
    assert.equal(geometry.width, before.width, 'Editing must not change column width');
    if (geometry.sectionStart) assert(geometry.editor.x >= geometry.x + 0.99, 'Editor covers the inset left ring');
    if (geometry.first) assert(geometry.editor.y >= geometry.y + 0.99, 'Editor covers the inset top ring');
    assert(geometry.editor.right <= geometry.x + geometry.width - 0.99, 'Editor covers right ring');
    assert(geometry.editor.bottom <= geometry.y + geometry.height - 0.99, 'Editor covers bottom ring');

    const clip = {
        x: Math.floor(geometry.x) - 3,
        y: Math.floor(geometry.y) - 3,
        width: Math.ceil(geometry.width) + 6,
        height: Math.ceil(geometry.height) + 6,
    };
    const png = await page.screenshot({ clip });
    const image = decodePng(png);
    const scale = image.width / clip.width;
    const ring = geometry.color.startsWith('#')
        ? geometry.color
              .slice(1)
              .match(/../g)
              .map((hex) => parseInt(hex, 16))
        : geometry.color
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number);
    const matches = (pixel) => pixel.every((value, index) => Math.abs(value - ring[index]) <= 30);
    const hasRing = (x, y) => {
        const px = Math.floor((x - clip.x) * scale),
            py = Math.floor((y - clip.y) * scale);
        return [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => matches(image.pixel(px + dx, py + dy))));
    };
    const left = geometry.x + (geometry.sectionStart ? 0.5 : -0.5);
    const right = geometry.x + geometry.width - 0.5;
    const top = geometry.y + (geometry.first ? 0.5 : -0.5);
    const bottom = geometry.y + geometry.height - 0.5;
    for (const fraction of [0.2, 0.5, 0.8]) {
        assert(
            hasRing(left, geometry.y + geometry.height * fraction),
            `Missing left border: ${theme}/${row}/${column}`
        );
        assert(
            hasRing(right, geometry.y + geometry.height * fraction),
            `Missing right border: ${theme}/${row}/${column}`
        );
        assert(hasRing(geometry.x + geometry.width * fraction, top), `Missing top border: ${theme}/${row}/${column}`);
        assert(
            hasRing(geometry.x + geometry.width * fraction, bottom),
            `Missing bottom border: ${theme}/${row}/${column}`
        );
    }
    writeFileSync(`${artifacts}/editing-${theme}-${row}-${column}.png`, png);
    await page.keyboard.press('Escape');
}

try {
    const context = await browser.newContext({
        viewport: { width: 1890, height: 1100 },
        colorScheme: 'dark',
        deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => {
        errors.push(error.message);
        console.error(`Page error on ${page.url()}: ${error.message}`);
    });
    page.on('requestfailed', (request) =>
        console.error(`Request failed on ${page.url()}: ${request.url()} ${request.failure()?.errorText}`)
    );

    await check('custom theme menu saves choices, supports keyboard navigation and follows the system', async () => {
        await open(page, '');
        const picker = page.locator('grid-theme-select').first();
        const trigger = picker.locator('.theme-trigger');
        const menu = picker.getByRole('menu');
        assert.equal(await picker.locator('select').count(), 0);
        assert.equal((await trigger.textContent()).trim(), 'Auto');
        await trigger.click();
        await menu.waitFor();
        assert.equal(
            await picker.getByRole('menuitemradio', { name: 'Auto', exact: true }).getAttribute('aria-checked'),
            'true'
        );
        await picker.getByRole('menuitemradio', { name: 'Light', exact: true }).click();
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
        assert.equal(await page.evaluate(() => localStorage.getItem('starlight-theme')), 'light');
        assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
        await open(page);
        assert.equal(
            (await page.locator('grid-theme-select').first().locator('.theme-trigger').textContent()).trim(),
            'Light'
        );
        await trigger.press('ArrowDown');
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
        assert.equal(await page.evaluate(() => localStorage.getItem('starlight-theme')), '');
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
        await trigger.click();
        await page.keyboard.press('Home');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
        await trigger.click();
        await page.keyboard.press('l');
        assert.equal(
            await picker
                .getByRole('menuitemradio', { name: 'Light', exact: true })
                .evaluate((element) => element === document.activeElement),
            true
        );
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
        assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
        await trigger.click();
        await page.keyboard.press('Tab');
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
        assert.equal(await menu.isVisible(), false);
        await trigger.click();
        await picker.getByRole('menuitemradio', { name: 'Auto', exact: true }).click();
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
        await trigger.click();
        await page.screenshot({ path: `${artifacts}/custom-theme-menu.png` });
        await page.locator('h1').first().click();
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    });

    await check('desktop title is one line at the supplied width', async () => {
        await open(page, '');
        const title = await page.locator('.hero h1').evaluate((element) => ({
            height: element.getBoundingClientRect().height,
            lineHeight: parseFloat(getComputedStyle(element).lineHeight),
        }));
        assert(title.height <= title.lineHeight + 1);
        await page.screenshot({ path: `${artifacts}/desktop-home.png` });
    });

    await open(page);
    await check('main demo starts with a compact toolbar and no upload or settings clutter', async () => {
        assert.equal(await page.locator('.demo-toolbar select').count(), 0);
        assert.equal(await page.locator('[data-grid-part="upload-panel"]').count(), 0);
        assert.equal(await page.locator('.demo-settings').count(), 0);
        assert.equal(await page.locator('[data-grid-part="header-menu-button"]').count(), 0);
        const viewport = page.locator('.grid-demo [data-grid-part="viewport"]');
        const overflow = await viewport.evaluate((element) => ({
            width: element.clientWidth,
            scroll: element.scrollWidth,
        }));
        assert(overflow.scroll <= overflow.width + 1, 'Desktop demo must fit all columns');
        const toolbar = await page.locator('.demo-toolbar').boundingBox();
        assert(toolbar.height < 80, 'Desktop toolbar must stay on one line');
        await page.locator('.demo-toolbar').hover();
        const filter = page.getByRole('button', { name: 'Filter Team', exact: true });
        assert.equal(await filter.evaluate((element) => getComputedStyle(element).opacity), '0');
        await page.locator('[data-grid-part="header-cell"][data-col-id="team"]').hover();
        assert.equal(await filter.evaluate((element) => getComputedStyle(element).opacity), '1');
        await page.locator('.demo-toolbar').hover();
        await filter.focus();
        assert.equal(await filter.evaluate((element) => getComputedStyle(element).opacity), '1');
        await cell(page, 'name').click();
        await page.locator('.grid-demo').screenshot({ path: `${artifacts}/clean-demo.png` });
    });

    await check('no select indicators are rendered in display cells', async () => {
        assert.equal(await page.locator("[data-grid-part='select-icon'], .demo-choice-arrow").count(), 0);
        assert.equal(await cell(page, 'team').locator('svg').count(), 0);
    });

    await check('double-click immediately opens choices by default and can be disabled', async () => {
        await settings(page, true);
        const toggle = page.getByRole('checkbox', { name: 'Open dropdown on double-click' });
        assert.equal(await toggle.isChecked(), true);
        for (const column of ['team', 'status']) {
            await cell(page, column).dblclick();
            const select = cell(page, column).getByRole('combobox');
            await select.waitFor();
            assert.equal(await select.getAttribute('aria-expanded'), 'true');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            await select.waitFor({ state: 'detached' });
        }
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await toggle.uncheck();
        await cell(page, 'team').dblclick();
        const input = cell(page, 'team').getByRole('combobox');
        await input.waitFor();
        assert.equal(await input.getAttribute('aria-expanded'), 'false');
        await input.press('Escape');
        await toggle.check();
        await cell(page, 'team').click();
        await page.keyboard.press('F2');
        const keyboardSelect = cell(page, 'team').getByRole('combobox');
        await keyboardSelect.waitFor();
        assert.equal(await keyboardSelect.getAttribute('aria-expanded'), 'false');
        await keyboardSelect.press('Escape');
        await settings(page, false);
    });

    await check('Team and Status dropdowns save choices and close', async () => {
        const teamEditor = await edit(page, 'team');
        await teamEditor.click();
        await page.getByRole('option', { name: 'Design', exact: true }).click();
        await cell(page, 'team').getByRole('combobox').waitFor({ state: 'detached' });
        assert.equal((await cell(page, 'team').textContent()).trim(), 'Design');
        await (await edit(page, 'status')).click();
        await page.getByRole('option', { name: 'On leave', exact: true }).click();
        await cell(page, 'status').getByRole('combobox').waitFor({ state: 'detached' });
        assert.match(await cell(page, 'status').textContent(), /On leave/);
        assert.match(await page.locator('.demo-footer').textContent(), /2\s+changes/);
        assert.equal(await page.locator("[data-grid-part='select-icon']").count(), 0);
    });

    await check('numeric budget editing, validation, and Escape work', async () => {
        let input = await edit(page, 'budget');
        assert.equal(await input.inputValue(), '1,200.00');
        assert.equal(await input.evaluate((element) => getComputedStyle(element).textAlign), 'right');
        assert.equal(await cell(page, 'budget').locator('[data-grid-part="number-prefix"]').textContent(), '€');
        const symbolBox = await cell(page, 'budget').locator('[data-grid-part="number-prefix"]').boundingBox();
        const inputBox = await input.boundingBox();
        assert(Math.abs(symbolBox.x + symbolBox.width - inputBox.x) <= 1, 'Euro sign must stay next to the amount');
        await input.press('Enter');
        assert.equal((await cell(page, 'budget').textContent()).trim(), '€1,200.00');
        input = await edit(page, 'budget');
        await input.fill('2500.75');
        await input.press('Enter');
        await cell(page, 'budget').locator('input').waitFor({ state: 'detached' });
        assert.equal((await cell(page, 'budget').textContent()).trim(), '€2,500.75');
        input = await edit(page, 'budget');
        assert.equal(await input.inputValue(), '2,500.75');
        await input.fill('-10');
        await input.press('Enter');
        await cell(page, 'budget').getByRole('alert').waitFor();
        assert.equal(await input.getAttribute('aria-invalid'), 'true');
        await input.press('Escape');
        assert.equal((await cell(page, 'budget').textContent()).trim(), '€2,500.75');
    });

    await check('select glyph can be replaced or hidden and stays inside the editor', async () => {
        await settings(page, true);
        const picker = page.locator('.demo-settings label').filter({ hasText: 'Select icon' }).locator('select');
        await picker.selectOption('caret');
        await edit(page, 'team');
        assert.equal(
            await page.locator('[data-grid-editor] [data-grid-part=\'select-icon\'] svg[fill="currentColor"]').count(),
            1
        );
        const box = await page.locator("[data-grid-part='select-icon'] svg").boundingBox();
        assert(box.width >= 16 && box.height >= 16);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator("[data-grid-part='select-icon']").count(), 0);
        await picker.selectOption('none');
        await edit(page, 'team');
        assert.equal(await page.locator("[data-grid-part='select-icon']").count(), 0);
        await page.keyboard.press('Escape');
        await picker.selectOption('chevron');
        await settings(page, false);
    });

    await check('quick filter, grouping, selection, and reset work', async () => {
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await page.getByRole('textbox', { name: 'Search demo rows' }).fill('Alex Morgan');
        await cell(page, 'name').getByText('Alex Morgan', { exact: true }).waitFor();
        assert.match(await page.locator('[data-grid-part="body"]').textContent(), /Alex Morgan/);
        assert(!/Sam Chen/.test(await page.locator('[data-grid-part="body"]').textContent()));
        await page.getByRole('checkbox', { name: 'Select all rows', exact: true }).check();
        assert.match(await page.locator('.demo-footer').textContent(), /84\s+selected/);
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await page.getByRole('button', { name: 'Group by team', exact: true }).click();
        await page.locator('[data-row-kind="group"]').first().waitFor();
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        assert.equal(await page.locator('[data-row-kind="group"]').count(), 0);
        assert.match(await page.locator('.demo-footer').textContent(), /0\s+changes/);
    });

    await check('header checkbox is centered and truncated group labels expose full titles', async () => {
        const centered = async () => {
            const header = page.getByRole('checkbox', { name: 'Select all rows', exact: true });
            const box = await header.boundingBox();
            const container = await header.locator('xpath=ancestor::*[@data-grid-part="header-cell"]').boundingBox();
            const rowBox = await page.getByRole('checkbox', { name: 'Select row', exact: true }).first().boundingBox();
            assert(
                Math.abs(box.x + box.width / 2 - container.x - container.width / 2) <= 1,
                'Header checkbox must be horizontally centered'
            );
            assert(
                Math.abs(box.y + box.height / 2 - container.y - container.height / 2) <= 1,
                'Header checkbox must be vertically centered'
            );
            assert(
                Math.abs(box.x + box.width / 2 - rowBox.x - rowBox.width / 2) <= 1,
                'Header and row checkboxes must align'
            );
        };
        await centered();
        const header = page.getByRole('checkbox', { name: 'Select all rows', exact: true });
        await header.check();
        await centered();
        await header.uncheck();
        assert.equal(
            await cell(page, 'name').locator('[data-grid-part="cell-value"]').getAttribute('title'),
            'Alex Morgan'
        );
        assert.equal(
            await page
                .locator('[data-grid-part="header-cell"][data-col-id="name"] [data-grid-part="header-label"]')
                .getAttribute('title'),
            'Name'
        );
        await page.getByRole('button', { name: 'Group by team', exact: true }).click();
        const label = page.locator('[data-row-kind="group"] [data-grid-part="row-group-label"]').first();
        await label.waitFor();
        await centered();
        const resize = page.locator(
            '[data-grid-part="header-cell"][data-col-id="__group__"] [data-grid-part="resize-handle"][data-edge="end"]'
        );
        const grip = await resize.boundingBox();
        await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
        await page.mouse.down();
        await page.mouse.move(grip.x + grip.width / 2 - 120, grip.y + grip.height / 2, { steps: 6 });
        await page.mouse.up();
        const dimensions = await label.evaluate((element) => ({
            width: element.clientWidth,
            text: element.scrollWidth,
        }));
        assert(dimensions.text > dimensions.width, 'Group label must really be truncated for this check');
        await label.hover();
        assert.equal(await label.getAttribute('title'), 'Engineering');
        await centered();
        await settings(page, true);
        await page
            .locator('.demo-settings label')
            .filter({ hasText: 'Density' })
            .locator('select')
            .selectOption('compact');
        await centered();
        await page
            .locator('.demo-settings label')
            .filter({ hasText: 'Density' })
            .locator('select')
            .selectOption('comfortable');
        await settings(page, false);
        await page.locator('.grid-demo').screenshot({ path: `${artifacts}/group-label-title.png` });
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
    });

    await check('select keyboard navigation, typeahead, Tab and Escape preserve focus and values', async () => {
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        let trigger = await edit(page, 'team');
        await trigger.press('Home');
        assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
        await trigger.press('ArrowDown');
        await trigger.press('End');
        const active = await trigger.getAttribute('aria-activedescendant');
        assert(active && (await page.locator(`[id="${active}"]`).getAttribute('aria-selected')) === 'true');
        await trigger.press('Tab');
        assert.equal((await cell(page, 'team').textContent()).trim(), 'Product');
        assert.equal(
            await cell(page, 'role')
                .locator('input')
                .evaluate((element) => element === document.activeElement),
            true
        );
        await page.keyboard.press('Escape');
        trigger = await edit(page, 'team');
        await trigger.press('d');
        await trigger.press('Enter');
        assert.equal((await cell(page, 'team').textContent()).trim(), 'Design');
        assert.equal(
            await page
                .getByRole('grid', { name: 'People example' })
                .evaluate((element) => element === document.activeElement),
            true
        );
        trigger = await edit(page, 'team');
        await trigger.press('ArrowDown');
        await trigger.press('End');
        await trigger.press('Escape');
        assert.equal((await cell(page, 'team').textContent()).trim(), 'Design');
        await cell(page, 'name').click();
        await page.keyboard.type('X');
        const text = cell(page, 'name').locator('input');
        await text.waitFor();
        assert.equal(await text.inputValue(), 'X');
        await text.press('Escape');
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
    });

    await check('typeahead includes the key that starts editing', async () => {
        await cell(page, 'team').click();
        await page.keyboard.type('De');
        const trigger = cell(page, 'team').getByRole('combobox');
        const active = await trigger.getAttribute('aria-activedescendant');
        assert.equal(await page.locator(`[id="${active}"]`).textContent(), 'Design');
        await trigger.press('Enter');
        assert.equal((await cell(page, 'team').textContent()).trim(), 'Design');
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
    });

    await check('dropdown flips above cells near the viewport bottom and stays inside its edges', async () => {
        await page.setViewportSize({ width: 800, height: 480 });
        const target = cell(page, 'team');
        await target.scrollIntoViewIfNeeded();
        await target.evaluate((element) =>
            window.scrollBy(0, element.getBoundingClientRect().bottom - (window.innerHeight - 12))
        );
        await target.dblclick();
        const popup = page.getByRole('listbox', { name: 'Team', exact: true });
        await popup.waitFor();
        const rect = await popup.boundingBox(),
            anchor = await target.boundingBox();
        assert(rect.y + rect.height <= anchor.y + 1, 'Popup must flip above its anchor');
        assert(
            rect.x >= 7 && rect.y >= 7 && rect.x + rect.width <= 793 && rect.y + rect.height <= 473,
            'Popup must fit the viewport'
        );
        await page.screenshot({ path: `${artifacts}/dropdown-above.png` });
        await page.setViewportSize({ width: 700, height: 400 });
        const resized = await popup.boundingBox();
        assert(
            resized.x >= 7 && resized.y >= 7 && resized.x + resized.width <= 693 && resized.y + resized.height <= 393,
            'Popup must stay within a resized viewport'
        );
        await page.keyboard.press('Escape');
        await page.setViewportSize({ width: 1890, height: 1100 });
    });

    await check('file picker uploads grid, row and cell attachments with progress and errors', async () => {
        await open(page, 'guides/uploads/');
        const target = page.getByRole('combobox', { name: 'Upload target' });
        const input = page.locator('[data-grid-part="upload-input"]');
        const activity = (name) => page.locator('[data-grid-part="upload-item"]').filter({ hasText: name });
        const chooserPromise = page.waitForEvent('filechooser');
        await page.getByRole('button', { name: 'Choose files', exact: true }).click();
        await (
            await chooserPromise
        ).setFiles({ name: 'grid.txt', mimeType: 'text/plain', buffer: Buffer.from('Grid attachment') });
        await page.getByRole('progressbar', { name: 'Upload progress for grid.txt' }).waitFor();
        await activity('grid.txt').getByText('uploaded', { exact: true }).waitFor();
        assert.match(await activity('grid.txt').textContent(), /grid\.txt · grid/);
        await cell(page, 'name').click();
        await target.selectOption('row');
        await input.setInputFiles({ name: 'row.txt', mimeType: 'text/plain', buffer: Buffer.from('Row attachment') });
        await activity('row.txt').getByText('uploaded', { exact: true }).waitFor();
        assert.match(await activity('row.txt').textContent(), /row person-1/);
        await target.selectOption('cell');
        await input.setInputFiles({ name: 'cell.txt', mimeType: 'text/plain', buffer: Buffer.from('Cell attachment') });
        await activity('cell.txt').getByText('uploaded', { exact: true }).waitFor();
        assert.match(await activity('cell.txt').textContent(), /cell person-1.*name/);
        await input.setInputFiles({
            name: 'bad.exe',
            mimeType: 'application/octet-stream',
            buffer: Buffer.from('bad'),
        });
        await activity('bad.exe').getByText('This file type is not accepted.', { exact: true }).waitFor();
        await input.setInputFiles({ name: 'fail.txt', mimeType: 'text/plain', buffer: Buffer.from('failure') });
        await activity('fail.txt')
            .getByText(/Demo upload failed/)
            .waitFor();
        await input.setInputFiles({ name: 'cancel.txt', mimeType: 'text/plain', buffer: Buffer.from('cancel') });
        await page.getByRole('button', { name: 'Cancel upload cancel.txt', exact: true }).click();
        await activity('cancel.txt').getByText('cancelled', { exact: true }).waitFor();
        await page.screenshot({ path: `${artifacts}/upload-activity.png` });
        await page.getByRole('button', { name: 'Clear finished uploads', exact: true }).click();
        assert.equal(await page.locator('[data-grid-part="upload-item"]').count(), 0);
    });

    await check('file drops route to the configured cell, row or grid', async () => {
        await page.locator('.demo-upload-settings summary').click();
        const scope = page.locator('.demo-upload-settings label').filter({ hasText: 'Drop scope' }).locator('select');
        for (const level of ['cell', 'row', 'grid']) {
            await scope.selectOption(level);
            await cell(page, 'name').evaluate((element, level) => {
                const transfer = new DataTransfer();
                transfer.items.add(new File(['drop'], `${level}-drop.txt`, { type: 'text/plain' }));
                element.dispatchEvent(
                    new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer })
                );
            }, level);
            // React renders the highlight after the event; inspect it from Playwright.
            await page.locator('[data-upload-target]').waitFor();
            await cell(page, 'name').evaluate((element, level) => {
                const transfer = new DataTransfer();
                transfer.items.add(new File(['drop'], `${level}-drop.txt`, { type: 'text/plain' }));
                element.dispatchEvent(
                    new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer })
                );
            }, level);
            const activity = page.locator('[data-grid-part="upload-item"]').filter({ hasText: `${level}-drop.txt` });
            await activity.getByText('uploaded', { exact: true }).waitFor();
            assert.match(await activity.textContent(), new RegExp(`${level}-drop\\.txt · ${level}`));
            if (level === 'cell') assert.match(await activity.textContent(), /person-1.*name/);
            if (level === 'row') assert.match(await activity.textContent(), /row person-1/);
        }
        await scope.selectOption('cell');
        await page.getByRole('button', { name: 'Clear finished uploads', exact: true }).click();
    });

    await check('built-in number, locale currency and disabled numeric choices work in Strict Mode', async () => {
        await open(page, 'guides/editing/');
        const grid = page.getByRole('grid', { name: 'Built-in editors example', exact: true });
        const item = (column) => grid.locator(`[data-col-id="${column}"][data-grid-part="cell"]`);
        await item('cost').dblclick();
        await item('cost').locator('input').press('Enter');
        assert.equal(await item('cost').locator('input').count(), 0, 'Unchanged German currency must commit');
        assert.match(await item('cost').textContent(), /1\.234,50/);
        await item('quantity').dblclick();
        let input = item('quantity').locator('input');
        await input.fill('12.5');
        await input.press('Enter');
        await item('quantity').getByRole('alert').waitFor();
        assert.equal(await input.getAttribute('aria-invalid'), 'true');
        const description = await input.getAttribute('aria-describedby');
        assert(description);
        assert.match(await page.locator(`[id="${description}"]`).textContent(), /decimal/);
        await input.fill('101');
        await input.press('Enter');
        assert.match(await item('quantity').getByRole('alert').textContent(), /100/);
        await input.fill('15');
        await input.press('Tab');
        input = item('cost').locator('input');
        await input.waitFor();
        assert.equal(await input.inputValue(), '1.234,50');
        assert.equal((await item('cost').locator('[data-grid-part="number-suffix"]').textContent()).trim(), '€');
        await input.fill('2.500,75');
        await input.press('Tab');
        const trigger = item('tier').getByRole('combobox');
        await trigger.waitFor();
        await trigger.press('ArrowDown');
        await trigger.press('End');
        const active = await trigger.getAttribute('aria-activedescendant');
        assert.equal(await page.locator(`[id="${active}"]`).textContent(), 'Pro');
        assert.equal(await page.getByRole('option', { name: 'Enterprise', exact: true }).isDisabled(), true);
        await trigger.press('Enter');
        assert.equal((await item('tier').textContent()).trim(), 'Pro');
        assert.equal((await item('quantity').textContent()).trim(), '15');
        assert.equal((await item('cost').textContent()).trim(), '2.500,75 €');
        assert.equal(await grid.evaluate((element) => element === document.activeElement), true);
        await item('quantity').click();
        await page.keyboard.type('50');
        const typed = item('quantity').locator('input');
        await typed.waitFor();
        assert.equal(await typed.inputValue(), '50');
        await typed.press('Escape');
        assert.equal((await item('quantity').textContent()).trim(), '15');
        await open(page);
    });

    await check('named date, date-string, checkbox and multiline editors render and commit', async () => {
        await open(page, 'guides/editing/');
        const grid = page.getByRole('grid', { name: 'Registry editors example', exact: true });
        const item = (column) => grid.locator(`[data-grid-part="cell"][data-col-id="${column}"]`);
        await item('enabled').dblclick();
        await item('enabled').getByRole('checkbox', { name: 'Enabled' }).check();
        await page.keyboard.press('Enter');
        assert.equal((await item('enabled').textContent()).trim(), 'true');
        await item('enabled').dblclick();
        await item('enabled').getByRole('checkbox', { name: 'Enabled' }).press('Space');
        await page.keyboard.press('Escape');
        assert.equal((await item('enabled').textContent()).trim(), 'true');
        for (const column of ['due', 'deadline']) {
            await item(column).dblclick();
            const input = item(column).locator('input[type="date"]');
            await input.fill('2026-11-25');
            await input.press('Enter');
            assert.equal((await item(column).textContent()).trim(), '2026-11-25');
        }
        await item('notes').click();
        await page.keyboard.type('Ab');
        assert.equal(await page.getByRole('textbox', { name: 'Notes', exact: true }).inputValue(), 'Ab');
        await page.keyboard.press('Escape');
        await item('notes').dblclick();
        const textarea = page.getByRole('textbox', { name: 'Notes', exact: true });
        await textarea.fill('First line');
        await textarea.press('End');
        await textarea.press('Enter');
        await textarea.pressSequentially('Second line');
        assert.equal(await textarea.inputValue(), 'First line\nSecond line');
        await textarea.press('Tab');
        assert.equal((await item('notes').textContent()).trim(), 'First line\nSecond line');
        await item('notes').dblclick();
        await page.getByRole('textbox', { name: 'Notes', exact: true }).fill('Discard this');
        await page.keyboard.press('Escape');
        assert.equal((await item('notes').textContent()).trim(), 'First line\nSecond line');
        await grid.screenshot({ path: `${artifacts}/registry-editors.png` });
        await open(page);
    });

    await check('production search returns documentation results', async () => {
        await page.getByRole('button', { name: 'Search the grid docs', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await dialog.locator('input').first().fill('budget');
        await dialog.getByRole('link').first().waitFor({ timeout: 10000 });
        assert((await dialog.getByRole('link').count()) > 0);
        await page.keyboard.press('Escape');
    });

    for (const theme of ['dark', 'light']) {
        const borderContext = await browser.newContext({
            viewport: { width: 1890, height: 1100 },
            colorScheme: theme,
            deviceScaleFactor: 2,
        });
        const borderPage = await borderContext.newPage();
        borderPage.on('pageerror', (error) => errors.push(error.message));
        await open(borderPage);
        await check(`editing preserves every cell border in ${theme} mode`, async () => {
            for (const row of ['person-1', 'person-2']) {
                for (const column of ['team', 'budget']) await editingBorders(borderPage, row, column, theme);
            }
        });
        await borderContext.close();
    }

    await check('narrow mobile title wraps and the page does not overflow horizontally', async () => {
        const mobileContext = await browser.newContext({
            viewport: { width: 320, height: 844 },
            colorScheme: 'dark',
            ...(browserName === 'firefox' ? {} : { isMobile: true }),
            deviceScaleFactor: 1,
        });
        const mobile = await mobileContext.newPage();
        await open(mobile, '');
        const layout = await mobile.evaluate(() => {
            const heading = document.querySelector('.hero h1');
            return {
                width: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
                height: heading.getBoundingClientRect().height,
                lineHeight: parseFloat(getComputedStyle(heading).lineHeight),
            };
        });
        await mobile.screenshot({ path: `${artifacts}/mobile-home.png` });
        assert(layout.scrollWidth <= layout.width + 1, JSON.stringify(layout));
        assert(layout.height > layout.lineHeight + 1, JSON.stringify(layout));
        await open(mobile);
        assert.equal(await mobile.locator('[data-grid-part="upload-panel"]').count(), 0);
        assert.equal(await mobile.locator('.demo-settings').count(), 0);
        assert(
            (await mobile.locator('.demo-toolbar').boundingBox()).height < 135,
            'Mobile toolbar should use only two rows'
        );
        await settings(mobile, true);
        const exampleLayout = await mobile.evaluate(() => ({
            width: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
        }));
        assert(exampleLayout.scroll <= exampleLayout.width + 1, 'Mobile settings must not overflow the page');
        await settings(mobile, false);
        await mobile.locator('.grid-demo').screenshot({ path: `${artifacts}/mobile-demo.png` });
        await mobile.locator('button[popovertarget="starlight__sidebar"]').click();
        const theme = mobile.locator('grid-theme-select .theme-trigger:visible');
        await theme.click();
        const menu = mobile.getByRole('menu', { name: 'Select theme', exact: true });
        const rect = await menu.boundingBox();
        assert(
            rect.x >= 7 && rect.x + rect.width <= 313 && rect.y >= 7 && rect.y + rect.height <= 837,
            'Mobile theme menu must fit the screen'
        );
        await menu.getByRole('menuitemradio', { name: 'Light', exact: true }).click();
        assert.equal(await mobile.locator('html').getAttribute('data-theme'), 'light');
        await mobileContext.close();
    });
    assert.deepEqual(errors, [], 'Browser runtime errors');
    console.log(`Verified ${checks.length} browser checks. Screenshots: ${artifacts}`);
} finally {
    writeFileSync(`${artifacts}/checks.json`, JSON.stringify({ base, checks, errors }, null, 2));
    await browser.close();
}
