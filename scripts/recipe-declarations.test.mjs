import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyRecipeDeclarations } from './check-recipe-declarations.mjs';
const record = (base) => [{ name: 'control', className: 'compiled', base }];
test('requires every declaration, not just a nonempty class', () => {
  assert.throws(() => verifyRecipeDeclarations(record({ padding: '1rem', color: 'red' }), '.compiled { padding: 1rem }'), /dropped or changed/);
});
test('checks values and important flags', () => {
  assert.throws(() => verifyRecipeDeclarations(record({ color: 'red !important' }), '.compiled { color: red }'), /dropped or changed/);
  assert.throws(() => verifyRecipeDeclarations(record({ color: 'red' }), '.compiled { color: blue }'), /dropped or changed/);
});
test('checks nested declarations and retains originals alongside vendor prefixes', () => {
  assert.equal(verifyRecipeDeclarations(record({ '@media (hover: hover)': { '&:hover': { appearance: 'none' } } }), '@media (hover: hover) { .compiled:hover { appearance: none; -webkit-appearance: none } }'), 1);
});
test('normalizes zero lengths without changing quoted text or custom-property units', () => {
  assert.equal(verifyRecipeDeclarations(record({ padding: '0' }), '.compiled { padding: 0px }'), 1);
  assert.throws(() => verifyRecipeDeclarations(record({ content: '"a  b"' }), '.compiled { content: "a b" }'), /dropped or changed/);
  assert.throws(() => verifyRecipeDeclarations(record({ '--value': '0' }), '.compiled { --value: 0px }'), /dropped or changed/);
});
test('recognizes numeric spelling and flex percent-basis expansion, not a changed basis', () => {
  assert.equal(verifyRecipeDeclarations(record({ '--scale': '.5', flex: '1' }), '.compiled { --scale: 0.5; flex: 1 1 0% }'), 2);
  assert.throws(() => verifyRecipeDeclarations(record({ flex: '1' }), '.compiled { flex: 1 1 0px }'), /dropped or changed/);
  assert.throws(() => verifyRecipeDeclarations(record({ '--scale': '.5' }), '.compiled { --scale: 0.6 }'), /dropped or changed/);
});
