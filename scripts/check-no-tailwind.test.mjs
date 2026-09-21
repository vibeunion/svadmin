import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertNoCompilerDependencies, assertNoCompilerInLockfile, assertNoCompilerInStylesheet } from './check-no-tailwind.mjs';

test('allows authoring tooling and runtime recipes', () => {
  assert.doesNotThrow(() => assertNoCompilerDependencies({
    dependencies: { 'tailwind-variants': '3', 'bits-ui': '2' },
    devDependencies: { tailwindcss: '4', '@tailwindcss/cli': '4', 'shadcn-svelte': '1' },
  }));
});
test('rejects runtime compilers and Panda', () => {
  for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const pkg of ['tailwindcss', '@tailwindcss/vite', 'shadcn-svelte', '@pandacss/dev']) {
      assert.throws(() => assertNoCompilerDependencies({ [section]: { [pkg]: '1' } }));
    }
  }
});
test('checks lock dependency edges', () => {
  assert.doesNotThrow(() => assertNoCompilerInLockfile('{"workspaces":{"":{"devDependencies":{"tailwindcss":"4"}}},"packages":{"tailwindcss":["tailwindcss@4","",{}]}}'));
  assert.throws(() => assertNoCompilerInLockfile('{"packages":{"@pandacss/dev":["@pandacss/dev@1","",{}]}}'));
  assert.doesNotThrow(() => assertNoCompilerInLockfile('{"packages":{"tailwind-variants":["tailwind-variants@3","",{"peerDependencies":{"tailwindcss":"*"},"optionalPeers":["tailwindcss"]}]}}'));
});
test('rejects compiler metadata in published CSS', () => {
  for (const directive of ['theme', 'source', 'apply', 'tailwind', 'utility', 'custom-variant', 'config', 'plugin']) {
    assert.throws(() => assertNoCompilerInStylesheet(`@${directive} x;`));
  }
  assert.doesNotThrow(() => assertNoCompilerInStylesheet('@layer utilities {.x{color:var(--foreground)}}'));
});
