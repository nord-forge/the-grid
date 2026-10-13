import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const manifest = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
assert.equal(manifest.name, '@nord-forge/the-grid');
assert.match(
    manifest.version,
    /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/,
    'Use a stable semantic release version.'
);
assert.equal(lock.version, manifest.version, 'Root lockfile version differs.');
assert.equal(lock.packages[''].version, manifest.version, 'Package lockfile version differs.');
assert.equal(manifest.repository.url, 'git+https://github.com/nord-forge/the-grid.git');
assert.equal(manifest.publishConfig.access, 'public');
assert(
    read('CHANGELOG.md')
        .split('\n')
        .some((line) => line === `## ${manifest.version}` || line.startsWith(`## ${manifest.version} - `)),
    'Add versioned release notes.'
);
const tag = process.env.RELEASE_TAG;
if (tag) {
    assert.equal(tag, `v${manifest.version}`, 'Release tag must match package.json.');
    const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    assert.equal(git('rev-parse', `${tag}^{commit}`), git('rev-parse', 'HEAD'), 'Publish the exact tagged commit.');
}
console.log(`Release metadata valid: ${manifest.name}@${manifest.version}${tag ? ` (${tag})` : ''}`);
