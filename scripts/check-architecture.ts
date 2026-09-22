import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import policy from './architecture-boundaries.json';

const root = resolve(import.meta.dir, '..');
const ignored = new Set(['node_modules', 'dist', '.svelte-kit', 'build', '.git', 'styled-system']);
const failures: string[] = [];

function checkFeatureRoots(): void {
  const legacyPages = resolve(root, 'example/src/pages');
  if (existsSync(legacyPages) && readdirSync(legacyPages).length > 0) {
    failures.push('example/src/pages: legacy page directory is forbidden; add new pages under example/src/features/<module>');
  }

  const featuresRoot = resolve(root, 'example/src/features');
  if (!existsSync(featuresRoot)) return;
  for (const entry of readdirSync(featuresRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const entrypoint = resolve(featuresRoot, entry.name, 'index.ts');
    if (!existsSync(entrypoint)) {
      failures.push(`example/src/features/${entry.name}: every feature must expose a public index.ts entrypoint`);
    }
  }
}

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (['.ts', '.svelte'].includes(extname(entry.name))
      && !entry.name.endsWith('.d.ts')
      && !path.includes('.test.')
      && !path.includes('.spec.')) files.push(path);
  }
  return files;
}

function checkSize(path: string): void {
  const name = relative(root, path);
  const lines = readFileSync(path, 'utf8').split(/\r?\n/u).length;
  const baseline = policy.largeFileBaseline[name as keyof typeof policy.largeFileBaseline];
  if (baseline !== undefined) {
    if (lines > baseline) failures.push(`${name}: ${lines} lines exceeds baseline ${baseline}`);
  } else if (lines > policy.maxSourceLines) {
    failures.push(`${name}: ${lines} lines exceeds module limit ${policy.maxSourceLines}`);
  }
}

function checkFeatureImports(path: string): void {
  const name = relative(root, path);
  const feature = name.match(/^(?:example\/src|packages\/[^/]+\/src)\/features\/([^/]+)\//u)?.[1];
  if (feature === undefined) return;
  const source = readFileSync(path, 'utf8');
  for (const match of source.matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/gu)) {
    const specifier = match[1];
    if (specifier === undefined || !specifier.startsWith('.')) continue;
    const target = relative(root, resolve(dirname(path), specifier)).replace(/\\/gu, '/');
    const targetFeature = target.match(/^(?:example\/src|packages\/[^/]+\/src)\/features\/([^/]+)\//u)?.[1];
    if (targetFeature !== undefined && targetFeature !== feature) {
      failures.push(`${name}: private feature import crosses ${feature} -> ${targetFeature}`);
    }
  }
}

function checkFeaturePublicImports(path: string): void {
  const name = relative(root, path);
  const sourceFeature = name.match(/^(?:example\/src|packages\/[^/]+\/src)\/features\/([^/]+)\//u)?.[1];
  const source = readFileSync(path, 'utf8');
  for (const match of source.matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/gu)) {
    const specifier = match[1];
    if (specifier === undefined || !specifier.startsWith('.')) continue;
    const target = relative(root, resolve(dirname(path), specifier)).replace(/\\/gu, '/');
    const targetMatch = target.match(/^(?:example\/src|packages\/[^/]+\/src)\/features\/([^/]+)\/(.+)$/u);
    if (targetMatch === null || targetMatch[1] === sourceFeature) continue;
    const entry = targetMatch[2].replace(/\.(?:js|ts|svelte)$/u, '');
    if (entry !== 'index' && entry !== 'data') {
      failures.push(`${name}: feature import must use public index.ts or data.ts, got ${specifier}`);
    }
  }
}

checkFeatureRoots();
const files = policy.sourceRoots.flatMap(sourceRoot => walk(resolve(root, sourceRoot)));
for (const file of files) {
  checkSize(file);
  checkFeatureImports(file);
  checkFeaturePublicImports(file);
}
if (failures.length > 0) throw new Error(`Architecture boundary check failed:\n${failures.join('\n')}`);
console.info(`Architecture boundaries passed for ${files.length} source files.`);
