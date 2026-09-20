import assert from 'node:assert/strict';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const root = new URL('../src/styled-system/', import.meta.url);
const index = new URL('types/index.d.ts', root);
const text = readFileSync(index, 'utf8');
// Panda augments its build-tool API here. Published helpers only need local generated types.
writeFileSync(index, text.replace(/^import ['"]\.\/global\.d\.ts['"];?\r?\n/m, ''));
rmSync(new URL('types/global.d.ts', root), { force: true });
for (const file of readdirSync(root, { recursive: true })) {
  if (!/\.(?:js|ts)$/.test(file)) continue;
  const source = readFileSync(new URL(file, root), 'utf8');
  assert.ok(!/@pandacss\//.test(source), `${file} leaks a Panda build-tool dependency`);
  assert.ok(!/['"]\.\/global\.d\.ts['"]/.test(source), `${file} still imports the build-time augmentation`);
}
console.info('Panda runtime helpers and declarations are independent of the build tool.');
