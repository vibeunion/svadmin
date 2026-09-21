import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { cssViolations, manifestViolations, lockViolations, moduleSpecifiers, auditNoTailwind } from './no-tailwind-contract.mjs';

test('rejects compiler packages outside devDependencies', () => {
  for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies', 'overrides', 'resolutions']) {
    for (const pkg of ['tailwindcss', '@tailwindcss/vite', '@tailwindcss/node', 'tw-animate-css']) assert.equal(manifestViolations({ [section]: { [pkg]: '1.0.0' } }).length, 1);
  }
});
test('npm aliases cannot hide removed packages', () => {
  assert.deepEqual(manifestViolations({ dependencies: { themeEngine: 'npm:tailwindcss@4.0.0' } }), ['dependencies.themeEngine']);
  assert.deepEqual(manifestViolations({ dependencies: { merge: 'npm:tailwindcss@4.0.0' } }), ['dependencies.merge']);
});
test('ordinary class joining, Bits UI and Tailwind build tooling are allowed', () => {
  assert.deepEqual(manifestViolations({
    dependencies: { 'bits-ui': '2', clsx: '2', cn: '0.2' },
    devDependencies: { 'tailwindcss': '4', 'shadcn-svelte': '1' },
    scripts: { check: 'node scripts/check-no-tailwind.mjs', styles: 'tailwindcss -i input.css' },
  }), []);
});
test('authoring and compiler packages are forbidden outside development tooling', () => {
  assert.deepEqual(manifestViolations({ dependencies: { 'tailwindcss': '4' } }), ['dependencies.tailwindcss']);
  assert.deepEqual(manifestViolations({ dependencies: { 'shadcn-svelte': '1' } }), ['dependencies.shadcn-svelte']);
  assert.deepEqual(manifestViolations({ dependencies: { '@pandacss/dev': '1' } }), ['dependencies.@pandacss/dev']);
});
test('allows Tailwind execution in build scripts', () => {
  assert.deepEqual(manifestViolations({ scripts: { generate: 'npx tailwindcss -i app.css' } }), []);
});
test('runtime recipes are allowed while compilers remain development-only', () => {
  for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    assert.deepEqual(manifestViolations({ [section]: { 'tailwind-variants': '3', recipes: 'npm:tailwind-variants@3' } }), []);
  }
  for (const pkg of ['tailwindcss', '@tailwindcss/vite', '@tailwindcss/node', 'tw-animate-css']) {
    assert.deepEqual(manifestViolations({ devDependencies: { [pkg]: '4' } }), []);
    assert.deepEqual(manifestViolations({ dependencies: { compiler: `npm:${pkg}@4` } }), ['dependencies.compiler']);
  }
});
test('all compiler CSS directives are rejected, including theme-only exports', () => {
  for (const directive of ['theme', 'source', 'apply', 'utility', 'custom-variant', 'tailwind', 'reference', 'variant', 'config', 'plugin', 'screen', 'responsive', 'variants']) assert.equal(cssViolations(`@${directive} x;`).length, 1);
});
test('normal CSS, media, property, layers and comments are accepted', () => {
  assert.deepEqual(cssViolations('/* @apply */ @layer components{.x{content:"@theme";color:var(--primary)}} @media(width>1px){.x{width:2px}} @property --x{syntax:"<color>";inherits:true;initial-value:red}'), []);
});
test('rejects compiler CSS imports in quoted and url notation', () => {
  for (const css of ['@import "tailwindcss";', '@import url("tailwindcss/preflight");', "@import /* comment */ 'tw-animate-css';"]) assert.equal(cssViolations(css).length, 1);
  assert.deepEqual(cssViolations('@import "./app.css";'), []);
});
test('resolved transitive dependencies and alias values are checked in Bun lockfiles', () => {
  const lock = '{"packages":{"streamdown-svelte":["streamdown-svelte@3",{}, {"dependencies":{"tailwind-merge":"3"}}],"merge":["tailwind-merge@3", "", {}]}}';
  assert.deepEqual(lockViolations(lock), []);
});
test('unrelated package names and versions are not mistaken for banned packages', () => {
  assert.deepEqual(lockViolations('{"packages":{"tailwindcss-other":["tailwindcss-other@1", "", {}]}}'), []);
});

test('runtime class merging remains allowed when supplied by a renderer dependency', () => {
  assert.deepEqual(manifestViolations({ dependencies: { 'tailwind-merge': '3.6.0' } }), []);
  assert.deepEqual(lockViolations('{"packages":{"tailwind-merge":["tailwind-merge@3.6.0", "", {}]}}'), []);
});

test('repository audit rejects CSS directives but allows generator configuration', () => {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-no-tailwind-'));
  try {
    const files = {
      'package.json': '{}', 'bun.lock': '{"packages":{}}',
      'packages/ai-elements/src/ai.theme.css': '@source "./components";',
      'packages/ui/src/Foo.svelte': '<style>.x { @apply px-2; }</style>',
      'packages/ui/components.json': '{"$schema":"https://shadcn-svelte.com/schema.json","tailwind":{}}',
    };
    for (const [path, text] of Object.entries(files)) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); }
    const results = auditNoTailwind(root, Object.keys(files));
    assert.equal(results.length, 2);
    assert.ok(results.some(x => x.includes('ai.theme.css')));
    assert.ok(results.some(x => x.includes('Foo.svelte')));
    assert.ok(!results.some(x => x.includes('components.json')));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('a missing lockfile cannot result in a clean bill of health', () => {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-no-tailwind-'));
  try { assert.match(auditNoTailwind(root, [])[0], /missing text lockfile/); }
  finally { rmSync(root, { recursive: true, force: true }); }
});

test('source parsing distinguishes real imports from comments and negative assertion strings', () => {
  assert.deepEqual(moduleSpecifiers(`// import 'tailwindcss';
    const example = '@import "tailwindcss"';
    const note = "require('tailwind-merge')";
    import { css } from '@pandacss/dev';`), ['@pandacss/dev']);
  assert.deepEqual(moduleSpecifiers(`import 'tailwindcss'; export { twMerge } from 'tailwind-merge'; require('tailwind-variants'); import('shadcn-svelte');`), ['tailwindcss', 'tailwind-merge', 'tailwind-variants', 'shadcn-svelte']);
});
test('Svelte script imports and imports nested in template expressions are audited', () => {
  assert.deepEqual(moduleSpecifiers('<p>import "tailwindcss"</p><script>import "tailwind-merge";</script>', 'Test.svelte'), ['tailwind-merge']);
  assert.deepEqual(moduleSpecifiers('const x = `result: ${import("tailwindcss")}`;'), ['tailwindcss']);
  assert.deepEqual(moduleSpecifiers('import x = require("tailwindcss");'), ['tailwindcss']);
});
test('unquoted CSS url imports and bundling-all metadata cannot bypass or crash the guard', () => {
  assert.deepEqual(cssViolations('@import url(tailwindcss);'), ['compiler import tailwindcss']);
  assert.deepEqual(manifestViolations({ bundledDependencies: true, dependencies: { tailwindcss: '4' } }), ['dependencies.tailwindcss']);
});

test('source parser handles exported loaders, escaped specifiers and regex literals', () => {
  assert.deepEqual(moduleSpecifiers("export const load = () => import('tailwindcss');"), ['tailwindcss']);
  assert.deepEqual(moduleSpecifiers(String.raw`import 'tailwind\u0063ss';`), ['tailwindcss']);
  assert.deepEqual(moduleSpecifiers("const pattern = /import('tailwindcss')/;"), []);
});
