import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { flattenPandaLayers } from './panda-css-layers.mjs';

for (const [name, input, expected] of [
  ['nested recipe layers', '@layer a,b;@layer a{@layer _base{.base{color:red}}.variant{color:blue}}', ['.base', '.variant']],
  ['nested layers inside media', '@media (min-width:30rem){@layer a{@layer b{.responsive{padding:1rem}}}}', ['.responsive']],
  ['empty layer and ordinary rule', '@layer a{} .untouched{margin:0}', ['.untouched']],
]) {
  test(name, () => {
    const root = flattenPandaLayers(postcss.parse(input));
    const selectors = [];
    root.walkRules((rule) => selectors.push(rule.selector));
    root.walkAtRules('layer', () => assert.fail('Unexpected remaining layer'));
    assert.deepEqual(selectors, expected);
    if (input.startsWith('@media')) assert.equal(root.first.name, 'media');
    const once = root.toString();
    assert.equal(flattenPandaLayers(root).toString(), once);
  });
}
