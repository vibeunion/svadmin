import { expect, test } from 'bun:test';

test('published source consumers receive the CSV parser declarations without dev dependencies', async () => {
  const manifest = await Bun.file(new URL('../package.json', import.meta.url)).json();
  expect(manifest.types).toBe('src/index.ts');
  expect(manifest.dependencies.papaparse).toBeDefined();
  expect(manifest.dependencies['@types/papaparse']).toBe('^5.5.2');
  expect(manifest.peerDependencies?.['@types/papaparse']).toBeUndefined();
});
