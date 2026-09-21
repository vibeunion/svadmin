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
  const localClasses = new Set();
  for (const style of source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g)) {
    for (const name of classesWithDeclarations(style[1])) localClasses.add(name);
  }
  for (const match of source.matchAll(/\bclass:([^\s={}>]+)/g)) {
    if (localClasses.has(match[1])) continue;
    const owners = directives.get(match[1]) ?? [];
    owners.push(file);
    directives.set(match[1], owners);
  }
}
function classesWithDeclarations(css) {
  const selectors = new Set();
  postcss.parse(css).walkRules((rule) => {
    if (!rule.nodes?.some(node => node.type === 'decl')) return;
    selectorParser((root) => root.walkClasses((node) => {
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (parent.type === 'pseudo' && parent.value === ':not') return;
      }
      selectors.add(node.value);
    })).processSync(rule.selector);
  });
  return selectors;
}

function assertCoverage(css, required = directives) {
  const selectors = classesWithDeclarations(css);
  for (const [name, owners] of required) {
    assert.ok(selectors.has(name), `Missing conditional class ${name} used by ${owners.join(', ')}`);
  }
}

test('Svelte class directives without component-local styles have CSS in both public entries', () => {
  assert.ok(directives.size >= 15, 'Source scan must include migrated sidebar and form directives');
  for (const name of ['svadmin-sidebar-expanded', 'svadmin-sidebar-collapsed', 'svadmin-sidebar-content-expanded', 'svadmin-sidebar-content-collapsed', 'sidebar-content-expanded', 'sidebar-content-collapsed', 'svadmin-devtools--collapsed-width', 'svadmin-devtools--collapsed-min-width']) {
    assert.ok(directives.has(name), `Missing component source coverage for ${name}`);
  }
  for (const file of ['app.css', 'app.theme.css']) {
    assertCoverage(readFileSync(new URL(`../dist/${file}`, import.meta.url), 'utf8'));
  }
});

test('removing collapsed-sidebar CSS is detected even when expanded styles remain', () => {
  const root = postcss.parse(readFileSync(new URL('../dist/app.css', import.meta.url), 'utf8'));
  assertCoverage(root.toString());
  root.walkRules((rule) => {
    let remove = false;
    selectorParser((selectors) => selectors.walkClasses((node) => {
      if (node.value === 'svadmin-sidebar-collapsed') remove = true;
    })).processSync(rule.selector);
    if (remove) rule.remove();
  });
  assert.throws(() => assertCoverage(root.toString()), /Missing conditional class svadmin-sidebar-collapsed used by/);
});

test('removing any current component state rule is detected', () => {
  for (const name of directives.keys()) {
    const root = postcss.parse(readFileSync(new URL('../dist/app.css', import.meta.url), 'utf8'));
    assertCoverage(root.toString());
    root.walkRules((rule) => {
      let remove = false;
      selectorParser((selectors) => selectors.walkClasses((node) => {
        if (node.value === name) remove = true;
      })).processSync(rule.selector);
      if (remove) rule.remove();
    });
    assert.throws(() => assertCoverage(root.toString(), new Map([[name, directives.get(name)]])), error =>
      error instanceof assert.AssertionError && error.message.startsWith(`Missing conditional class ${name} used by `));
  }
});
