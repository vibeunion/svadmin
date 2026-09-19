import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8');

test('the example loads one canonical UI stylesheet and the generated example output', () => {
  const app = read('example/src/App.svelte');
  const css = read('example/src/app.css');
  expect(read('example/src/main.ts')).toContain("import './app.css';");
  expect(css.match(/@import ["']@svadmin\/ui\/app\.css["'];/g)).toHaveLength(1);
  expect(app).not.toMatch(/import ["']@svadmin\/ui\/app(?:\.theme)?\.css["']/);
  expect(app).toContain("import '@svadmin/ai-elements/ai.css';");
  expect(css).toContain('@import "../styles/compatibility.css";');
  expect(existsSync(resolve(root, 'example/styles/compatibility.css'))).toBe(true);
  expect(existsSync(resolve(root, 'example/src/compatibility.css'))).toBe(false);
  expect(read('scripts/build-migrated-ui.mjs')).toContain('example/styles/compatibility.css');
  expect(read('.github/workflows/ui-panda-complete.yml')).toContain('example/styles/compatibility.css');
});
