import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = join(packageRoot, 'src', 'components');
const mapPath = join(packageRoot, 'scripts', 'utility-class-map.json');

const mappings = JSON.parse(readFileSync(mapPath, 'utf8'));
const reverse = new Map(Object.entries(mappings).map(([utility, alias]) => [alias, utility]));
const aliasPattern = /svadmin-u-[a-f0-9]{12}/g;

function collect(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collect(path);
    return entry.isFile() && entry.name.endsWith('.svelte') ? [path] : [];
  });
}

const files = collect(sourceRoot);
let replacements = 0;
const updated = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const next = source.replace(aliasPattern, (alias) => {
    const utility = reverse.get(alias);
    if (!utility) throw new Error(`Unknown legacy utility alias ${alias} in ${file}`);
    replacements += 1;
    return utility;
  });
  if (next !== source) {
    updated.push(file);
    writeFileSync(file, next, 'utf8');
  }
}

console.info(`[rewrite-legacy-utility-aliases] ${replacements} aliases restored in ${updated.length} files`);
