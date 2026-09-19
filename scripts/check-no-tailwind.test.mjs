import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assertNoCompilerDependencies,
  assertNoCompilerInLockfile,
  assertNoCompilerInStylesheet,
} from './check-no-tailwind.mjs';

for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const name of ['tailwindcss', '@tailwindcss/vite', '@tailwindcss/postcss', 'tw-animate-css']) {
    test(`${section} rejects ${name} both directly and through npm aliases`, () => {
      assert.throws(() => assertNoCompilerDependencies({ [section]: { [name]: '^4' } }), /removed compiler/);
      for (const target of [`npm:${name}`, `npm:${name}@latest`, `npm:${name}@^4`]) {
        assert.throws(() => assertNoCompilerDependencies({ [section]: { 'css-build': target } }), /aliases removed compiler/);
      }
    });
  }
}

test('allows Panda, Bits UI and unrelated scoped npm aliases', () => {
  assert.doesNotThrow(() => assertNoCompilerDependencies({
    dependencies: { 'bits-ui': '^2', '@svadmin/ui': 'workspace:*' },
    devDependencies: { '@pandacss/dev': '^1', '@typescript/native': 'npm:typescript@^7' },
  }));
});

for (const [name, lock] of [
  ['direct compiler', '{"packages":{"tailwindcss":["tailwindcss@4", "", {}]}}'],
  ['alias key', '{"packages":{"css-build":["tailwindcss@4", "", {}]}}'],
  ['scoped alias', '{"packages":{"css-build":["@tailwindcss/vite@4", "", {}]}}'],
  ['nested dependency', '{"packages":{"plugin/tailwindcss":["tailwindcss@4", "", {}]}}'],
  ['nested scoped dependency', '{"packages":{"plugin/@tailwindcss/oxide":["@tailwindcss/oxide@4", "", {}]}}'],
  ['escaped resolved name', String.raw`{"packages":{"css-build":["\u0074ailwindcss@4", "", {}]}}`],
  ['multiline JSONC tuple', '{\n"packages": {\n"css-build": [\n"tw-animate-css@1", "", {},\n],\n},\n}'],
  ['compiler key without resolved name', '{"packages":{"tailwindcss":[]}}'],
]) {
  test(`lockfile rejects ${name}`, () => {
    assert.throws(() => assertNoCompilerInLockfile(lock), /Removed compiler remains/);
  });
}

test('allows unrelated resolved packages without executing lockfile text', () => {
  assert.doesNotThrow(() => assertNoCompilerInLockfile(`{
    "packages": {
      "@typescript/native": ["typescript@7", "", {}],
      "@pandacss/dev": ["@pandacss/dev@1", "", {}],
      "unrelated": ["tailwindcss-compatible@1", "", {}],
    },
  }`));
});

for (const directive of ['theme', 'source', 'apply', 'tailwind', 'utility', 'custom-variant', 'variant', 'config', 'plugin']) {
  test(`plain CSS rejects @${directive}`, () => {
    assert.throws(() => assertNoCompilerInStylesheet(`@${directive} "example";`), /active compiler directive/);
  });
}

for (const css of [
  '@import "tailwindcss";',
  "@import 'tw-animate-css';",
  '@import "tailwindcss/theme.css";',
  '@import url("tailwindcss");',
  '@import url(tailwindcss/utilities.css);',
  '@import url( "@tailwindcss/forms" );',
]) {
  test(`plain CSS rejects ${css}`, () => {
    assert.throws(() => assertNoCompilerInStylesheet(css), /compiler stylesheet import/);
  });
}

test('preserves plain compatibility CSS, theme variables and similarly named local imports', () => {
  assert.doesNotThrow(() => assertNoCompilerInStylesheet(`
    @import "@svadmin/ui/app.css";
    @import "./tailwindcss-baseline.css";
    @import "tailwindcss-compatible";
    :root { --tw-shadow: 0 0 transparent; }
    .svadmin-u-flex { display: flex; }
    @media (min-width: 40rem) { .svadmin-u-flex { gap: 1rem; } }
  `));
});

const guardPath = fileURLToPath(new URL('./check-no-tailwind.mjs', import.meta.url));
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-no-tailwind-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = {
    'package.json': '{"name":"fixture","devDependencies":{"@pandacss/dev":"^1"}}',
    'bun.lock': '{"packages":{"@pandacss/dev":["@pandacss/dev@1", "", {}]}}',
    'packages/ui/src/app.css': '.svadmin-u-flex { display: flex; } :root { --tw-shadow: none; }',
    'packages/ai-elements/src/ai.css': '.ai { display: block; }',
    'example/src/app.css': '@import "@svadmin/ui/app.css";',
    'packages/create-svadmin/template/src/app.css': '@import "@svadmin/ui/app.css";',
    // #427 仍保留显式选择的宿主元数据；不能误删兼容入口来让门禁通过。
    'packages/ui/src/app.theme.css': '@source "./components"; @theme { --color-primary: var(--primary); }',
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  execFileSync('git', ['init', '--quiet', root]);
  execFileSync('git', ['add', '.'], { cwd: root });
  return root;
}

function runGuard(root) {
  const result = spawnSync(process.execPath, [guardPath], { cwd: root, encoding: 'utf8' });
  assert.ifError(result.error);
  return result;
}

test('CLI accepts a compiler-free repository with legacy opt-in theme metadata', (t) => {
  const result = runGuard(fixture(t));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No Tailwind compiler dependency/);
});

test('CLI rejects a renamed compiler even with a harmless lockfile key', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'package.json'), '{"devDependencies":{"css-build":"npm:tailwindcss@4"}}');
  writeFileSync(join(root, 'bun.lock'), '{"packages":{"css-build":["tailwindcss@4", "", {}]}}');
  const result = runGuard(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /aliases removed compiler tailwindcss/);
});

test('CLI rejects transitive compiler resolution without a manifest dependency', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'bun.lock'), '{"packages":{"plugin/css-build":["@tailwindcss/vite@4", "", {}]}}');
  const result = runGuard(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Removed compiler remains in the lockfile/);
});

test('CLI includes generated application stylesheet templates in the boundary', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'packages/create-svadmin/template/src/app.css'), '@import url("tailwindcss");');
  const result = runGuard(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /packages\/create-svadmin\/template\/src\/app.css: compiler stylesheet import/);
});
