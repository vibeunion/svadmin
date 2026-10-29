import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { cssProblems, forbiddenPackage, importProblems, manifestProblems, verifyVendorIntegrity } from './check-style-boundary.mjs';

test('forbids compiler runtime imports, including versioned aliases', () => {
  for (const value of ['tailwindcss', '@tailwindcss/vite', '@pandacss/dev', 'tw-animate-css', 'shadcn-svelte']) assert.equal(forbiddenPackage(value), true, value);
  assert.equal(forbiddenPackage('tailwind-variants@3'), false);
  for (const value of ['clsx', 'tailwind-merge@3.6.0', 'cn@0.2.4', 'cn-example', './cn.js']) assert.equal(forbiddenPackage(value), false, value);
});
test('inspects all manifest dependency kinds and nested overrides', () => {
  assert.equal(manifestProblems({ dependencies: { classes: 'npm:tailwind-merge@3' }, peerDependencies: { cn: '*' }, overrides: { consumer: { tailwindcss: '*' } } }).length, 1);
});
test('checks actual static and dynamic imports without mistaking migration text for execution', () => {
  assert.equal(importProblems("export { cn } from 'cn'; import('tailwind-merge'); require('@tailwindcss/vite');").length, 1);
  assert.deepEqual(importProblems('const example = "import { cn } from \'cn\'";'), []);
});
test('legacy CSS entry paths cannot hide compiler metadata', () => {
  assert.deepEqual(cssProblems('@theme inline { --color-primary: red } @source "./components";'), ['@theme', '@source']);
  assert.deepEqual(cssProblems('@layer theme { :root { --color-primary: red } } @media (min-width: 40rem) { .x { padding: 1rem } }'), []);
});

test('vendor integrity checks both upstream files and reviewed local patches', () => {
  const vendor = mkdtempSync(resolve(tmpdir(), 'svadmin-vendor-integrity-'));
  const original = 'export const value = 1;';
  const patched = 'export const value = 2;';
  const hash = value => createHash('sha256').update(value).digest('hex');
  const provenance = {
    originalFileHashes: { 'original.js': hash(original), 'patched.js': hash(original) },
    modifiedFiles: ['patched.js'],
    modifiedFileHashes: { 'patched.js': hash(patched) },
  };
  try {
    writeFileSync(resolve(vendor, 'provenance.json'), JSON.stringify(provenance));
    writeFileSync(resolve(vendor, 'original.js'), original);
    writeFileSync(resolve(vendor, 'patched.js'), patched);
    assert.doesNotThrow(() => verifyVendorIntegrity(vendor));
    writeFileSync(resolve(vendor, 'original.js'), patched);
    assert.throws(() => verifyVendorIntegrity(vendor), /source changed: original\.js/);
    writeFileSync(resolve(vendor, 'original.js'), original);
    writeFileSync(resolve(vendor, 'patched.js'), original);
    assert.throws(() => verifyVendorIntegrity(vendor), /source changed: patched\.js/);
    writeFileSync(resolve(vendor, 'patched.js'), patched);
    writeFileSync(resolve(vendor, 'provenance.json'), JSON.stringify({ ...provenance, modifiedFileHashes: {} }));
    assert.throws(() => verifyVendorIntegrity(vendor), /source changed: patched\.js/);
  } finally {
    rmSync(vendor, { recursive: true, force: true });
  }
});
