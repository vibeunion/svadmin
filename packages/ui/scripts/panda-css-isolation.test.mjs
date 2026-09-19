import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { isolatePandaCss } from './panda-css-isolation.mjs';

test('unused Panda defaults do not introduce host-wide variables', () => {
  const root = isolatePandaCss(postcss.parse(':root{--made-with-panda:x}*,::before{--scale-x:1}.svadmin-card{padding:var(--svadmin-spacing-sm)}'));
  assert.equal(root.toString(), '.svadmin-card{padding:var(--svadmin-spacing-sm)}');
  const once = root.toString();
  assert.equal(isolatePandaCss(root).toString(), once);
});

test('used unprefixed variables fail closed instead of silently losing defaults', () => {
  assert.throws(() => isolatePandaCss(postcss.parse('*{--scale-x:1}.card{scale:var(--scale-x)}')), /explicit isolation strategy/);
});

test('namespaced tokens retain their public theme bindings', () => {
  const input = ':where(:root,.dark){--svadmin-colors-surface:var(--card)}.svadmin-card{color:var(--svadmin-colors-surface)}';
  assert.equal(isolatePandaCss(postcss.parse(input)).toString(), input);
});
