import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

describe('IE11 SSR source contract', () => {
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

  test('keeps compatibility helpers free of eager browser globals', async () => {
    const compatibilitySource = await readFile(
      resolve(import.meta.dir, 'compatibility.ts'),
      'utf8',
    );
    expect(compatibilitySource).not.toMatch(/\b(?:window|document)\s*\./u);
    expect(compatibilitySource).not.toMatch(/\bglobalThis\s*\./u);
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
