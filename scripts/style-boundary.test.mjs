import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cssProblems, forbiddenPackage, importProblems, manifestProblems } from './check-style-boundary.mjs';

test('forbids compiler packages and class engines, including versioned aliases', () => {
  for (const value of ['tailwindcss', '@tailwindcss/vite', 'tailwind-merge@3.6.0', 'npm:tailwind-variants@1', 'tw-animate-css', 'cn@0.2.4']) assert.equal(forbiddenPackage(value), true, value);
  for (const value of ['clsx', '@pandacss/dev', 'cn-example', './cn.js']) assert.equal(forbiddenPackage(value), false, value);
});
test('inspects all manifest dependency kinds and nested overrides', () => {
  assert.equal(manifestProblems({ dependencies: { classes: 'npm:tailwind-merge@3' }, peerDependencies: { cn: '*' }, overrides: { consumer: { tailwindcss: '*' } } }).length, 3);
});
test('checks actual static and dynamic imports without mistaking migration text for execution', () => {
  assert.equal(importProblems("export { cn } from 'cn'; import('tailwind-merge'); require('@tailwindcss/vite');").length, 3);
  assert.deepEqual(importProblems('const example = "import { cn } from \'cn\'";'), []);
});
test('legacy CSS entry paths cannot hide compiler metadata', () => {
  assert.deepEqual(cssProblems('@theme inline { --color-primary: red } @source "./components";'), ['@theme', '@source']);
  assert.deepEqual(cssProblems('@layer theme { :root { --color-primary: red } } @media (min-width: 40rem) { .x { padding: 1rem } }'), []);
});
