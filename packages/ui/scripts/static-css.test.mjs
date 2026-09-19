import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const root = new URL('../', import.meta.url);
const read = (name) => readFileSync(new URL(`dist/${name}`, root), 'utf8');

test('both published CSS entries contain migrated utility and variant styles', () => {
  for (const name of ['app.css', 'app.theme.css']) {
    const css = read(name);
    for (const selector of [
      '.svadmin-u-ed8a5df7b2fb',
      '.svadmin-u-76747e5e02ff',
      '.svadmin-button--outline',
      '.svadmin-badge--subtle-success',
      '.svadmin-alert--warning',
      '.svadmin-avatar-size--sm',
    ]) assert.ok(css.includes(selector), `${name}: missing ${selector}`);
    assert.ok(css.includes('.svadmin-theme'), `${name}: missing nested aliases`);
  }
});

test('plain CSS has no Tailwind directives, while the theme entry keeps valid metadata', () => {
  postcss.parse(read('app.css')).walkAtRules((rule) => {
    assert.ok(!['import', 'theme', 'source', 'apply', 'utility'].includes(rule.name), rule.name);
  });
  let themes = 0;
  let sources = 0;
  postcss.parse(read('app.theme.css')).walkAtRules((rule) => {
    if (rule.name === 'theme') {
      themes++;
      assert.ok(rule.nodes.some((node) => node.prop === '--color-primary'));
    }
    if (rule.name === 'source') {
      sources++;
      assert.equal(rule.params, '"./components"');
    }
  });
  assert.equal(themes, 1);
  assert.equal(sources, 1);
});

test('every migrated utility referenced by a component has a published CSS selector', () => {
  const classes = new Set();
  postcss.parse(read('app.css')).walkRules((rule) => {
    selectorParser((selectors) => {
      selectors.walkClasses((node) => classes.add(node.value));
    }).processSync(rule.selector);
  });
  const components = new URL('src/components/', root);
  const missing = new Set();
  for (const file of readdirSync(components, { recursive: true })) {
    if (!file.endsWith('.svelte')) continue;
    const source = readFileSync(new URL(file, components), 'utf8');
    for (const [alias] of source.matchAll(/svadmin-u-[a-f0-9]{12}/g)) {
      if (!classes.has(alias)) missing.add(alias);
    }
  }
  assert.deepEqual([...missing], []);
});

test('postbuild is idempotent and preserves both CSS side effects', () => {
  const before = ['app.css', 'app.theme.css'].map(read);
  execFileSync(process.execPath, [fileURLToPath(new URL('scripts/postbuild-css.mjs', root))]);
  assert.deepEqual(['app.css', 'app.theme.css'].map(read), before);
  const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  assert.ok(manifest.sideEffects.includes('./dist/app.css'));
  assert.ok(manifest.sideEffects.includes('./dist/app.theme.css'));
  assert.ok(!manifest.dependencies['tailwind-variants']);
  assert.ok(!manifest.dependencies['tailwind-merge']);
});
