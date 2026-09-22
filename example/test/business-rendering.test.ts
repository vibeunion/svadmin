import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'svelte/compiler';
import { bindResourceRendering, createResourceRenderers } from '@svadmin/ui/rendering';
import { defineResource, formatContractRouteId } from '@svadmin/core/resource-contract';
import { Type } from '@sinclair/typebox';
import inventory from './business-page-inventory.json';
import { demoRenderers, demoRendering, demoRouteId } from '../src/resource-rendering';
import { demoSchemas, isDemoResource } from '../src/resource-schemas';
import { demoContracts } from '../src/resource-contracts';
import { createResources } from '../src/resources';
import { inMemoryDataProvider } from '../src/providers/inMemoryDb';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const source = (path: string) => readFileSync(resolve(testDirectory, path), 'utf8');
function nodes(value: unknown, visit: (node: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) { for (const child of value) nodes(child, visit); return; }
  if (typeof value !== 'object' || value === null) return;
  // 来自本地 Svelte 编译器的 AST；不执行脚本或网络数据。
  if ('type' in value) visit(value);
  for (const child of Object.values(value)) nodes(child, visit);
}
function assertRenderingChildren(text: string, names: readonly string[], allowSpreadRendering = false): number {
  let count = 0;
  nodes(parse(text, { modern: true }), node => {
    if (node['type'] !== 'Component' || !names.includes(String(node['name']))) return;
    count += 1;
    const attributes = node['attributes'];
    expect(Array.isArray(attributes) && (attributes.some(attribute =>
      typeof attribute === 'object' && attribute !== null && 'name' in attribute && attribute.name === 'rendering',
    ) || allowSpreadRendering && attributes.some(attribute =>
      typeof attribute === 'object' && attribute !== null && attribute.type === 'SpreadAttribute',
    ))).toBe(true);
  });
  return count;
}

describe('business rendering migration inventory', () => {
  it('accounts for every page entry, including the static and local-state exceptions', () => {
    expect(new Set(inventory.map(entry => entry.file)).size).toBe(inventory.length);
    for (const entry of inventory) {
      const text = source(`../src/${entry.file}`);
      if (entry.mode === 'query-rendering') {
        expect(text).toContain('demoRenderers.');
        expect(text).toContain('.records(');
        expect(text).not.toMatch(/type Row\s*=\s*Record<string, unknown>/);
      } else if (entry.mode === 'delegated-rendering') {
        expect(assertRenderingChildren(text, ['AutoTable', 'ResourceOperationsPage'])).toBeGreaterThan(0);
      } else {
        expect(['features/case/CaseWorkspacePage.svelte', 'features/showcase/DesignPrinciplesPage.svelte']).toContain(entry.file);
        expect(text).not.toMatch(/use(?:List|One|Many)\s*\(/);
      }
      assertRenderingChildren(text, ['AutoTable', 'AutoForm', 'ShowPage', 'ResourceOperationsPage']);
    }
  });

  it('wires every dynamic CRUD route and both drawer paths', () => {
    const app = source('../src/App.svelte');
    for (const action of ['create', 'edit', 'clone']) expect(app).toContain(`${action}: BusinessAutoForm`);
    expect(app).toContain('show: BusinessShowPage');
    expect(source('../src/components/BusinessShowPage.svelte')).toContain('demoRouteId(resourceName, id)');
    expect(source('../src/components/BusinessShowPage.svelte')).toContain('id={recordId}');
    for (const file of ['BusinessAutoForm', 'BusinessShowPage']) {
      expect(assertRenderingChildren(source(`../src/components/${file}.svelte`), ['AutoForm', 'ShowPage'])).toBe(1);
    }
    const root = '../../packages/ui/src/components/';
    expect(assertRenderingChildren(source(`${root}ResourceOperationsPage.svelte`), ['AutoTable'], true)).toBe(16);
    for (const [file, children] of [
      ['CreatePage', ['AutoForm']], ['EditPage', ['AutoForm']], ['ListPage', ['AutoTable']],
      ['ShowInferencer', ['ShowPage']], ['QuickEditDrawer', ['AutoForm']],
      ['AutoTable', ['QuickEditDrawer', 'RecordDetailDrawer']],
      ['RecordDetailDrawer', ['BoundRecordDetailDrawer']],
    ] as const) expect(assertRenderingChildren(
      source(`${root}${file}.svelte`),
      children,
      file === 'ResourceOperationsPage',
    )).toBeGreaterThan(0);
  });

  it('has a real contract-backed renderer for every registered schema and locale', () => {
    expect(Object.keys(demoRenderers).sort()).toEqual(Object.keys(demoSchemas).sort());
    expect(Object.keys(demoRenderers).sort()).toEqual(Object.keys(demoContracts).sort());
    for (const locale of ['en', 'zh-CN']) {
      for (const resource of createResources(locale)) {
        if (!isDemoResource(resource.name)) {
          expect(resource.name).toBe('design_principles');
          continue;
        }
        expect(demoRendering(resource.name).resource).toBe(resource.contract);
      }
    }
    expect(() => demoRendering('__proto__')).toThrow('Unknown rendering resource');
  });

  it.each(Object.keys(demoSchemas))('validates seed records and rejects malformed data for %s', async name => {
    if (!isDemoResource(name)) throw new Error('Inventory contains an unknown resource');
    const rendering = demoRendering(name);
    const result = await inMemoryDataProvider.getList({ resource: name, pagination: { mode: 'off' } });
    expect(rendering.records(result.data)).toEqual(result.data);
    expect(() => rendering.records([{ id: 'not a numeric demo id' }])).toThrow();
    expect(() => rendering.records({ data: result.data })).toThrow();
    expect(bindResourceRendering(rendering, demoContracts[name])).toBe(rendering);
  });

  it.each(Object.keys(demoSchemas))('parses detail route identity against the actual %s contract', name => {
    const contract = demoRendering(name).resource;
    expect(demoRouteId(name, '1')).toBe(1);
    expect(demoRouteId(name, 1)).toBe(1);
    expect(demoRouteId(name, formatContractRouteId(contract, 1))).toBe(1);
    for (const id of [undefined, '', '01', '1e0', ' 1', '1 ', 'not-an-id', Number.NaN, Number.POSITIVE_INFINITY,
      '~svadmin-id:["string","1"]', '~svadmin-id:invalid']) {
      expect(() => demoRouteId(name, id)).toThrow(expect.objectContaining({ code: 'INVALID_RESOURCE_INPUT' }));
    }
  });

  it('rejects a same-name different contract, retaining the opt-in legacy path', () => {
    const other = defineResource('products', { record: Type.Object({ id: Type.Number() }) });
    expect(() => bindResourceRendering(demoRenderers.products, other)).toThrow('contract mismatch');
    expect(bindResourceRendering(undefined, other)).toBeUndefined();
    expect(Object.isFrozen(createResourceRenderers(other))).toBe(true);
  });

  it('retains server-checked PageProps rather than importing browser rendering into Lite', () => {
    for (const route of ['', '/create', '/edit/[id]', '/show/[id]']) {
      const text = source(`../../packages/lite/example/src/routes/lite/[resource]${route}/+page.svelte`);
      expect(text).toContain('PageProps');
      expect(text).not.toContain('@svadmin/ui');
      expect(text).not.toContain('@svadmin/core/unsafe');
    }
  });
});
