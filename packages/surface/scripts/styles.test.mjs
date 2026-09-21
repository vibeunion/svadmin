import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
const editor = readFileSync(resolve(root, 'src/styles/editor.css'), 'utf8');
const recipes = readFileSync(resolve(root, 'src/recipes.ts'), 'utf8');

for (const value of [
  'svadmin-surface-metric__root', 'svadmin-surface-metric__card',
  'svadmin-surface-table__root', 'svadmin-surface-table__cell',
]) {
  assert.ok(css.includes(value), `missing recipe selector: ${value}`);
}
for (const value of ['compact', 'comfortable', 'primary', 'secondary']) {
  assert.ok(editor.includes(value), `missing editor variant: ${value}`);
}
assert.doesNotMatch(css, /@(?:import|tailwind|theme|apply)\b/u);
assert.doesNotMatch(editor, /@(?:import|tailwind|theme|apply)\b/u);
assert.doesNotMatch(recipes, /styled-system|@pandacss/u);
