import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileMigratedUtilities } from './build-migrated-ui.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../packages/ui/package.json', import.meta.url));
const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const write = (path, text) => {
  mkdirSync(dirname(resolve(root, path)), { recursive: true });
  writeFileSync(resolve(root, path), text);
};
const sha = (text) => createHash('sha256').update(text).digest('hex');
const targets = [
  ['ui', 'packages/ui', 'src/styles/compatibility.prelude.css'],
  ['ai-elements', 'packages/ai-elements', 'src/utilities.css'],
  ['example', 'example', 'src/compatibility.css'],
];

function propertyName(name) {
  if (name.startsWith('--')) return name;
  return name.replace(/^-ms-/, 'ms-').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Ordered fragments preserve fallback declarations and nested-condition precedence.
export function styleParts(container) {
  const parts = [];
  let declarations = null;
  for (const node of container.nodes ?? []) {
    if (node.type === 'comment') continue;
    if (node.type === 'decl') {
      const key = propertyName(node.prop);
      if (!declarations || Object.hasOwn(declarations, key)) {
        declarations = {};
        parts.push(declarations);
      }
      declarations[key] = `${node.value}${node.important ? ' !important' : ''}`;
      continue;
    }
    declarations = null;
    if (node.type === 'rule') {
      const selector = node.selector.includes('&') ? node.selector : `& ${node.selector}`;
      for (const part of styleParts(node)) parts.push({ [selector]: part });
      continue;
    }
    if (node.type === 'atrule' && ['media', 'supports', 'container'].includes(node.name)) {
      for (const part of styleParts(node)) parts.push({ [`@${node.name} ${node.params}`]: part });
      continue;
    }
    throw new Error(`Unsupported utility node ${node.type} ${node.name ?? ''} ${node.params ?? ''}; refusing incomplete CSS`);
  }
  return parts;
}

export function migrateUtilityContainer(container, records) {
  for (const node of [...(container.nodes ?? [])]) {
    if (node.type === 'comment') continue;
    if (node.type === 'atrule') {
      if (['media', 'supports', 'container', 'layer'].includes(node.name) && node.nodes) {
        // Keep the grouping rule at its original cascade position, including nesting.
        migrateUtilityContainer(node, records);
        continue;
      }
      // Native animation and property registrations are foundation CSS, not utilities.
      if (['keyframes', '-webkit-keyframes', 'property'].includes(node.name)) continue;
      throw new Error(`Unsupported utility group @${node.name} ${node.params}; refusing incomplete CSS`);
    }
    assert.equal(node.type, 'rule', `Unsupported utility node ${node.type}`);
    const selectors = selectorParser().astSync(node.selector).nodes.map((selector) => selector.toString());
    const parts = styleParts(node);
    assert.ok(parts.length, `Empty utility rule ${node.selector}`);
    const markers = parts.map((base) => {
      const index = records.length;
      const recipe = `migrated${String(index).padStart(5, '0')}`;
      records.push({ name: recipe, className: `svmigration${index}`, selectors, base });
      return postcss.comment({ text: `svadmin-recipe:${recipe}` });
    });
    node.replaceWith(...markers);
  }
}

function replaceOnce(path, before, after) {
  const source = read(path);
  if (source.includes(after)) return;
  assert.ok(source.includes(before), `${path}: expected source changed`);
  write(path, source.replace(before, after));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = JSON.parse(read('packages/ui/styles-compatibility.json'));
  for (const [file, hash] of Object.entries(manifest.files)) {
    const destination = `packages/ui/test/style-baselines/${file}`;
    if (existsSync(resolve(root, destination))) {
      assert.equal(sha(read(destination)), hash, `Historical baseline was modified: ${file}`);
    } else {
      assert.equal(sha(read(`packages/ui/src/${file}`)), hash, `Unrecognized migration baseline: ${file}`);
      mkdirSync(dirname(resolve(root, destination)), { recursive: true });
      copyFileSync(resolve(root, `packages/ui/src/${file}`), resolve(root, destination));
    }
  }
  for (const [name, packageRoot, file] of targets) {
    const design = `${packageRoot}/design/migrated-utilities`;
    if (!existsSync(resolve(root, `${design}/recipes.json`))) {
      const original = read(`${packageRoot}/${file}`);
      const css = postcss.parse(original);
      const records = [];
      const layers = [];
      css.walkAtRules('layer', (layer) => { if (layer.params === 'utilities' && layer.nodes) layers.push(layer); });
      assert.ok(layers.length, `${name}: no utility layer found`);
      for (const layer of layers) migrateUtilityContainer(layer, records);
      write(`${design}/recipes.json`, `${JSON.stringify(records, null, 2)}\n`);
      write(`${design}/foundation.css.template`, `${css.toString().trim()}\n`);
      write(`${design}/provenance.json`, `${JSON.stringify({ baselineCommit: '4e7f62ce98af8b50c92a8218f1b3060f52ac42c0', originalFile: file, originalSha256: sha(original), recipes: records.length, retainsPublicSelectors: true }, null, 2)}\n`);
      if (name !== 'ui') write(`${packageRoot}/test/style-baselines/utilities.css`, original);
    }
    compileMigratedUtilities(name);
    compileMigratedUtilities(name, true);
  }
  replaceOnce('packages/ui/scripts/panda-css.test.mjs', 'const css = read(`src/${file}`);', 'const css = read(`test/style-baselines/${file}`);');
  replaceOnce('packages/ui/scripts/panda-css.test.mjs', "test('native compatibility CSS preserves the complete baseline cascade and declarations'", "test('historical compatibility baseline retains its original cascade and declarations'");
  replaceOnce('scripts/check-panda-browser.mjs', 'read(`packages/ui/src/${path}`)', 'read(`packages/ui/test/style-baselines/${path}`)');
  for (const [name, packageRoot] of targets) {
    const path = `${packageRoot}/package.json`;
    const pkg = JSON.parse(read(path));
    const command = `node ${name === 'example' ? '../' : '../../'}scripts/build-migrated-ui.mjs ${name}`;
    if (name === 'ui') {
      if (!pkg.scripts['build:styles'].includes(command)) pkg.scripts['build:styles'] += ` && ${command}`;
    } else if (!pkg.scripts.build.includes(command)) pkg.scripts.build = `${command} && ${pkg.scripts.build}`;
    pkg.scripts['styles:migrated:check'] = `${command} --check`;
    write(path, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  console.info('Utility recipe migration generated; full component/browser verification is still required.');
}
