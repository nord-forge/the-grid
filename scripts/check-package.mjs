/** Test the actual archive's exports and declarations in an isolated consumer, without registry access. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'the-grid-consumer-'));
try {
    const archive = process.argv[2]
        ? resolve(process.argv[2])
        : join(
              directory,
              JSON.parse(
                  execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', directory], {
                      cwd: root,
                      encoding: 'utf8',
                  })
              )[0].filename
          );
    execFileSync('tar', ['-xzf', archive, '-C', directory]);
    const modules = join(directory, 'node_modules');
    mkdirSync(join(modules, '@nord-forge'), { recursive: true });
    for (const name of ['react', 'react-dom', '@types'])
        symlinkSync(join(root, 'node_modules', name), join(modules, name), 'dir');
    symlinkSync(join(directory, 'package'), join(modules, '@nord-forge', 'the-grid'), 'dir');
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ type: 'module' }));
    writeFileSync(
        join(directory, 'consumer.tsx'),
        `
import { Grid, AttachmentList, type GridAttachment, type GridApi, type GridProps } from '@nord-forge/the-grid';
import { Grid as LegacyGrid, createSelectCellEditor as createLegacySelect } from '@nord-forge/the-grid/legacy';
type Row = { id: string; name: string };
const props: GridProps<Row> = { data: { type: 'local', rows: [], getRowId: row => row.id },
  columns: [{ field: 'name', editable: true }], layout: 'content', contentModeRowLimit: 5 };
const files: GridAttachment[] = [{ id: '1', name: 'test.txt', target: { level: 'grid' } }];
// @ts-expect-error Public props must remain typed through the generated declarations.
const invalid: GridProps<Row> = { ...props, contentModeRowLimit: '5' };
const element = <><Grid {...props} /><AttachmentList attachments={files} onRemove={async file => { file.id; }} /></>;
const legacyElement = <LegacyGrid {...props} columns={[{field:'name',cellEditor:createLegacySelect({values:['Alex']})}]} />;
async function retry(api: GridApi<Row>) { const task = await api.retryUpload('upload-1'); return task?.status; }
void element; void legacyElement; void retry; void invalid;
`
    );
    for (const [module, resolution] of [
        ['NodeNext', 'NodeNext'],
        ['ESNext', 'Bundler'],
    ])
        execFileSync(
            join(root, 'node_modules', '.bin', 'tsc'),
            [
                join(directory, 'consumer.tsx'),
                '--noEmit',
                '--strict',
                '--target',
                'ES2022',
                '--module',
                module,
                '--moduleResolution',
                resolution,
                '--jsx',
                'react-jsx',
            ],
            { cwd: directory, stdio: 'inherit' }
        );
    writeFileSync(
        join(directory, 'consumer.mjs'),
        `
import assert from 'node:assert/strict';
import { AttachmentList, GridStore, createNumberCellEditor } from '@nord-forge/the-grid';
import { Grid as LegacyGrid, GridStore as LegacyStore } from '@nord-forge/the-grid/legacy';
assert.equal(typeof AttachmentList, 'function');
assert.equal(typeof LegacyGrid, 'function');
const store = new GridStore({ rows: [{id:'1',name:'Alex'}], getRowId: row => row.id, columns: [{field:'name'}] });
assert.equal(store.rowModel.getRowCount(), 1);
assert.deepEqual(createNumberCellEditor({locale:'de-DE'}).parse(1234.5, {}), {ok:true,value:1234.5});
store.destroy();
const legacyStore = new LegacyStore({ rows: [{id:'1',name:'Alex'}], getRowId: row => row.id, columns: [{field:'name'}] });
assert.equal(legacyStore.rowModel.getRowCount(), 1);
legacyStore.destroy();
`
    );
    execFileSync(process.execPath, [join(directory, 'consumer.mjs')], { cwd: directory, stdio: 'pipe' });
    const packaged = JSON.parse(readFileSync(join(directory, 'package', 'package.json'), 'utf8'));
    assert.equal(packaged.version, JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version);
    assert(readFileSync(join(directory, 'package', 'dist', 'styles.css'), 'utf8').includes('attachment-list'));
    const legacyCss = readFileSync(join(directory, 'package', 'dist', 'legacy.css'), 'utf8');
    assert(
        !/@layer|:has\(|color-mix\(|:focus-visible|\bgap\s*:|overflow\s*:\s*clip|(?:padding|margin)-(?:inline|block)\s*:/.test(
            legacyCss
        )
    );
    assert(legacyCss.includes('--the-grid-accent-rgb'));
    const legacyJs = readFileSync(join(directory, 'package', 'dist', 'legacy.js'), 'utf8');
    assert(!/\.at\(|\.findLast\(|Object\.hasOwn\(/.test(legacyJs));
    console.log(
        `Packed consumer verified: ${packaged.name}@${packaged.version}, runtime exports, declarations and styles`
    );
} finally {
    rmSync(directory, { recursive: true, force: true });
}
