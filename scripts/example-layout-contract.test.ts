import { expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'svelte/compiler';
import utilityClasses from '../packages/ui/scripts/utility-class-map.json' with { type: 'json' };
import { assertExampleLayoutCss } from './example-layout-contract.js';

const root = resolve(import.meta.dir, '..');
const states = readFileSync(resolve(root, 'packages/ui/src/app.css'), 'utf8');
const radius = '.svadmin-u-5f22e64f2282 { border-radius: var(--radius-lg) }';
const css = states + radius;

test('emitted layout contract requires actual sidebar hooks, width bindings and table radius', () => {
  expect(() => assertExampleLayoutCss(css)).not.toThrow();
  expect(() => assertExampleLayoutCss(css.replace('--svadmin-sidebar-width: 70px', '--svadmin-sidebar-width: 71px'))).toThrow('collapsed sidebar width');
  expect(() => assertExampleLayoutCss(css.replace('--svadmin-sidebar-width: 252px', '--svadmin-sidebar-width: 253px'))).toThrow('expanded sidebar width');
  expect(() => assertExampleLayoutCss(css.replace('width: var(--svadmin-sidebar-width)', 'width: 252px'))).toThrow('width binding');
  expect(() => assertExampleLayoutCss(states)).toThrow('table container radius');
});

test('desktop, mobile and RTL offsets retain exact breakpoint and direction coverage', () => {
  expect(() => assertExampleLayoutCss(css.replaceAll('margin-left: 252px', 'margin-left: 253px'))).toThrow('expanded desktop');
  expect(() => assertExampleLayoutCss(css.replaceAll('margin-left: 70px', 'margin-left: 71px'))).toThrow('collapsed desktop');
  expect(() => assertExampleLayoutCss(css.replaceAll('(min-width: 768px)', '(min-width: 769px)'))).toThrow('desktop');
  expect(() => assertExampleLayoutCss(css.replaceAll('(max-width: 767px)', '(max-width: 766px)'))).toThrow('mobile');
  expect(() => assertExampleLayoutCss(css.replaceAll('margin-right: 0;', 'margin-right: 70px;'))).toThrow('mobile margin-right');
  expect(() => assertExampleLayoutCss(css.replaceAll('margin-left: 0;', 'margin-left: 70px;'))).toThrow('RTL left reset');
  expect(() => assertExampleLayoutCss(css.replaceAll('margin-right: 252px', 'margin-right: 253px'))).toThrow('RTL right offset');
  expect(() => assertExampleLayoutCss(css.replaceAll('margin-right: 70px', 'margin-right: 71px'))).toThrow('RTL right offset');
  expect(() => assertExampleLayoutCss(css.replaceAll('[dir="rtl"]', '[dir="ltr"]'))).toThrow('RTL');
});

test('comments, conditional or qualified hooks cannot satisfy unconditional declarations', () => {
  expect(() => assertExampleLayoutCss('/* .svadmin-sidebar-expanded { --svadmin-sidebar-width: 252px; } */')).toThrow();
  expect(() => assertExampleLayoutCss(`@supports (display: grid) { ${css} }`)).toThrow();
  expect(() => assertExampleLayoutCss(css.replaceAll('.svadmin-sidebar-expanded', '.host .svadmin-sidebar-expanded'))).toThrow('expanded sidebar width');
  expect(() => assertExampleLayoutCss(css.replace('--svadmin-sidebar-width: 70px;', '--svadmin-sidebar-width: 70px !important;'))).toThrow('collapsed sidebar width');
});

test('production components bind the exact expanded and collapsed state hooks', () => {
  const sidebar = classDirectives(readFileSync(resolve(root, 'packages/ui/src/components/Sidebar.svelte'), 'utf8'));
  const layout = classDirectives(readFileSync(resolve(root, 'packages/ui/src/components/Layout.svelte'), 'utf8'));
  for (const state of ['expanded', 'collapsed']) {
    expect(sidebar).toContain(`svadmin-sidebar-${state}`);
    expect(layout).toContain(`svadmin-sidebar-content-${state}`);
    expect(layout).toContain(`sidebar-content-${state}`);
  }
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
