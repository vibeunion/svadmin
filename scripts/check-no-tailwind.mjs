import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const compiler = /^(?:tailwindcss|@tailwindcss\/.+|tw-animate-css)$/;
for (const path of paths.filter((name) => name.endsWith('package.json'))) {
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const name of Object.keys(pkg[section] ?? {})) {
      assert.ok(!compiler.test(name), `${path}: ${section}.${name} reintroduces a removed compiler`);
    }
  }
}
for (const path of ['packages/ui/src/app.css', 'packages/ai-elements/src/ai.css', 'example/src/app.css']) {
  const css = readFileSync(path, 'utf8');
  assert.ok(!/@(?:theme|source|apply|tailwind|utility|custom-variant)\b/.test(css), `${path}: active compiler directive`);
  assert.ok(!/@import\s+["'](?:tailwindcss|tw-animate-css)/.test(css), `${path}: compiler stylesheet import`);
}
const lock = readFileSync('bun.lock', 'utf8');
assert.ok(!/^\s*"(?:tailwindcss|@tailwindcss\/[^"/]+|tw-animate-css)":\s*\[/m.test(lock), 'Removed compiler remains in the lockfile');
console.info('No Tailwind compiler dependency or active stylesheet entry directive remains. Legacy opt-in theme metadata is allowed.');
