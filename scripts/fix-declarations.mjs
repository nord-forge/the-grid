/** Give published ESM declarations explicit file paths for both NodeNext and bundler consumers. */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/types/', import.meta.url));
function visit(directory) {
    for (const name of readdirSync(directory)) {
        const path = join(directory, name);
        if (statSync(path).isDirectory()) {
            visit(path);
            continue;
        }
        if (!path.endsWith('.d.ts')) continue;
        const text = readFileSync(path, 'utf8');
        const rewritten = text.replace(
            /(\bfrom\s*|\bimport\(\s*)(['"])(\.[^'"]+)\2/g,
            (match, prefix, quote, specifier) => {
                if (/\.[a-z]+$/i.test(specifier)) return match;
                const target = join(dirname(path), specifier);
                const suffix = existsSync(`${target}.d.ts`)
                    ? '.js'
                    : existsSync(join(target, 'index.d.ts'))
                      ? '/index.js'
                      : null;
                if (!suffix) throw new Error(`Unresolved declaration import ${specifier} in ${path}`);
                return `${prefix}${quote}${specifier}${suffix}${quote}`;
            }
        );
        if (text !== rewritten) writeFileSync(path, rewritten);
    }
}
visit(root);
console.log('Published declarations use explicit ESM module paths.');
