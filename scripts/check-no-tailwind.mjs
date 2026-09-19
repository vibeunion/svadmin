import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const compiler = /^(?:tailwindcss|@tailwindcss\/[^/]+|tw-animate-css)$/;
const dependencySections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
const stylesheetEntries = [
  'packages/ui/src/app.css',
  'packages/ai-elements/src/ai.css',
  'example/src/app.css',
  'packages/create-svadmin/template/src/app.css',
];

function packageName(specifier) {
  return specifier.match(/^((?:@[^/@\s]+\/)?[^/@\s]+)(?:@|$)/)?.[1];
}

export function assertNoCompilerDependencies(pkg, path = 'package.json') {
  for (const section of dependencySections) {
    for (const [name, specifier] of Object.entries(pkg[section] ?? {})) {
      assert.ok(!compiler.test(name), `${path}: ${section}.${name} reintroduces a removed compiler`);
      if (typeof specifier === 'string' && specifier.trim().startsWith('npm:')) {
        const target = packageName(specifier.trim().slice(4));
        assert.ok(!compiler.test(target ?? ''), `${path}: ${section}.${name} aliases removed compiler ${target}`);
      }
    }
  }
}

export function assertNoCompilerInLockfile(lock) {
  const entries = lock.matchAll(/("(?:[^"\\]|\\.)*")\s*:\s*\[\s*("(?:[^"\\]|\\.)*")?/g);
  for (const [, key, resolved] of entries) {
    const name = JSON.parse(key);
    const target = resolved ? packageName(JSON.parse(resolved)) : undefined;
    assert.ok(!compiler.test(name) && !compiler.test(target ?? ''), `Removed compiler remains in the lockfile: ${name} -> ${target ?? name}`);
  }
}

export function assertNoCompilerInStylesheet(css, path = 'stylesheet') {
  assert.ok(!/@(?:theme|source|apply|tailwind|utility|custom-variant|variant|config|plugin)\b/.test(css), `${path}: active compiler directive`);
  assert.ok(!/@import\s+(?:url\(\s*)?["']?(?:tailwindcss|@tailwindcss\/[^/\s"')]+|tw-animate-css)(?:[/\s"')]|$)/i.test(css), `${path}: compiler stylesheet import`);
}

export function checkNoTailwind(root = process.cwd()) {
  const paths = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const path of paths.filter((name) => name.endsWith('package.json'))) {
    assertNoCompilerDependencies(JSON.parse(readFileSync(join(root, path), 'utf8')), path);
  }
  for (const path of stylesheetEntries) {
    assertNoCompilerInStylesheet(readFileSync(join(root, path), 'utf8'), path);
  }
  assertNoCompilerInLockfile(readFileSync(join(root, 'bun.lock'), 'utf8'));
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  checkNoTailwind();
  console.info('No Tailwind compiler dependency or active stylesheet entry directive remains. Legacy opt-in theme metadata is allowed.');
}
