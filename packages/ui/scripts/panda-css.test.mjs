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

test('historical compatibility baseline retains its original cascade and declarations', () => {
  const manifest = JSON.parse(read('styles-compatibility.json'));
  assert.equal(manifest.baseCommit, 'cf6c4746578176ea773a17ef6f49f353292f7818');
  assert.equal(manifest.sourceCssSha256, '6e66d8c843dd623e89007d7d8c4b4d36fe3d248f228fac8f5bc38b01e6f6dd4e');
  const sources = Object.entries(manifest.files).map(([file, hash]) => {
    const css = read(`test/style-baselines/${file}`);
    assert.equal(digest(css), hash, `Compatibility source changed: ${file}; review the baseline deliberately`);
    return css;
  });
  const root = postcss.parse(sources.join('\n'));
  assert.equal(digest(JSON.stringify(semantic(root))), manifest.cascadeSha256);
});

function assertVariantDeclarations(css) {
  const rulesByClass = new Map();
  postcss.parse(css).walkRules((rule) => {
    selectorParser((selectors) => selectors.walkClasses((node) => {
      const rules = rulesByClass.get(node.value) ?? [];
      rules.push(rule);
      rulesByClass.set(node.value, rules);
    })).processSync(rule.selector);
  });
  let checked = 0;
  function declaration(slotClasses, suffix, property, expected) {
    const names = slotClasses.split(/\s+/).filter((name) => name.endsWith(suffix));
    assert.equal(names.length, 1, `Expected one ${suffix} class in ${slotClasses}`);
    const name = names[0];
    const values = (rulesByClass.get(name) ?? []).flatMap((rule) => {
      const found = [];
      rule.walkDecls(property, (decl) => found.push(decl.value));
      return found;
    });
    assert.ok(values.includes(expected), `${name}: missing ${property}: ${expected}`);
    checked++;
  }
  const tones = { neutral: 'border', success: 'success', warning: 'warning', danger: 'danger', info: 'info' };
  for (const tone of surfaceDesignContract.metric.tone) {
    for (const density of surfaceDesignContract.metric.density) {
      const slots = surfaceMetric({ tone, density });
      declaration(slots.root, '__root', 'min-width', '0');
      declaration(slots.card, '__card', 'border-inline-start-width', '3px');
      declaration(slots.card, `--tone_${tone}`, 'border-inline-start-color', `var(--svadmin-colors-${tones[tone]})`);
      declaration(slots.state, `--tone_${tone}`, '--svadmin-metric-state-accent', `var(--svadmin-colors-${tones[tone]})`);
      declaration(slots.card, `--density_${density}`, 'padding', `var(--svadmin-spacing-${density === 'compact' ? 'sm' : 'lg'})`);
      declaration(slots.state, `--density_${density}`, '--svadmin-metric-state-height', density === 'compact' ? '4.5rem' : '6rem');
    }
  }
  for (const density of surfaceDesignContract.table.density) {
    const slots = surfaceTable({ density });
    for (const slot of ['head', 'cell']) {
      declaration(slots[slot], `--density_${density}`, 'padding-block', density === 'compact' ? 'var(--svadmin-spacing-xs)' : '0.5rem');
      declaration(slots[slot], `--density_${density}`, 'font-size', `var(--svadmin-font-sizes-${density === 'compact' ? 'compact' : 'body'})`);
    }
    for (const slot of ['header', 'content']) declaration(slots[slot], `--density_${density}`, 'padding-inline', `var(--svadmin-spacing-${density === 'compact' ? 'sm' : 'md'})`);
    declaration(slots.state, `--density_${density}`, '--svadmin-table-state-height', density === 'compact' ? '6rem' : '8rem');
  }
  assert.equal(checked, 74);
}

test('every styled slot and public runtime variant has its required CSS declarations', () => {
  assertVariantDeclarations(read('dist/app.css'));
});

test('variant coverage detects a missing rule rather than passing vacuously', () => {
  const css = postcss.parse(read('dist/app.css'));
  css.walkRules((rule) => {
    if (rule.selector.includes('__card--tone_warning')) rule.remove();
  });
  assert.throws(() => assertVariantDeclarations(css.toString()), /missing border-inline-start-color/);
});

test('Panda recipes do not introduce global resets or theme scoping regressions', () => {
  const root = postcss.parse(read('src/styles/recipes.css'));
  root.walkAtRules('layer', () => assert.fail('Recipe layers must not lose to existing unlayered component CSS'));
  assert.ok(root.toString().includes('.svadmin-theme'));
  assert.ok(root.toString().includes('[data-theme]'));
  assert.ok(root.toString().includes('var(--card)'));
  assert.ok(!root.toString().includes('box-sizing: border-box'));
  assert.ok(!root.toString().includes('!important'));
  root.walkDecls((decl) => {
    if (decl.prop.startsWith('--')) assert.ok(decl.prop.startsWith('--svadmin-'), decl.prop);
  });
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
