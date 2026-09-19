import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { uiButton, uiBadge, uiInput, uiTextarea } from '../dist/recipes.js';
import { buttonVariants } from '../dist/components/ui/button/button-variants.js';
import { badgeVariants } from '../dist/components/ui/badge/badge-variants.js';

function classesIn(css) {
  const classes = new Set();
  postcss.parse(css).walkRules(rule => selectorParser(selectors => {
    selectors.walkClasses(node => {
      if (rule.nodes?.length) classes.add(node.value);
    });
  }).processSync(rule.selector));
  return classes;
}
const css = readFileSync(new URL('../dist/app.css', import.meta.url), 'utf8');
function assertGenerated(classes, available = classesIn(css)) {
  const names = classes.split(/\s+/).filter(Boolean);
  assert.ok(names.length > 0, 'recipe returned no classes');
  for (const name of names) assert.ok(available.has(name), `Missing generated primitive CSS: ${name}`);
}
test('all 48 runtime button combinations have published CSS', () => {
  for (const variant of ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link']) {
    for (const size of ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg']) assertGenerated(uiButton({ variant, size }));
  }
});
test('all eleven badge variants have published CSS', () => {
  for (const variant of ['default', 'secondary', 'destructive', 'subtle', 'subtle-success', 'subtle-warning', 'subtle-destructive', 'subtle-pill', 'outline', 'ghost', 'link']) assertGenerated(uiBadge({ variant }));
});
test('every file-input slot and the textarea have published CSS', () => {
  const slots = uiInput();
  for (const slot of ['root', 'control', 'visual', 'button', 'name']) assertGenerated(slots[slot]);
  assertGenerated(uiTextarea());
});
test('public helpers keep legacy semantic markers, null semantics and custom classes', () => {
  assert.ok(buttonVariants().includes('svadmin-button--default'));
  assert.ok(buttonVariants().includes('svadmin-button-size--default'));
  const button = buttonVariants({ variant: null, size: null, class: 'consumer-a', className: 'consumer-b' });
  assert.ok(!button.includes('--variant_') && !button.includes('--size_'));
  assert.ok(button.endsWith('consumer-a consumer-b'));
  assert.ok(!badgeVariants({ variant: null }).includes('--variant_'));
});
test('missing primitive rules cause coverage to fail', () => {
  const missing = postcss.parse(css);
  missing.walkRules(rule => {
    if (rule.selector.includes('ui-button') && rule.selector.includes('--size_icon-lg')) rule.remove();
  });
  assert.throws(() => assertGenerated(uiButton({ size: 'icon-lg' }), classesIn(missing.toString())), /Missing generated primitive CSS/);
});
