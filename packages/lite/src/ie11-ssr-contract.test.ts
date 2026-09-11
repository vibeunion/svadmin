import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

describe('IE11 SSR source contract', () => {
  function withoutComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/<!--[\s\S]*?-->/gu, '');
  }

  function findUnsupportedCss(source: string): string[] {
    const cleanSource = withoutComments(source);
    const unsupportedPatterns: Array<[string, RegExp]> = [
      ['CSS custom properties', /\bvar\s*\(/u],
      ['oklch/oklab colors', /\b(?:oklch|oklab)\s*\(/iu],
      ['color-mix', /\bcolor-mix\s*\(/iu],
      ['CSS Grid', /display\s*:\s*grid\b/iu],
      ['flex gap', /\bgap\s*:/iu],
      ['focus-visible', /:focus-visible\b/iu],
      ['selector helpers', /:(?:is|where|has)\s*\(/iu],
      ['backdrop-filter', /\bbackdrop-filter\s*:/iu],
      ['appearance', /\bappearance\s*:/iu],
    ];

    return unsupportedPatterns
      .filter(([, pattern]) => pattern.test(cleanSource))
      .map(([label]) => label);
  }

  test('keeps component markup independent from unsupported disclosure and layout features', async () => {
    const componentRoot = resolve(import.meta.dir, 'components');
    const componentFiles = Array.fromAsync(
      new Bun.Glob('**/*.svelte').scan({ cwd: componentRoot, absolute: true }),
    );
    const unsupportedMarkup: string[] = [];

    for (const componentFile of await componentFiles) {
      const componentSource = await readFile(componentFile, 'utf8');
      if (/<(?:details|summary)\b/u.test(componentSource)
        || /<span\b[^>]*class="[^"]*lite-confirm(?:\s|")/u.test(componentSource)
        || /display\s*:\s*grid\b/u.test(componentSource)
        || /\bgap\s*:/u.test(componentSource)) {
        unsupportedMarkup.push(componentFile.slice(componentRoot.length + 1));
      }
    }

    expect(unsupportedMarkup).toEqual([]);

    const liteStyles = await readFile(resolve(import.meta.dir, 'lite.css'), 'utf8');
    expect(liteStyles).not.toMatch(/display\s*:\s*grid\b/u);
    expect(liteStyles).not.toMatch(/\bgap\s*:/u);
  });

  test('keeps every Lite component style within the IE11 CSS baseline', async () => {
    const componentRoot = resolve(import.meta.dir, 'components');
    const sourceFiles = [
      resolve(import.meta.dir, 'lite.css'),
      ...await Array.fromAsync(
        new Bun.Glob('**/*.svelte').scan({ cwd: componentRoot, absolute: true }),
      ),
    ];
    const violations: string[] = [];

    for (const sourceFile of sourceFiles) {
      const unsupported = findUnsupportedCss(await readFile(sourceFile, 'utf8'));
      if (unsupported.length > 0) {
        violations.push(`${sourceFile.slice(resolve(import.meta.dir).length + 1)}: ${unsupported.join(', ')}`);
      }
    }

    expect(violations).toEqual([]);
  });

  test('keeps shared button state attributes on IE11-safe Lite controls', async () => {
    const buttonRoot = resolve(import.meta.dir, 'components', 'buttons');
    const buttonFiles = Array.fromAsync(
      new Bun.Glob('*.svelte').scan({ cwd: buttonRoot, absolute: true }),
    );
    const missingStateAttributes: string[] = [];

    for (const buttonFile of await buttonFiles) {
      const source = await readFile(buttonFile, 'utf8');
      if (!source.includes('data-svadmin-button')
        || !source.includes('data-variant=')
        || !source.includes('data-size=')) {
        missingStateAttributes.push(buttonFile.slice(buttonRoot.length + 1));
      }
    }

    expect(missingStateAttributes).toEqual([]);
  });
  test('keeps the SvelteKit example server-rendered without client hydration', async () => {
    const routeOptions = await readFile(
      resolve(import.meta.dir, '../example/src/routes/lite/+layout.ts'),
      'utf8',
    );
    const appTemplate = await readFile(
      resolve(import.meta.dir, '../example/src/app.html'),
      'utf8',
    );
    const exampleRouteRoot = resolve(import.meta.dir, '../example/src/routes/lite');
    const exampleRouteFiles = Array.fromAsync(
      new Bun.Glob('**/*.svelte').scan({ cwd: exampleRouteRoot, absolute: true }),
    );
    const incompatibleExampleRoutes: string[] = [];
    for (const routeFile of await exampleRouteFiles) {
      const routeSource = await readFile(routeFile, 'utf8');
      if (/display\s*:\s*grid\b/u.test(routeSource) || /\bgap\s*:/u.test(routeSource)) {
        incompatibleExampleRoutes.push(routeFile.slice(exampleRouteRoot.length + 1));
      }
    }

    expect(routeOptions).toContain('export const ssr = true');
    expect(routeOptions).toContain('export const csr = false');
    expect(appTemplate).not.toContain('display: contents');
    expect(incompatibleExampleRoutes).toEqual([]);
  });

  test('keeps the published Lite stylesheet within the same IE11 CSS baseline', async () => {
    const distStyles = await readFile(resolve(import.meta.dir, '../dist/lite.css'), 'utf8');
    expect(findUnsupportedCss(distStyles)).toEqual([]);
  });

  test('keeps compatibility helpers free of eager browser globals', async () => {
    const compatibilitySource = await readFile(
      resolve(import.meta.dir, 'compatibility.ts'),
      'utf8',
    );
    expect(compatibilitySource).not.toMatch(/\b(?:window|document)\s*\./u);
    expect(compatibilitySource).not.toMatch(/\bglobalThis\s*\./u);
  });

  test('keeps optional enhancement asset in the IE11 ES5 baseline', async () => {
    const enhancementSource = await readFile(
      resolve(import.meta.dir, '../static/enhance.js'),
      'utf8',
    );

    expect(enhancementSource).not.toMatch(/\b(?:let|const|class)\b/u);
    expect(enhancementSource).not.toMatch(/=>/u);
    expect(enhancementSource).not.toMatch(/[`]/u);
    expect(enhancementSource).not.toMatch(/\?\./u);
    expect(enhancementSource).not.toMatch(/\?\?/u);
    expect(enhancementSource).not.toMatch(/\b(?:Promise|fetch|Map|Set|WeakMap|WeakSet)\b/u);
    expect(enhancementSource).not.toMatch(/\b(?:async|await)\b/u);
  });

  test('keeps optional polyfill asset in the IE11 ES5 baseline', async () => {
    const polyfillSource = await readFile(
      resolve(import.meta.dir, 'polyfill-entry.ts'),
      'utf8',
    );
    const packageManifest = await readFile(resolve(import.meta.dir, '../package.json'), 'utf8');

    expect(polyfillSource).toContain("import 'core-js/stable'");
    expect(polyfillSource).toContain("import 'whatwg-fetch'");
    expect(packageManifest).toContain('--target=es5');
  });

  test('publishes the optional legacy assets', async () => {
    const packageManifest = await readFile(resolve(import.meta.dir, '../package.json'), 'utf8');
    expect(packageManifest).toContain('"./polyfill.js"');
    expect(packageManifest).toContain('--bundle src/polyfill-entry.ts --target=es5 --outfile=dist/polyfill.js');
  });

  test('keeps the real SSR response check in the default CI gate', async () => {
    const rootPackage = await readFile(resolve(import.meta.dir, '../../../package.json'), 'utf8');
    const continuousIntegration = await readFile(
      resolve(import.meta.dir, '../../../.github/workflows/ci.yml'),
      'utf8',
    );

    expect(rootPackage).toContain('"check:lite:ssr"');
    expect(continuousIntegration).toContain('bun run check:lite:ssr');
  });
});
