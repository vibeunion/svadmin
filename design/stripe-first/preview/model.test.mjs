import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { customers, filterCustomers, readPreviewOptions, scenarios, settingsSeed } from './model.mjs';

const contract = JSON.parse(readFileSync(new URL('../contract.json', import.meta.url)));

test('every agreed pattern state has a browser specimen without inventing Figma completion', () => {
  for (const pattern of contract.patterns) {
    assert.deepEqual([...scenarios[pattern.id]].sort(), [...pattern.states].sort());
    assert.equal(pattern.figmaStatus, 'pending');
  }
  assert.equal(Object.values(scenarios).flat().length, 19);
});

for (const bad of ['__proto__', 'constructor', 'toString', '<script>alert(1)</script>', 'https://example.com', '']) {
  test(`query cannot select arbitrary view ${JSON.stringify(bad)}`, () => {
    const params = new URLSearchParams({ view: bad, state: 'forbidden', theme: 'injected', locale: 'injected', density: 'injected' });
    assert.deepEqual(readPreviewOptions(params.toString()), { view: 'components', state: 'ready', theme: 'light', locale: 'zh-CN', density: 'compact' });
  });
}

test('state belongs to its view and URLs cannot add behavior', () => {
  assert.equal(readPreviewOptions('?view=settings&state=forbidden').state, 'ready');
  assert.equal(readPreviewOptions('?view=record-detail&state=partial').state, 'partial');
  assert.equal(readPreviewOptions('?view=settings&state=readonly&theme=dark&locale=en&density=comfortable').density, 'comfortable');
  assert.deepEqual(Object.keys(readPreviewOptions('?onload=evil&css=red&token=private')).sort(), ['density', 'locale', 'state', 'theme', 'view']);
});

test('fixtures are immutable synthetic records including long text, zero and negative amounts', () => {
  assert.ok(Object.isFrozen(customers));
  assert.ok(customers.every(record => Object.isFrozen(record) && record.email.endsWith('.example')));
  assert.equal(new Set(customers.map(record => record.id)).size, customers.length);
  assert.ok(customers.some(record => record.amount === 0));
  assert.ok(customers.some(record => record.amount < 0));
  assert.ok(customers.some(record => record.name.length > 40));
});

test('search supports both languages and preserves source values', () => {
  assert.equal(filterCustomers('  NORTHSTAR  ')[0]?.id, 'demo_002');
  assert.equal(filterCustomers('青岚')[0]?.id, 'demo_001');
  assert.equal(filterCustomers('billing@aster.example').length, 1);
  assert.equal(filterCustomers('no-such-customer').length, 0);
  assert.equal(filterCustomers('<img src=x onerror=alert(1)>').length, 0);
  assert.equal(filterCustomers('').length, 4);
});

test('settings fixtures use supported states and invalid seed is deliberately empty', () => {
  assert.equal(settingsSeed('invalid').name, '');
  assert.equal(settingsSeed('dirty').phase, 'dirty');
  assert.equal(settingsSeed('unsupported').phase, 'ready');
});

test('preview uses built components, not an external theme or new backend client', () => {
  const source = readFileSync(new URL('./Preview.svelte', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./preview.css', import.meta.url), 'utf8');
  for (const name of ['Input', 'Badge', 'FilterToolbar', 'DescriptionList', 'SettingsGroup', 'SettingsFieldRow', 'ContentPageShell']) assert.match(source, new RegExp(`import.*${name}.*packages/ui/dist/`));
  assert.doesNotMatch(source, /\bfetch\s*\(|localStorage|sessionStorage|\{@html|svadmin-u-/u);
  assert.doesNotMatch(css, /@(?:tailwind|theme|apply|source)\b|#[a-fA-F0-9]{3,8}\b|(?:rgb|hsl|oklch)\(/u);
  assert.match(source, /clearTimeout/u);
});


test('status and text filters intersect without modifying or expanding the dataset', () => {
  const pending = customers.filter(record => record.status === 'pending');
  assert.deepEqual(filterCustomers('', 'pending'), pending);
  assert.deepEqual(filterCustomers('Northstar', 'pending'), []);
  assert.equal(filterCustomers('Northstar', 'active')[0]?.id, 'demo_002');
  assert.equal(filterCustomers('', 'all').length, customers.length);
  for (const bad of ['__proto__', 'constructor', 'other']) assert.deepEqual(filterCustomers('', bad), []);
  assert.ok(Object.isFrozen(customers));
});
