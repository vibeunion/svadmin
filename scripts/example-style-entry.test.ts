import { expect, test } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';

const root = resolve(import.meta.dir, '..');
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8');

test('active workflows use current native style and recipe entry points', () => {
  for (const file of readdirSync(resolve(root, '.github/workflows'))) {
    if (!/\.ya?ml$/.test(file)) continue;
    const workflow = read(`.github/workflows/${file}`);
    expect(workflow).not.toMatch(/packages\/surface\/scripts\/(?:prepare-design|build-editor-styles)\.mjs/);
    expect(workflow).not.toMatch(/packages\/ui\/scripts\/(?:product|primitive|content)-recipes\.test\.mjs/);
    expect(workflow).not.toMatch(/packages\/ui\/design\/(?:product|primitive|content)-recipes\.ts/);
  }
  for (const file of ['surface-contracts.yml', 'svar-grid.yml']) {
    expect(read(`.github/workflows/${file}`)).toContain('bun run --cwd packages/ui build\n');
  }
  expect(read('.github/workflows/stripe-first-browser-specimens.yml'))
    .toContain('node --test packages/ui/scripts/tailwind-recipes.test.mjs');
});

test('the example loads one canonical UI stylesheet and the generated example output', () => {
  const app = read('example/src/App.svelte');
  const css = read('example/src/app.css');
  expect(read('example/src/main.ts')).toContain("import './app.css';");
  expect(css).toContain('@import "@svadmin/ui/app.css";');
  expect(css).toContain('@import "tailwindcss/theme.css" layer(theme);');
  expect(css).toContain('@import "tailwindcss/utilities.css" layer(utilities) source(none);');
  expect(app).not.toMatch(/import ["']@svadmin\/ui\/app(?:\.theme)?\.css["']/);
  expect(app).toContain("import '@svadmin/ai-elements/ai.css';");
  expect(css).toContain('@import "../styles/compatibility.css";');
  expect(existsSync(resolve(root, 'example/styles/compatibility.css'))).toBe(true);
  expect(existsSync(resolve(root, 'example/src/compatibility.css'))).toBe(false);
  expect(read('scripts/check-native-style-sources.mjs')).toContain('example/styles/compatibility.css');
  expect(read('.github/workflows/ui-styles.yml')).toContain('example/styles/compatibility.css');
});

test('example authoring utilities use the same semantic mappings as UI recipes', () => {
  function themeMappings(path: string): Record<string, string> {
    const mappings: Record<string, string> = {};
    postcss.parse(read(path)).walkAtRules('theme', rule => {
      rule.walkDecls(declaration => { mappings[declaration.prop] = declaration.value; });
    });
    return mappings;
  }
  const example = themeMappings('example/src/app.css');
  expect(example['--color-primary']).toBe('var(--primary)');
  expect(example).toEqual(themeMappings('packages/ui/styles/tailwind.css'));
});
