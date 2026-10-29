import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const uiRoot = new URL('../packages/ui/', import.meta.url);
const componentSource = readFileSync(new URL('src/components/AboutSettings.svelte', uiRoot), 'utf8');

function fixture(version: string, run: (directory: string, stamp: () => void) => void): void {
  const directory = mkdtempSync(join(tmpdir(), 'svadmin-build-version-'));
  try {
    mkdirSync(join(directory, 'scripts'));
    mkdirSync(join(directory, 'dist/components'), { recursive: true });
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: '@svadmin/ui', version, files: ['dist'] }));
    writeFileSync(join(directory, 'dist/components/AboutSettings.svelte'), componentSource);
    copyFileSync(new URL('scripts/stamp-build-version.mjs', uiRoot), join(directory, 'scripts/stamp-build-version.mjs'));
    const stamp = () => {
      execFileSync('node', [join(directory, 'scripts/stamp-build-version.mjs')], { cwd: tmpdir(), stdio: 'pipe', timeout: 15_000 });
    };
    run(directory, stamp);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const version of ['1.2.3', '2.0.0-rc.1']) {
  test(`npm tarball embeds manifest version ${version} without changing the override`, () => {
    fixture(version, (directory, stamp) => {
      stamp();
      const packed = JSON.parse(execFileSync('npm', [
        'pack', '--ignore-scripts', '--json', '--pack-destination', directory,
      ], { cwd: directory, encoding: 'utf8', timeout: 30_000 }));
      const tarball = join(directory, packed[0].filename);
      const packedManifest = JSON.parse(execFileSync('tar', ['-xOf', tarball, 'package/package.json'], { encoding: 'utf8' }));
      const packedComponent = execFileSync('tar', [
        '-xOf', tarball, 'package/dist/components/AboutSettings.svelte',
      ], { encoding: 'utf8' });

      expect(packedManifest.version).toBe(version);
      expect(packedComponent).toBe(componentSource.replace(
        "const buildVersion = '__SVADMIN_VERSION__';",
        `const buildVersion = ${JSON.stringify(packedManifest.version)};`,
      ));
      expect(packedComponent).not.toContain('__SVADMIN_VERSION__');
      expect(packedComponent).toContain('const version = $derived(suppliedVersion ?? (');
    });
  });
}

test('version stamping is idempotent and leaves the development source untouched', () => {
  fixture('1.2.3', (directory, stamp) => {
    stamp();
    const firstBuild = readFileSync(join(directory, 'dist/components/AboutSettings.svelte'), 'utf8');
    stamp();
    expect(readFileSync(join(directory, 'dist/components/AboutSettings.svelte'), 'utf8')).toBe(firstBuild);
    expect(readFileSync(new URL('src/components/AboutSettings.svelte', uiRoot), 'utf8')).toBe(componentSource);
    expect(componentSource).toContain("const buildVersion = '__SVADMIN_VERSION__';");
  });
});

test('version stamping rejects a missing or stale placeholder', () => {
  fixture('1.2.3', (directory, stamp) => {
    for (const declaration of ['const buildVersion = "0.0.1";', 'const renamedVersion = "0.0.1";']) {
      const component = componentSource.replace("const buildVersion = '__SVADMIN_VERSION__';", declaration);
      writeFileSync(join(directory, 'dist/components/AboutSettings.svelte'), component);
      expect(stamp).toThrow('AboutSettings build version placeholder is missing');
      expect(readFileSync(join(directory, 'dist/components/AboutSettings.svelte'), 'utf8')).toBe(component);
    }
  });
});

test('version stamping rejects a missing or empty package version', () => {
  fixture('1.2.3', (directory, stamp) => {
    for (const version of [undefined, '', 123]) {
      writeFileSync(join(directory, 'package.json'), JSON.stringify({ version }));
      expect(stamp).toThrow('UI package version is required');
    }
  });
});

test('the UI build stamps the version after emitting Svelte components', () => {
  const manifest = JSON.parse(readFileSync(new URL('package.json', uiRoot), 'utf8'));
  expect(manifest.scripts.build).toMatch(/svelte-package\.js.*&& node scripts\/stamp-build-version\.mjs/);
});
