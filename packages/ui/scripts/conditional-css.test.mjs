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
const legacyClasses = ['bg-primary', 'bg-muted', 'text-primary-foreground', 'text-muted-foreground',
  'grid-cols-2', 'w-auto', 'min-w-[200px]', 'w-[252px]', 'w-[70px]', 'px-5', 'px-2',
  'px-[10px]', 'justify-center', 'md:ml-[252px]', 'md:ml-[70px]'];
function assertCoverage(css) {
  const selectors = new Set();
  postcss.parse(css).walkRules((rule) => {
    selectorParser((root) => root.walkClasses((node) => selectors.add(node.value))).processSync(rule.selector);
  });
  for (const name of legacyClasses) assert.ok(selectors.has(name), `Missing legacy conditional class ${name}`);
  for (const [name, owners] of directives) {
    assert.ok(selectors.has(name), `Missing conditional class ${name} used by ${owners.join(', ')}`);
  }
}

test('all Svelte class directives have published native CSS in both entries', () => {
  assert.ok(directives.size >= 15, 'Source scan must include migrated sidebar and form directives');
  for (const name of ['svadmin-sidebar--expanded', 'svadmin-sidebar--collapsed', 'sidebar-content-expanded', 'sidebar-content-collapsed', 'svadmin-devtools--collapsed-width', 'svadmin-devtools--collapsed-min-width']) {
    assert.ok(directives.has(name), `Missing component source coverage for ${name}`);
  }
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
  assert.throws(() => assertCoverage(root.toString()), /Missing legacy conditional class w-\[70px\]/);
});

test('removing any current component state rule is detected', () => {
  for (const name of directives.keys()) {
    const root = postcss.parse(readFileSync(new URL('../dist/app.css', import.meta.url), 'utf8'));
    root.walkRules((rule) => {
      let remove = false;
      selectorParser((selectors) => selectors.walkClasses((node) => {
        if (node.value === name) remove = true;
      })).processSync(rule.selector);
      if (remove) rule.remove();
    });
    assert.throws(() => assertCoverage(root.toString()), /Missing (?:legacy )?conditional class/);
  }
});
