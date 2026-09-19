import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNativeClassnames } from './build-native-classnames.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const write = (path, content) => { mkdirSync(dirname(resolve(root, path)), { recursive: true }); writeFileSync(resolve(root, path), content); };
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function files(directory) {
  return readdirSync(resolve(root, directory), { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
    .map((entry) => relative(root, resolve(entry.parentPath, entry.name)).replaceAll('\\', '/')).sort();
}
function json(path) { return JSON.parse(read(path)); }
function saveJson(path, value) { write(path, `${JSON.stringify(value, null, 2)}\n`); }

// This explicit one-time fork preserves the locked parser, sanitizers and public props.
// Only the two class-composition calls in theme.js change. No markdown is reimplemented.
const vendor = 'packages/ai-elements/vendor/streamdown';
const provenancePath = `${vendor}/provenance.json`;
let upstream;
if (!existsSync(resolve(root, provenancePath))) {
  const installed = 'node_modules/streamdown-svelte';
  upstream = json(`${installed}/package.json`);
  assert.equal(upstream.version, '3.0.6', 'Review upstream changes before regenerating this fork');
  assert.equal(upstream.license, 'Apache-2.0');
  const original = Object.fromEntries(files(`${installed}/dist`).map((file) => [relative(`${installed}/dist`, file), hash(readFileSync(resolve(root, file)))]));
  cpSync(resolve(root, installed, 'dist'), resolve(root, vendor), { recursive: true, dereference: true });
  const notices = readdirSync(resolve(root, installed)).filter((name) => /^(LICENSE|NOTICE)(\..*)?$/i.test(name));
  assert.ok(notices.some((name) => /^LICENSE/i.test(name)), 'Upstream license must be preserved');
  for (const name of notices) cpSync(resolve(root, installed, name), resolve(root, vendor, name));
  const path = `${vendor}/theme.js`;
  const source = read(path);
  const before = "import { clsx } from 'clsx';\nimport { twMerge } from 'tailwind-merge';";
  assert.ok(source.includes(before), 'Upstream composition entry changed');
  assert.equal(source.split('twMerge(clsx(inputs))').length - 1, 2);
  write(path, source.replace(before, "// Modified by svadmin: native finite-class composition, no utility-language runtime.\nimport { cn as nativeClassNames } from '../../dist/classnames.js';")
    .replaceAll('twMerge(clsx(inputs))', 'nativeClassNames(...inputs)'));
  for (const file of files(vendor)) {
    if (!/\.(js|svelte|ts)$/.test(file)) continue;
    assert.ok(!/(?:from\s*|import\s*\()\s*['"](?:tailwind[^'"]*|cn)['"]/.test(read(file)), `Unreviewed class engine import: ${file}`);
  }
  const changed = files(vendor).filter((file) => Object.hasOwn(original, relative(vendor, file)) && original[relative(vendor, file)] !== hash(readFileSync(resolve(root, file))));
  assert.deepEqual(changed, [`${vendor}/theme.js`], 'Parser/security implementation must remain byte-identical');
  saveJson(provenancePath, { upstream: upstream.name, version: upstream.version, repository: upstream.repository.url, license: upstream.license,
    originalFileHashes: original, modifiedFiles: ['theme.js'], runtimeDependencies: Object.fromEntries(Object.entries(upstream.dependencies).filter(([name]) => name !== 'tailwind-merge')) });
  write(`${vendor}/README.svadmin.md`, '# Locked native-style Streamdown fork\n\nThis is the Apache-2.0 distribution of streamdown-svelte 3.0.6. LICENSE and any NOTICE are retained. Only theme.js is modified: two class-composition calls use svadmin finite CSS metadata instead of a utility-language engine. Parser, streaming repair, URL policy, sanitizers, controls and public props are unchanged. The provenance manifest records each original file digest.\n\nThis copy is deliberately owned: upstream fixes must be reviewed and updated explicitly; package-manager updates will not update it. Unknown host classes are preserved, not interpreted as arbitrary utilities. Rebuild svadmin CSS after editing its finite styles.\n');
} else {
  const provenance = json(provenancePath);
  upstream = { dependencies: provenance.runtimeDependencies };
  for (const [file, expected] of Object.entries(provenance.originalFileHashes)) {
    if (provenance.modifiedFiles.includes(file)) continue;
    assert.equal(hash(readFileSync(resolve(root, vendor, file))), expected, `Upstream file drift: ${file}`);
  }
}

for (const name of ['ui', 'ai-elements']) {
  const base = `packages/${name}`;
  write(`${base}/src/classnames.ts`, read('scripts/templates/native-classnames.ts'));
  write(`${base}/src/classnames.test.ts`, read('scripts/templates/native-classnames.test.ts'));
  buildNativeClassnames(name);
  const utilsPath = `${base}/src/utils.ts`;
  const utils = read(utilsPath);
  assert.ok(/export \{ cn \} from ['"](?:cn|\.\/classnames\.js)['"];/.test(utils), `Unexpected ${utilsPath}`);
  write(utilsPath, utils.replace(/export \{ cn \} from ['"]cn['"];?/, "export { cn } from './classnames.js';"));
  const path = `${base}/package.json`;
  const manifest = json(path);
  delete manifest.dependencies.cn;
  manifest.dependencies.clsx = '^2.1.1';
  const build = `node ../../scripts/build-native-classnames.mjs ${name}`;
  const script = name === 'ui' ? 'build:styles' : 'build';
  if (!manifest.scripts[script].includes(build)) {
    manifest.scripts[script] = name === 'ui' ? `${manifest.scripts[script]} && ${build}`
      : manifest.scripts[script].replace(' && ', ` && ${build} && `);
  }
  if (name === 'ai-elements') {
    delete manifest.dependencies['streamdown-svelte'];
    for (const [dependency, version] of Object.entries(upstream.dependencies)) {
      if (dependency === 'tailwind-merge') continue;
      manifest.dependencies[dependency] ??= version;
    }
    manifest.files ??= ['dist'];
    if (!manifest.files.includes('vendor')) manifest.files.push('vendor');
    for (const file of files(`${base}/src`)) {
      if (!/\.(svelte|ts|js)$/.test(file)) continue;
      const source = read(file);
      const rewritten = source.replace(/(from\s*|import\s*\(\s*)['"]streamdown-svelte(?:\/([^'"]+))?['"]/g, (_match, prefix, subpath) => {
        assert.ok(subpath === undefined || subpath === 'plugins', `Review unsupported Streamdown subpath ${subpath}`);
        let target = relative(dirname(file), `${vendor}/${subpath ?? 'index'}.js`).replaceAll('\\', '/');
        if (!target.startsWith('.')) target = `./${target}`;
        return `${prefix}'${target}'`;
      });
      if (rewritten !== source) write(file, rewritten);
    }
  }
  saveJson(path, manifest);
}
console.info('Replaced direct and transitive class engines; the real lockfile must now be regenerated and checked.');
