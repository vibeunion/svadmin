import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
import {
  bodyStyleMigration,
  createMigrationReference,
  lightTokenMigration,
  stripeDarkTokenMigration,
  stripeLightTokenMigration,
  tableSizeMigration,
} from './ui-browser-migration-reference.mjs';

const baseline = readFileSync(new URL('../packages/ui/test/style-baselines/components.css', import.meta.url), 'utf8');

test('reference changes only explicitly approved token, body and table declarations', () => {
  assert.equal(Object.keys(lightTokenMigration).length, 11);
  assert.equal(Object.keys(stripeLightTokenMigration).length, 5);
  assert.equal(Object.keys(stripeDarkTokenMigration).length, 7);
  assert.equal(Object.keys(bodyStyleMigration).length, 1);
  assert.deepEqual(tableSizeMigration, {
    '.svadmin-table-head': { height: ['2.25rem', '2.75rem'], 'font-size': [null, '0.75rem'] },
    '.svadmin-table-cell': { height: [null, '3rem'], 'font-size': [null, '0.8125rem'] },
  });
  const reference = postcss.parse(createMigrationReference(baseline));
  const migrations = [
    { selector: ':root', values: lightTokenMigration },
    { selector: ':root', values: stripeLightTokenMigration },
    { selector: '.dark', values: stripeDarkTokenMigration },
    { selector: 'body', values: bodyStyleMigration },
  ];
  for (const { selector, values } of migrations) {
    for (const [property, [before, after]] of Object.entries(values)) {
      let changed = 0;
      reference.walkDecls(property, declaration => {
        const rule = declaration.parent;
        const parent = rule?.parent;
        const isBase = parent?.name === 'layer' && parent.params === 'base';
        const isTarget = rule?.selector === selector && (selector === 'body'
          ? parent?.type === 'root'
          : parent?.type === 'atrule' && isBase);
        if (isTarget) {
          assert.equal(declaration.value, after);
          declaration.value = before;
          changed++;
        }
      });
      assert.equal(changed, 1);
    }
  }
  for (const [selector, values] of Object.entries(tableSizeMigration)) {
    reference.walkRules(selector, rule => {
      if (rule.parent?.name !== 'layer' || rule.parent.params !== 'components') return;
      for (const [property, [before, after]] of Object.entries(values)) {
        const matches = rule.nodes.filter(node => node.type === 'decl' && node.prop === property);
        assert.equal(matches.length, 1);
        assert.equal(matches[0].value, after);
        if (before === null) matches[0].remove();
        else matches[0].value = before;
      }
    });
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

test('body font migration fails closed when its historical binding drifts', () => {
  const declaration = `font-family: ${bodyStyleMigration['font-family'][0]};`;
  for (const replacement of ['', `${declaration} ${declaration}`, 'font-family: Inter;', `${declaration} !important;`]) {
    assert.throws(() => createMigrationReference(baseline.replace(declaration, replacement)));
  }
});

test('table migrations reject missing, duplicated, conditional or changed historical rules', () => {
  for (const selector of Object.keys(tableSizeMigration)) {
    for (const mutation of ['missing', 'duplicate', 'conditional', 'height', 'font-size']) {
      const root = postcss.parse(baseline);
      const rules = [];
      root.walkRules(selector, rule => {
        if (rule.parent?.name !== 'layer' || rule.parent.params !== 'components') return;
        rules.push(rule);
      });
      for (const rule of rules) {
        if (mutation === 'missing') rule.remove();
        if (mutation === 'duplicate') rule.parent.append(rule.clone());
        if (mutation === 'conditional') {
          const conditional = postcss.atRule({ name: 'media', params: '(width: 0px)' });
          rule.replaceWith(conditional);
          conditional.append(rule);
        }
        if (mutation === 'height' || mutation === 'font-size') {
          rule.append({ prop: mutation, value: '99px' });
        }
      }
      assert.throws(() => createMigrationReference(root.toString()), `${selector}: ${mutation}`);
    }
  }
});
