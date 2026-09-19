import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import postcss from 'postcss';

const require = createRequire(import.meta.url);
function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), 'svadmin-native-css-'));
  try {
    mkdirSync(join(dir, 'scripts'));
    mkdirSync(join(dir, 'src/styles'), { recursive: true });
    mkdirSync(join(dir, 'node_modules'));
    symlinkSync(dirname(require.resolve('postcss/package.json')), join(dir, 'node_modules/postcss'), 'dir');
    for (const script of ['build-static-css.mjs', 'retire-primitive-fallbacks.mjs']) copyFileSync(new URL(`./${script}`, import.meta.url), join(dir, `scripts/${script}`));
    writeFileSync(join(dir, 'src/styles/aliases.css'), ':root{--color-primary:var(--primary)}');
    writeFileSync(join(dir, 'src/app.css'), '@import "./styles/aliases.css";\n.first{color:red}\n@layer components{.second{color:blue}}');
    const build = () => execFileSync(process.execPath, [join(dir, 'scripts/build-static-css.mjs')], { encoding: 'utf8', stdio: 'pipe' });
    run({ dir, build });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
test('both public CSS paths contain identical native CSS without metadata', () => fixture(({ dir, build }) => {
  build();
  const plain = readFileSync(join(dir, 'dist/app.css'), 'utf8');
  assert.equal(readFileSync(join(dir, 'dist/app.theme.css'), 'utf8'), plain);
  postcss.parse(plain).walkAtRules(rule => assert.ok(!['theme', 'source', 'import', 'apply'].includes(rule.name)));
  assert.ok(plain.indexOf('.first') < plain.indexOf('.second'));
  assert.ok(plain.includes('--color-primary'));
}));
test('native CSS output is deterministic across repeated builds', () => fixture(({ dir, build }) => {
  build();
  const before = readFileSync(join(dir, 'dist/app.css'), 'utf8');
  build();
  assert.equal(readFileSync(join(dir, 'dist/app.css'), 'utf8'), before);
}));
test('compiler directives in nested imports fail the build', () => fixture(({ dir, build }) => {
  writeFileSync(join(dir, 'src/styles/aliases.css'), ':root{--color-primary:red}\n@theme {--x:red}');
  assert.throws(build, /Unexpected compiler directive @theme/);
}));
test('circular CSS imports fail instead of publishing partial styles', () => fixture(({ dir, build }) => {
  writeFileSync(join(dir, 'src/styles/aliases.css'), '@import "../app.css";');
  assert.throws(build, /Circular CSS import/);
}));
test('external imports cannot reintroduce a build-time CSS dependency', () => fixture(({ dir, build }) => {
  writeFileSync(join(dir, 'src/app.css'), '@import "tailwindcss";');
  assert.throws(build, /Only local plain-CSS imports/);
}));
test('source imports cannot escape the package', () => fixture(({ dir, build }) => {
  writeFileSync(join(dir, 'src/app.css'), '@import "../outside.css";');
  assert.throws(build, /CSS import escapes/);
}));

test('published primitive instances get styles from recipes, while legacy consumers keep fallback CSS', () => fixture(({ dir, build }) => {
  writeFileSync(join(dir, 'src/app.css'), '@import "./styles/aliases.css"; @import "./components.css";');
  writeFileSync(join(dir, 'src/components.css'), '@layer components{.svadmin-input{height:2.25rem}}');
  build();
  const css = readFileSync(join(dir, 'dist/app.css'), 'utf8');
  assert.ok(css.includes('.svadmin-input:not(:where(.svadmin-ui-input__control))'));
  assert.ok(css.includes('height:2.25rem'));
  assert.equal(readFileSync(join(dir, 'src/components.css'), 'utf8'), '@layer components{.svadmin-input{height:2.25rem}}');
}));
