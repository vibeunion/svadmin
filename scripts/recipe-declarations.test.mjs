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
test('checks nested conditions and permits browser-prefix equivalents alongside originals', () => {
  assert.equal(verifyRecipeDeclarations(record({ '@media (hover: hover)': { '&:hover': { appearance: 'none' } } }), '@media (hover: hover) { .compiled:hover { appearance: none; -webkit-appearance: none } }'), 1);
});
test('normalizes zero lengths without changing quoted text', () => {
  assert.equal(verifyRecipeDeclarations(record({ padding: '0' }), '.compiled { padding: 0px }'), 1);
  assert.throws(() => verifyRecipeDeclarations(record({ content: '"a  b"' }), '.compiled { content: "a b" }'), /dropped or changed/);
});
