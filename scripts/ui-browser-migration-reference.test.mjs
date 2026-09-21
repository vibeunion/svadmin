import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
import { createMigrationReference, lightTokenMigration } from './ui-browser-migration-reference.mjs';

const baseline = readFileSync(new URL('../packages/ui/test/style-baselines/components.css', import.meta.url), 'utf8');

test('reference changes exactly eleven approved light declarations and nothing else', () => {
  assert.equal(Object.keys(lightTokenMigration).length, 11);
  const reference = postcss.parse(createMigrationReference(baseline));
  for (const [property, [before, after]] of Object.entries(lightTokenMigration)) {
    let changed = 0;
    reference.walkDecls(property, declaration => {
      if (declaration.parent.selector === ':root' && declaration.parent.parent.name === 'layer' &&
        declaration.parent.parent.params === 'base') {
        assert.equal(declaration.value, after);
        declaration.value = before;
        changed++;
      }
    });
    assert.equal(changed, 1);
  }
  assert.equal(reference.toString(), baseline);
});

test('missing, duplicate, changed, or important historical bindings fail closed', () => {
  const declaration = '--background: oklch(0.982 0.003 264);';
  for (const replacement of ['', `${declaration} ${declaration}`,
    '--background: red;', '--background: oklch(0.982 0.003 264) !important;']) {
    assert.throws(() => createMigrationReference(baseline.replace(declaration, replacement)));
  }
});

test('comment and conditional declarations cannot replace the real root binding', () => {
  const declaration = '--background: oklch(0.982 0.003 264);';
  const missing = baseline.replace(declaration, `/* ${declaration} */`);
  assert.throws(() => createMigrationReference(missing));
  assert.throws(() => createMigrationReference(`${missing}\n@media (width: 0px) { @layer base { :root { ${declaration} } } }`));
});
