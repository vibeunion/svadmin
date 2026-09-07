import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { compile } from '@tailwindcss/node';
import postcss from 'postcss';
import { buildStyles } from './build-static-css.mjs';

const root = new URL('../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');

test('both entries ship component and third-party utility styles', () => {
  for (const entry of ['ai.css', 'ai.theme.css']) {
    const css = read(`dist/${entry}`);
    for (const selector of ['.svadmin-ai-code', '.svadmin-ai-code--secondary', '.flex', '.overflow-x-auto', '.list-disc', '.wrap-anywhere']) {
      assert.ok(css.includes(selector), `${entry}: missing ${selector}`);
    }
    assert.ok(css.includes('--color-primary'));
    assert.ok(css.includes('.dark'), `${entry}: missing class-based dark variant`);
  }
});

test('plain CSS is standalone and theme CSS does not scan consumer node_modules', () => {
  for (const entry of ['ai.css', 'ai.theme.css']) {
    let themeCount = 0;
    postcss.parse(read(`dist/${entry}`)).walkAtRules((rule) => {
      assert.ok(!['source', 'import', 'apply', 'utility', 'tailwind', 'custom-variant'].includes(rule.name), rule.name);
      if (rule.name === 'theme') themeCount++;
    });
    assert.equal(themeCount, entry === 'ai.css' ? 0 : 1);
  }
});

test('build output is deterministic and matches the published entries', async () => {
  const first = await buildStyles();
  const second = await buildStyles();
  assert.deepEqual(second, first);
  assert.equal(first.plain, read('dist/ai.css'));
  assert.equal(first.theme, read('dist/ai.theme.css'));
});

test('defaults are low-specificity and no global preflight is shipped', () => {
  const css = postcss.parse(read('dist/ai.css'));
  css.walkRules((rule) => {
    assert.ok(!['html', 'body', 'button, input, optgroup, select, textarea', '*'].includes(rule.selector));
    if (rule.parent.type === 'atrule' && rule.parent.name === 'layer' && rule.parent.params === 'theme') {
      assert.ok(rule.selector.startsWith(':where('), rule.selector);
    }
    if (rule.selector === '.svadmin-ai-code') {
      assert.equal(rule.parent.name, 'layer');
      assert.equal(rule.parent.params, 'components');
    }
  });
});

test('Tailwind hosts can extend the theme without losing precompiled styles', async () => {
  const compiler = await compile(`@import "tailwindcss";\n${read('dist/ai.theme.css')}\n@theme { --color-primary: rgb(1, 2, 3); }`, {
    base: fileURLToPath(root),
    onDependency() {},
  });
  const css = compiler.build(['text-primary', 'p-17']);
  assert.ok(css.includes('.p-17'));
  assert.ok(css.includes('.svadmin-ai-code'));
  const definitions = [];
  postcss.parse(css).walkDecls('--color-primary', (declaration) => {
    if (declaration.parent.selector === ':root, :host') definitions.push(declaration.value);
  });
  assert.deepEqual(definitions, ['rgb(1, 2, 3)']);
});

test('both CSS entries are exported and retained without direct variant dependencies', () => {
  const manifest = JSON.parse(read('package.json'));
  for (const entry of ['ai.css', 'ai.theme.css']) {
    assert.equal(manifest.exports[`./${entry}`].default, `./dist/${entry}`);
    assert.ok(manifest.sideEffects.includes(`./dist/${entry}`));
  }
  assert.ok(!manifest.dependencies['tailwind-variants']);
  assert.ok(!manifest.dependencies['tailwind-merge']);
  assert.ok(!manifest.dependencies['@svadmin/ui']);
});

test('native code variants respect Tailwind host semantic aliases', () => {
  const rules = new Map();
  postcss.parse(read('dist/ai.css')).walkRules((rule) => {
    if (!['.svadmin-ai-code', '.svadmin-ai-code--secondary'].includes(rule.selector)) return;
    const declarations = new Map();
    rule.walkDecls((declaration) => declarations.set(declaration.prop, declaration.value));
    rules.set(rule.selector, declarations);
  });
  assert.match(rules.get('.svadmin-ai-code').get('background'), /^var\(--color-background,/);
  assert.match(rules.get('.svadmin-ai-code').get('color'), /^var\(--color-foreground,/);
  assert.match(rules.get('.svadmin-ai-code').get('border'), /var\(--color-border,/);
  assert.match(rules.get('.svadmin-ai-code--secondary').get('background'), /^var\(--color-secondary,/);
});
