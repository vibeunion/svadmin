import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import * as definitions from '../design/product-recipes.ts';
import * as runtime from '../dist/recipes.js';

const published = readFileSync(new URL('../dist/app.css', import.meta.url), 'utf8');
const generated = readFileSync(new URL('../src/styles/recipes.css', import.meta.url), 'utf8');
function declarations(css, className) {
  const classes = new Set(className.split(/\s+/u));
  const values = new Map();
  postcss.parse(css).walkRules(rule => {
    let found = false;
    selectorParser(ast => ast.walkClasses(node => {
      if (!classes.has(node.value)) return;
      for (let parent = node.parent; parent; parent = parent.parent) if (parent.type === 'pseudo' && parent.value === ':not') return;
      found = true;
    })).processSync(rule.selector);
    if (found) for (const node of rule.nodes) if (node.type === 'decl') values.set(node.prop, node.value);
  });
  return values;
}
for (const [name, definition] of Object.entries(definitions)) {
  test(`${name}: exports every anatomy slot with real published declarations`, () => {
    assert.equal(typeof runtime[name], 'function');
    const styles = runtime[name]();
    assert.deepEqual(Object.keys(styles).sort(), [...definition.slots].sort());
    for (const className of Object.values(styles)) assert.ok(declarations(published, className).size > 0, className);
    assert.doesNotMatch(JSON.stringify(definition), /#[0-9a-f]{3,8}\b|--tw-|svadmin-u-|!important|@(?:theme|apply|tailwind)\b/iu);
  });
}
test('workspace default stays one column without an aside', () => {
  assert.equal(definitions.productWorkspace.defaultVariants.hasSecondary, false);
  assert.equal(declarations(published, runtime.productWorkspace().columns).get('grid-template-columns'), 'minmax(0, 1fr)');
  assert.match(declarations(published, runtime.productWorkspace({ hasSecondary: true }).columns).get('grid-template-columns'), /--workspace-secondary-width/u);
});
test('both field separation variants are explicitly generated', () => {
  assert.equal(declarations(published, runtime.productSettingsRow({ separated: true }).root).get('border-top'), '1px solid');
  assert.equal(declarations(published, runtime.productSettingsRow({ separated: false }).root).has('border-top'), false);
  const values = declarations(published, runtime.productSettingsRow().root);
  assert.equal(values.get('grid-template-columns'), 'minmax(0, 1fr) minmax(0, 1fr)');
});
test('table focus, alignment and a single scroll owner are expressed in the recipe', () => {
  const table = definitions.productList.base.table;
  assert.equal(table.overflowX, 'auto');
  assert.equal(table['& > [data-slot=table-container]'].overflow, 'visible');
  assert.equal(table['&:focus-visible'].outline, '2px solid var(--ring)');
  assert.equal(table['& [data-align=end]'].textAlign, 'end');
  assert.equal(table['& tbody [data-slot=table-row]:not(:last-child)'].borderBottom, '1px solid');
});
test('missing generated CSS cannot pass merely because runtime class names exist', () => {
  assert.equal(declarations('', runtime.productWorkspace({ hasSecondary: true }).columns).size, 0);
  assert.equal(declarations('.other:not(.required){color:red}', 'required').size, 0);
});
test('published aliases stay identical; generated variables remain namespaced', () => {
  assert.equal(published, readFileSync(new URL('../dist/app.theme.css', import.meta.url), 'utf8'));
  postcss.parse(generated).walkDecls(decl => {
    if (decl.prop.startsWith('--')) assert.match(decl.prop, /^--svadmin-/u);
  });
});

test('workspace definition and emitted CSS retain top alignment and responsive column order', () => {
  const workspace = definitions.productWorkspace;
  assert.equal(workspace.base.columns.display, 'grid');
  assert.equal(workspace.base.columns.alignItems, 'start');
  assert.equal(workspace.base.columns.gridTemplateColumns, 'minmax(0, 1fr)');
  const responsive = workspace.variants.hasSecondary.true;
  assert.equal(responsive.columns['@media (min-width: 64rem)'].gridTemplateColumns, 'minmax(0, 1fr) minmax(0, var(--workspace-secondary-width, 22rem))');
  assert.equal(responsive.primary['@media (min-width: 64rem)'].order, '1');
  assert.equal(responsive.secondary['@media (min-width: 64rem)'].order, '2');
  const single = runtime.productWorkspace();
  const split = runtime.productWorkspace({ hasSecondary: true });
  for (const css of [generated, published]) {
    assert.equal(declarations(css, single.columns).get('display'), 'grid');
    assert.equal(declarations(css, single.columns).get('align-items'), 'start');
    assert.equal(declarations(css, single.columns).get('grid-template-columns'), 'minmax(0, 1fr)');
    assert.equal(declarations(css, split.columns).get('grid-template-columns'), 'minmax(0, 1fr) minmax(0, var(--workspace-secondary-width, 22rem))');
    assert.equal(declarations(css, split.primary).get('order'), '1');
    assert.equal(declarations(css, split.secondary).get('order'), '2');
  }
});
