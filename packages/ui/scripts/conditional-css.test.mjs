import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const sourceRoot = new URL('../src/', import.meta.url);
const directives = new Map();
for (const file of readdirSync(sourceRoot, { recursive: true })) {
  if (!file.endsWith('.svelte')) continue;
  const source = readFileSync(new URL(file, sourceRoot), 'utf8');
  for (const match of source.matchAll(/\bclass:([^\s={}>]+)/g)) {
    const owners = directives.get(match[1]) ?? [];
    owners.push(file);
    directives.set(match[1], owners);
  }
}
function assertCoverage(css) {
  const selectors = new Set();
  postcss.parse(css).walkRules((rule) => {
    selectorParser((root) => root.walkClasses((node) => selectors.add(node.value))).processSync(rule.selector);
  });
  for (const [name, owners] of directives) {
    assert.ok(selectors.has(name), `Missing conditional class ${name} used by ${owners.join(', ')}`);
  }
}

test('all Svelte class directives have published native CSS in both entries', () => {
  assert.ok(directives.size >= 17, 'Source scan must include sidebar and form directives');
  for (const file of ['app.css', 'app.theme.css']) {
    assertCoverage(readFileSync(new URL(`../dist/${file}`, import.meta.url), 'utf8'));
  }
});

test('removing collapsed-sidebar CSS is detected even when expanded styles remain', () => {
  const root = postcss.parse(readFileSync(new URL('../dist/app.css', import.meta.url), 'utf8'));
  root.walkRules((rule) => {
    let remove = false;
    selectorParser((selectors) => selectors.walkClasses((node) => {
      if (node.value === 'w-[70px]') remove = true;
    })).processSync(rule.selector);
    if (remove) rule.remove();
  });
  assert.throws(() => assertCoverage(root.toString()), /Missing conditional class w-\[70px\]/);
});
