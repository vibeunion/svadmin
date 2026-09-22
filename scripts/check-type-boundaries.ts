import { readdirSync, readFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import policy from './type-boundaries.json';

const root = resolve(import.meta.dir, '..');
const ignored = new Set(['node_modules', 'dist', '.svelte-kit', 'build', '.git', 'styled-system', 'vendor']);
const failures: string[] = [];
const forbidden = /(?:^|[^\w])(?:@ts-ignore|@ts-nocheck)(?:$|[^\w])|:\s*any\b|<any>|as\s+any\b|Promise<any>/gu;

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (['.ts', '.svelte'].includes(extname(entry.name))
      && !entry.name.endsWith('.d.ts')
      && !entry.name.includes('.test.')
      && !entry.name.includes('.spec.')) files.push(path);
  }
  return files;
}

function explicitAnyCount(source: string): number {
  return [...source.matchAll(/:\s*any\b|<any>|as\s+any\b|Promise<any>/gu)].length;
}

for (const sourceRoot of policy.sourceRoots) {
  for (const path of walk(resolve(root, sourceRoot))) {
    const name = relative(root, path);
    const source = readFileSync(path, 'utf8');
    const matches = [...source.matchAll(forbidden)];
    const anyCount = explicitAnyCount(source);
    const baseline = policy.legacyAny[name as keyof typeof policy.legacyAny];
    if (anyCount > 0 && baseline === undefined) {
      failures.push(`${name}: new explicit any boundary; use unknown or add a reviewed runtime adapter`);
    } else if (baseline !== undefined && anyCount > baseline) {
      failures.push(`${name}: explicit any count ${anyCount} exceeds reviewed baseline ${baseline}`);
    }
    if (matches.some(match => match[0].includes('@ts-ignore') || match[0].includes('@ts-nocheck'))) {
      failures.push(`${name}: @ts-ignore and @ts-nocheck are forbidden in production sources`);
    }
  }
}

if (failures.length > 0) throw new Error(`Type boundary check failed:\n${failures.join('\n')}`);
console.info('Type boundaries passed; no new production any or compiler suppressions detected.');
