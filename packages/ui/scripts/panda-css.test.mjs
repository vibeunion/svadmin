import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { surfaceDesignContract } from '../dist/design-contract.js';
import { surfaceMetric, surfaceTable } from '../dist/recipes.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const digest = (text) => createHash('sha256').update(text).digest('hex');
function semantic(node) {
  if (node.type === 'comment') return null;
  return {
    type: node.type,
    ...(node.name ? { name: node.name, params: node.params } : {}),
    ...(node.selector ? { selector: node.selector } : {}),
    ...(node.prop ? { prop: node.prop, value: node.value, important: !!node.important } : {}),
    ...(node.nodes ? { nodes: node.nodes.map(semantic).filter(Boolean) } : {}),
  };
}

test('native compatibility CSS preserves the complete baseline cascade and declarations', () => {
  const manifest = JSON.parse(read('styles-compatibility.json'));
  assert.equal(manifest.baseCommit, 'cf6c4746578176ea773a17ef6f49f353292f7818');
  assert.equal(manifest.sourceCssSha256, '6e66d8c843dd623e89007d7d8c4b4d36fe3d248f228fac8f5bc38b01e6f6dd4e');
  const sources = Object.entries(manifest.files).map(([file, hash]) => {
    const css = read(`src/${file}`);
    assert.equal(digest(css), hash, `Compatibility source changed: ${file}; review the baseline deliberately`);
    return css;
  });
  const root = postcss.parse(sources.join('\n'));
  assert.equal(digest(JSON.stringify(semantic(root))), manifest.cascadeSha256);
});

test('every public runtime recipe variant has pre-generated CSS', () => {
  const classes = new Set();
  postcss.parse(read('dist/app.css')).walkRules((rule) => {
    selectorParser((selectors) => selectors.walkClasses((node) => classes.add(node.value))).processSync(rule.selector);
  });
  let variants = 0;
  function assertSlots(slots) {
    for (const value of Object.values(slots)) {
      for (const name of value.split(/\s+/)) {
        if (!name.includes('--')) continue;
        assert.ok(classes.has(name), `Missing static CSS for ${name}`);
        variants++;
      }
    }
  }
  for (const tone of surfaceDesignContract.metric.tone) {
    for (const density of surfaceDesignContract.metric.density) assertSlots(surfaceMetric({ tone, density }));
  }
  for (const density of surfaceDesignContract.table.density) assertSlots(surfaceTable({ density }));
  assert.ok(variants > 20, 'The recipe coverage assertion must not pass without exercising variants');
});

test('Panda recipes do not introduce global resets or theme scoping regressions', () => {
  const root = postcss.parse(read('src/styles/recipes.css'));
  root.walkAtRules('layer', () => assert.fail('Recipe layers must not lose to existing unlayered component CSS'));
  assert.ok(root.toString().includes('.svadmin-theme'));
  assert.ok(root.toString().includes('[data-theme]'));
  assert.ok(root.toString().includes('var(--card)'));
  assert.ok(!root.toString().includes('box-sizing: border-box'));
  assert.ok(!root.toString().includes('!important'));
});

test('published components and plain stylesheet require neither compiler', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.devDependencies['@pandacss/dev']);
  for (const section of ['dependencies', 'peerDependencies', 'devDependencies']) {
    for (const name of Object.keys(pkg[section] ?? {})) assert.ok(!/^(@tailwindcss\/|tailwindcss$|tw-animate-css$)/.test(name), name);
  }
  assert.ok(!pkg.dependencies['@pandacss/dev']);
  assert.ok(pkg.exports['./recipes']);
  assert.ok(pkg.exports['./design-contract']);
  postcss.parse(read('dist/app.css')).walkAtRules((rule) => {
    assert.ok(!['import', 'theme', 'source', 'apply', 'utility', 'tailwind', 'custom-variant'].includes(rule.name), rule.name);
  });
});
