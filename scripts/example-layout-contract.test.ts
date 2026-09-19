import { expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'svelte/compiler';
import utilityClasses from '../packages/ui/scripts/utility-class-map.json' with { type: 'json' };
import { assertExampleLayoutCss } from './example-layout-contract.js';

const root = resolve(import.meta.dir, '..');
const states = readFileSync(resolve(root, 'packages/ui/src/styles/conditional-states.css'), 'utf8');
const radius = '.svadmin-u-5f22e64f2282 { border-radius: var(--radius-lg) }';
const css = states + radius;

test('emitted layout contract requires both sidebar widths, logical responsive offsets and table radius', () => {
  expect(() => assertExampleLayoutCss(css)).not.toThrow();
  expect(() => assertExampleLayoutCss(css.replace('width: 70px', 'width: 71px'))).toThrow('collapsed sidebar width');
  expect(() => assertExampleLayoutCss(css.replace('margin-inline-start: 252px', 'margin-inline-start: 253px'))).toThrow('expanded desktop');
  expect(() => assertExampleLayoutCss(css.replace('@media (min-width: 48rem)', '@media (min-width: 80rem)'))).toThrow('desktop');
  expect(() => assertExampleLayoutCss(css.replace('margin-inline-end: 0;', 'margin-inline-end: 70px;'))).toThrow('mobile end');
  expect(() => assertExampleLayoutCss(states)).toThrow('table container radius');
});

function classDirectives(source: string): string[] {
  const result: string[] = [];
  function visit(node: unknown): void {
    if (node === null || typeof node !== 'object') return;
    if ('type' in node && node.type === 'ClassDirective' && 'name' in node && typeof node.name === 'string') result.push(node.name);
    for (const value of Object.values(node)) visit(value);
  }
  visit(parse(source, { modern: true }));
  return result;
}
function isLegacy(name: string): boolean {
  return Object.hasOwn(utilityClasses, name) || /[:[\]]/.test(name);
}

test('the Svelte AST gate detects directives rather than strings or comments', () => {
  expect(classDirectives('<div class:w-[70px]={true} class:md:ml-[70px]={true}></div>').filter(isLegacy)).toHaveLength(2);
  expect(classDirectives('<!-- class:w-[70px]={true} --><div class:svadmin-sidebar--collapsed={true}></div>').filter(isLegacy)).toEqual([]);
});
test('every production Svelte class directive uses owned native classes', () => {
  const problems: string[] = [];
  for (const directory of ['example/src', ...['ui', 'ai-elements', 'surface', 'flow', 'editor', 'lite'].map(name => `packages/${name}/src`)]) {
    for (const file of readdirSync(resolve(root, directory), { recursive: true })) {
      if (!file.endsWith('.svelte') || /\.(test|spec)[.-]/.test(file)) continue;
      for (const name of classDirectives(readFileSync(resolve(root, directory, file), 'utf8'))) {
        if (isLegacy(name)) problems.push(`${directory}/${file}: class:${name}`);
      }
    }
  }
  expect(problems).toEqual([]);
});
