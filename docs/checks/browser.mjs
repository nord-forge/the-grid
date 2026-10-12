import { chromium } from 'playwright';

import { decodePng } from '../../playground/checks/png.mjs';

import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

// Playwright owns an isolated, headless Chromium profile. No personal browser is used.
const base = process.argv.find((arg) => arg.startsWith('--url='))?.slice(6) ?? 'http://127.0.0.1:4321';
const artifacts = '/private/tmp/the-grid-browser-review';
mkdirSync(artifacts, { recursive: true });
const checks = [];
const errors = [];
const browser = await chromium.launch({ headless: true });

async function check(name, run) {
    await run();
    checks.push(name);
    console.log(`PASS ${name}`);
}

const cell = (page, column, row = 'person-1') =>
    page.locator(`[data-grid-part="row"][data-row-id="${row}"] [data-grid-part="cell"][data-col-id="${column}"]`);
async function open(page, route = 'examples/') {
    const response = await page.goto(new URL(route, `${base.replace(/\/$/, '')}/`).href);
    assert.equal(response.status(), 200);
    await cell(page, 'team').waitFor();
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
    page.on('pageerror', (error) => errors.push(error.message));

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
    await check('no select indicators are rendered in display cells', async () => {
        assert.equal(await page.locator('.demo-select-icon, .demo-choice-arrow').count(), 0);
        assert.equal(await cell(page, 'team').locator('svg').count(), 0);
    });

    await check('double-click immediately opens choices by default and can be disabled', async () => {
        const toggle = page.getByRole('checkbox', { name: 'Open dropdown on double-click' });
        assert.equal(await toggle.isChecked(), true);
        for (const column of ['team', 'status']) {
            await cell(page, column).dblclick();
            const select = cell(page, column).locator('select');
            await select.waitFor();
            assert.equal(await select.evaluate((element) => element.matches(':open')), true);
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            await select.waitFor({ state: 'detached' });
        }
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await toggle.uncheck();
        await cell(page, 'team').dblclick();
        const input = cell(page, 'team').locator('select');
        await input.waitFor();
        assert.equal(await input.evaluate((element) => element.matches(':open')), false);
        await input.press('Escape');
        await toggle.check();
        await cell(page, 'team').click();
        await page.keyboard.press('F2');
        const keyboardSelect = cell(page, 'team').locator('select');
        await keyboardSelect.waitFor();
        assert.equal(await keyboardSelect.evaluate((element) => element.matches(':open')), false);
        await keyboardSelect.press('Escape');
    });

    await check('Team and Status dropdowns save choices and close', async () => {
        await (await edit(page, 'team')).selectOption('Design');
        await cell(page, 'team').locator('select').waitFor({ state: 'detached' });
        assert.equal((await cell(page, 'team').textContent()).trim(), 'Design');
        await (await edit(page, 'status')).selectOption('On leave');
        await cell(page, 'status').locator('select').waitFor({ state: 'detached' });
        assert.match(await cell(page, 'status').textContent(), /On leave/);
        assert.match(await page.locator('.demo-footer').textContent(), /2\s+changes/);
        assert.equal(await page.locator('.demo-select-icon').count(), 0);
    });

    await check('numeric budget editing, validation, and Escape work', async () => {
        let input = await edit(page, 'budget');
        assert.equal(await input.inputValue(), '1,200.00');
        assert.equal(await input.evaluate((element) => getComputedStyle(element).textAlign), 'right');
        assert.equal(await cell(page, 'budget').locator('.demo-budget-symbol').textContent(), '€');
        const symbolBox = await cell(page, 'budget').locator('.demo-budget-symbol').boundingBox();
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
        const picker = page.locator('.demo-toolbar label').filter({ hasText: 'Select icon' }).locator('select');
        await picker.selectOption('caret');
        await edit(page, 'team');
        assert.equal(await page.locator('[data-grid-editor] .demo-select-icon svg[fill="currentColor"]').count(), 1);
        const box = await page.locator('.demo-select-icon svg').boundingBox();
        assert(box.width >= 16 && box.height >= 16);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.demo-select-icon').count(), 0);
        await picker.selectOption('none');
        await edit(page, 'team');
        assert.equal(await page.locator('.demo-select-icon').count(), 0);
        await page.keyboard.press('Escape');
        await picker.selectOption('chevron');
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
            isMobile: true,
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
        await mobileContext.close();
    });
    assert.deepEqual(errors, [], 'Browser runtime errors');
    console.log(`Verified ${checks.length} browser checks. Screenshots: ${artifacts}`);
} finally {
    writeFileSync(`${artifacts}/checks.json`, JSON.stringify({ base, checks, errors }, null, 2));
    await browser.close();
}
