import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { contentPage, contentHeader, metricBlock } from '../src/styled-system/recipes/index.js';

const published = readFileSync(new URL('../dist/app.css', import.meta.url), 'utf8');
const recipeCss = readFileSync(new URL('../src/styles/recipes.css', import.meta.url), 'utf8');

function mentionsPositiveClass(selector, classes) {
  let found = false;
  selectorParser((ast) => {
    ast.walkClasses((node) => {
      if (!classes.has(node.value)) return;
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (parent.type === 'pseudo' && parent.value === ':not') return;
      }
      found = true;
    });
  }).processSync(selector);
  return found;
}

function declarations(css, className) {
  const classes = new Set(className.split(/\s+/u));
  const result = new Map();
  postcss.parse(css).walkRules((rule) => {
    if (!mentionsPositiveClass(rule.selector, classes)) return;
    for (const node of rule.nodes) if (node.type === 'decl') result.set(node.prop, node.value);
  });
  return result;
}

function requires(css, className, properties) {
  const actual = declarations(css, className);
  for (const property of properties) assert.ok(actual.has(property), `${className}: missing ${property}`);
  return actual;
}

for (const width of ['narrow', 'default', 'wide']) {
  test(`content page ${width} is generated without runtime scanning`, () => {
    const classes = contentPage({ width });
    assert.equal(Object.keys(classes).length, 1);
    const values = requires(published, classes.root, ['width', 'max-width', 'margin-inline', 'margin-block-end']);
    assert.match(values.get('max-width'), new RegExp(`content-${width}`));
    assert.equal(values.get('width'), '100%');
  });
}

const headerProperties = {
  root: ['margin-block-start', 'margin-block-end'],
  breadcrumbs: ['display', 'gap', 'color', 'font-size', 'line-height'],
  currentCrumb: ['color'],
  row: ['display', 'flex-direction', 'align-items', 'justify-content'],
  heading: ['min-width', 'margin-block-end'],
  eyebrow: ['color', 'font-size', 'font-weight', 'line-height'],
  title: ['color', 'font-size', 'font-weight', 'line-height', 'letter-spacing'],
  description: ['max-width', 'color', 'font-size', 'line-height'],
  actions: ['display', 'flex-shrink', 'flex-wrap', 'align-items', 'gap'],
};
for (const [slot, properties] of Object.entries(headerProperties)) {
  test(`content header ${slot} has published declarations`, () => {
    requires(published, contentHeader()[slot], properties);
  });
}

for (const trendTone of ['positive', 'negative', 'warning', 'neutral']) {
  test(`metric ${trendTone} uses its declared semantic token`, () => {
    const classes = metricBlock({ trendTone });
    const values = requires(published, classes.trend, ['font-weight', 'font-variant-numeric', 'color']);
    const token = trendTone === 'neutral' ? 'muted' : trendTone;
    assert.match(values.get('color'), new RegExp(`content-${token}`));
    const value = requires(published, classes.value, ['white-space', 'text-overflow', 'overflow']);
    assert.equal(value.get('white-space'), 'nowrap');
    assert.equal(value.get('text-overflow'), 'ellipsis');
    assert.equal(value.get('overflow'), 'hidden');
  });
}

test('every metric slot is styled, including the loading skeleton', () => {
  const classes = metricBlock();
  const properties = {
    root: ['border-color', 'border-style', 'border-width', 'border-radius', 'background-color', 'padding', 'box-shadow'],
    header: ['display', 'align-items', 'justify-content', 'gap'],
    label: ['color', 'font-size', 'line-height'], icon: ['color'],
    skeleton: ['margin-top', 'height', 'width'],
    value: ['font-size', 'line-height', 'letter-spacing', 'font-variant-numeric'],
    meta: ['margin-top', 'display', 'flex-wrap', 'gap'],
    trend: ['color', 'font-weight'], detail: ['color'],
  };
  assert.deepEqual(Object.keys(classes).sort(), Object.keys(properties).sort());
  for (const [slot, required] of Object.entries(properties)) requires(published, classes[slot], required);
});

test('removing a generated variant cannot pass through a selector-only assertion', () => {
  const className = contentPage({ width: 'wide' }).root;
  const rules = postcss.parse(published);
  rules.walkRules((rule) => {
    if (mentionsPositiveClass(rule.selector, new Set(className.split(/\s+/u)))
        && rule.nodes.some((node) => node.type === 'decl' && node.prop === 'max-width')) rule.remove();
  });
  assert.throws(() => requires(rules.toString(), className, ['max-width']), /missing max-width/u);
  assert.equal(mentionsPositiveClass('.other:not(.required) { }'.split(' {')[0], new Set(['required'])), false);
});

test('new content source has no legacy utility aliases or inline style API', () => {
  for (const name of ['ContentPageShell', 'ContentPageHeader', 'MetricBlock']) {
    const source = readFileSync(new URL(`../src/components/content/${name}.svelte`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /svadmin-u-|--tw-|max-w-\[|text-success|style\s*=/u);
    assert.match(source, /styled-system\/recipes\/index\.js/u);
  }
  assert.doesNotMatch(recipeCss, /@(?:theme|source|apply|tailwind)\b/u);
});

test('public CSS aliases remain identical and new variables stay namespaced', () => {
  assert.equal(published, readFileSync(new URL('../dist/app.theme.css', import.meta.url), 'utf8'));
  postcss.parse(recipeCss).walkDecls((decl) => {
    if (decl.prop.startsWith('--')) assert.match(decl.prop, /^--svadmin-/u);
  });
});
