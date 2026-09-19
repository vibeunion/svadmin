import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classFootprints } from './build-native-classnames.mjs';

const css = '@layer utilities { .narrow { width: 1rem } .wide { width: 2rem } .size { width: 2rem; height: 2rem } .hover { &:hover { width: 2rem } } @media (min-width: 40rem) { .responsive { width: 2rem } } .important { width: 3rem !important } }';
test('finite CSS metadata recognizes matching properties, not class-name spelling', () => {
  const table = classFootprints(css);
  assert.deepEqual(table.get('narrow'), table.get('wide'));
  assert.equal(table.get('size').size, 2);
  assert.notDeepEqual(table.get('wide'), table.get('hover'));
  assert.notDeepEqual(table.get('wide'), table.get('responsive'));
  assert.notDeepEqual(table.get('wide'), table.get('important'));
});
test('semantic selectors and inherited themes are not treated as utility conflicts', () => {
  const table = classFootprints('@layer theme { .dark { color: red } } @layer utilities { .parent .child { color: red } }');
  assert.equal(table.size, 0);
});
