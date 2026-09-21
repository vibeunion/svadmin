import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import {
  allRecipes, buttonRecipe, badgeRecipe, contentPageRecipe, contentHeaderRecipe,
  metricBlockRecipe, productWorkspaceRecipe, productStatusRecipe,
  productSettingsRowRecipe, surfaceMetricRecipe, surfaceTableRecipe,
} from '../dist/recipes.js';

const css = readFileSync(new URL('../dist/app.css', import.meta.url), 'utf8');
const rules = [];
postcss.parse(css).walkRules(rule => {
  const classes = new Set();
  selectorParser(ast => ast.walkClasses(node => {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (parent.type === 'pseudo' && parent.value === ':not') return;
    }
    classes.add(node.value);
  })).processSync(rule.selector);
  rules.push({ rule, classes });
});

function declarations(className) {
  const classes = className.split(/\s+/u);
  const values = new Map();
  for (const entry of rules) {
    if (!classes.some(name => entry.classes.has(name))) continue;
    entry.rule.walkDecls(decl => values.set(decl.prop, decl.value));
  }
  return values;
}

function requires(className, properties) {
  const values = declarations(className);
  for (const prop of properties) assert.ok(values.has(prop), `${className}: missing ${prop}`);
  return values;
}

test('every recipe slot returns classes with published declarations', () => {
  for (const [name, recipe] of Object.entries(allRecipes)) {
    const slots = recipe();
    for (const [slot, value] of Object.entries(slots)) {
      assert.equal(typeof value, 'string', `${name}.${slot}`);
      assert.ok(declarations(value).size, `${name}.${slot}: no published CSS`);
      assert.doesNotMatch(value, /function|=>|undefined/);
    }
  }
});

for (const width of ['narrow', 'default', 'wide']) {
  test(`content page ${width} is precompiled`, () => {
    const values = requires(contentPageRecipe({ width }).root, ['width', 'max-width', 'margin-inline', 'margin-block-end']);
    assert.equal(values.get('width'), '100%');
    assert.equal(values.get('max-width'), width === 'narrow' ? 'var(--container-3xl)' : width === 'wide' ? '92rem' : '74rem');
  });
}

test('header anatomy preserves spacing, wrapping and responsive layout', () => {
  const slots = contentHeaderRecipe();
  requires(slots.root, ['margin-block-end']);
  requires(slots.heading, ['min-width', 'margin-block-end']);
  requires(slots.row, ['display', 'flex-direction', 'align-items', 'justify-content']);
  requires(slots.title, ['font-size', 'font-weight', 'line-height', 'color']);
  requires(slots.actions, ['flex-wrap', 'flex-shrink', 'gap']);
});

for (const [trendTone, token] of Object.entries({
  positive: 'success', negative: 'destructive', warning: 'warning-foreground', neutral: 'muted-foreground',
})) {
  test(`metric ${trendTone} keeps its semantic color and overflow handling`, () => {
    const slots = metricBlockRecipe({ trendTone });
    assert.equal(requires(slots.trend, ['color']).get('color'), `var(--${token})`);
    requires(slots.value, ['overflow', 'text-overflow', 'white-space', 'font-variant-numeric']);
    requires(slots.skeleton, ['height', 'width', 'margin-top']);
  });
}

test('workspace has an explicit one-column default and optional responsive aside', () => {
  const single = productWorkspaceRecipe().columns;
  const aside = productWorkspaceRecipe({ hasSecondary: true }).columns;
  assert.ok(single.includes('lg:grid-cols-1'));
  assert.ok(!single.includes('lg:grid-cols-['));
  assert.ok(aside.includes('--workspace-secondary-width'));
  requires(aside, ['grid-template-columns', 'align-items']);
  assert.equal(declarations(productWorkspaceRecipe({ hasSecondary: true }).primary).get('order'), '1');
  assert.ok(!productSettingsRowRecipe({ separated: false }).root.includes('border-t'));
  requires(productSettingsRowRecipe({ separated: true }).root, ['border-top-width']);
});

for (const status of ['success', 'warning', 'danger', 'info', 'neutral']) {
  test(`status ${status} keeps a readable fallback and semantic tint`, () => {
    const values = requires(productStatusRecipe({ status }).root, ['background', 'color', 'border-color', '--svadmin-status-color']);
    const token = status === 'danger' ? 'destructive' : status === 'neutral' ? 'muted-foreground' : status;
    assert.equal(values.get('--svadmin-status-color'), `var(--${token})`);
    assert.match(css, /\.svadmin-product-status\[data-slot="badge"\]\s*\{[^}]*color:\s*var\(--foreground\)/u);
  });
}

test('all Surface tones and densities include state and loaded styles', () => {
  for (const tone of ['neutral', 'success', 'warning', 'danger', 'info']) {
    for (const density of ['compact', 'comfortable']) {
      const metric = surfaceMetricRecipe({ tone, density });
      requires(metric.card, ['border-inline-start-color', 'border-inline-start-width', 'padding']);
      requires(metric.state, ['--svadmin-metric-state-accent', '--svadmin-metric-state-padding', '--svadmin-metric-state-height']);
      const table = surfaceTableRecipe({ density });
      requires(table.head, ['padding-block', 'font-size']);
      requires(table.cell, ['padding-block', 'font-size']);
      requires(table.state, ['--svadmin-table-state-height']);
    }
  }
});

test('primitive recipes preserve null variants and caller classes', () => {
  assert.equal(buttonRecipe({ variant: null, size: null }).root, 'svadmin-button');
  assert.equal(badgeRecipe({ variant: null }).root, 'svadmin-badge');
  assert.ok(buttonRecipe({ class: 'host-action' }).root.includes('host-action'));
});

test('published CSS needs no consumer compiler and both entries match', () => {
  assert.equal(css, readFileSync(new URL('../dist/app.theme.css', import.meta.url), 'utf8'));
  assert.doesNotMatch(css, /@(?:theme|source|apply|tailwind|import|utility|reference)\b/u);
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(manifest.dependencies['tailwind-variants']);
  assert.ok(!manifest.dependencies.tailwindcss);
  assert.ok(!manifest.devDependencies?.['@pandacss/dev']);
});
