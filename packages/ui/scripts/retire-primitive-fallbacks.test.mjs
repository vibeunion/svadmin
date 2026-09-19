import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { retirePrimitiveFallbacks } from './retire-primitive-fallbacks.mjs';

const transform = css => retirePrimitiveFallbacks(postcss.parse(css)).toString();
test('migrated buttons and badges cannot silently depend on old primitive defaults', () => {
  const css = transform('@layer components { :is([data-slot="button"], .svadmin-button):hover > svg { width: 1rem } :is([data-slot="badge"], .svadmin-badge).svadmin-badge { padding: 1px } }');
  assert.ok(css.includes(':is([data-slot="button"], .svadmin-button):not(:where(.svadmin-ui-button)):hover > svg'));
  assert.ok(css.includes('.svadmin-badge).svadmin-badge:not(:where(.svadmin-ui-badge))'));
});
test('file-input adjacent focus and disabled selectors are gated at the correct elements', () => {
  const css = transform('@layer components { .svadmin-input[data-input-type="file"]:focus-visible + .svadmin-file-input__visual { border-color: red } .svadmin-file-input[data-disabled="true"] .svadmin-file-input__visual { opacity: .5 } }');
  assert.ok(css.includes('.svadmin-input:not(:where(.svadmin-ui-input__control))[data-input-type="file"]:focus-visible + .svadmin-file-input__visual:not(:where(.svadmin-ui-input__visual))'));
  assert.ok(css.includes('.svadmin-file-input:not(:where(.svadmin-ui-input__root))[data-disabled="true"]'));
});
test('shared unlayered theme/focus rules and unrelated components remain untouched', () => {
  const css = '.svadmin-input:focus-visible { outline: 2px solid red } @layer components { .svadmin-input-group { display: flex } .svadmin-dialog-content { padding: 2px } }';
  assert.equal(transform(css), css);
});
test('retirement preserves declarations and conditional structure, and is idempotent', () => {
  const source = '@layer components { @supports (display:grid) { .svadmin-textarea { padding:1rem;color:var(--foreground) } } }';
  const once = transform(source);
  assert.equal(transform(once), once);
  assert.ok(once.includes('@supports (display:grid)'));
  const before = [], after = [];
  postcss.parse(source).walkDecls(d => before.push([d.prop, d.value]));
  postcss.parse(once).walkDecls(d => after.push([d.prop, d.value]));
  assert.deepEqual(after, before);
});
