import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { layerPrimitiveRecipes } from './primitive-css-layers.mjs';

const layers = (rule) => {
  const result = [];
  for (let p = rule.parent; p; p = p.parent) if (p.type === 'atrule' && p.name === 'layer') result.push(p.params);
  return result;
};
test('all four primitive families preserve the existing components cascade layer', () => {
  const root = postcss.parse('.svadmin-ui-button{color:red}.svadmin-ui-badge--variant_subtle{color:blue}.svadmin-ui-input__control{width:100%}.svadmin-ui-textarea{resize:vertical}');
  layerPrimitiveRecipes(root);
  root.walkRules(rule => assert.deepEqual(layers(rule), ['components']));
  assert.equal(root.nodes.length, 1);
});
test('Surface enhancement recipes and theme variables remain unlayered', () => {
  const root = postcss.parse(':root{--svadmin-colors-primary:var(--primary)}.svadmin-surface-table__cell{padding:8px}.svadmin-ui-button{padding:8px}');
  layerPrimitiveRecipes(root);
  root.walkRules(rule => assert.deepEqual(layers(rule), rule.selector.includes('ui-button') ? ['components'] : []));
});
test('supports and media conditions, declarations, and source order are preserved', () => {
  const root = postcss.parse('.svadmin-ui-badge{background:red}@supports(color:color-mix(in lab,red,red)){.svadmin-ui-badge{background:color-mix(in lab,red,red)}}@media(max-width:640px){.svadmin-ui-button{width:44px}}');
  const before = [];
  root.walkDecls(d => before.push([d.prop, d.value]));
  layerPrimitiveRecipes(root);
  const after = [];
  root.walkDecls(d => after.push([d.prop, d.value]));
  assert.deepEqual(after, before);
  assert.equal(root.nodes[1].name, 'supports');
  assert.equal(root.nodes[1].nodes[0].name, 'layer');
  assert.equal(root.nodes[2].name, 'media');
});
test('native nested selectors are not wrapped in an invalid nested layer', () => {
  const root = postcss.parse('.svadmin-ui-button{&:hover{color:red}}');
  layerPrimitiveRecipes(root);
  root.walkRules(rule => assert.deepEqual(layers(rule), ['components']));
});
test('primitive layering is idempotent', () => {
  const root = postcss.parse('.svadmin-ui-button{color:red}.svadmin-surface-table__cell{padding:8px}');
  layerPrimitiveRecipes(root);
  const once = root.toString();
  layerPrimitiveRecipes(root);
  assert.equal(root.toString(), once);
});
test('unrelated similarly named classes are not reclassified', () => {
  const root = postcss.parse('.svadmin-ui-buttonish{color:red}.svadmin-surface-metric__root{min-width:0}');
  layerPrimitiveRecipes(root);
  root.walkRules(rule => assert.deepEqual(layers(rule), []));
});
