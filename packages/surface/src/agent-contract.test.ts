import { describe, expect, test } from 'vitest';
import { Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import {
  createSurfaceAgentResponseSchema, createSurfaceCatalogManifest,
  createSurfaceGenerationSpecSchema, selectSurfaceCatalog, surfaceSchemaToJson,
} from './agent-contract.js';
import { metricPropsSchema } from './builtin-schemas.js';
import { validateSurfaceSpec } from './validation.js';
import type { SurfaceCatalog, SurfacePolicy, SurfaceSpec } from './types.js';

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Required test fixture entry is missing');
  return value;
}

const catalog = {
  version: 'contracts/v1',
  widgets: [
    { type: 'metric', dataKind: 'scalar', description: 'Display one approved scalar', propsSchema: metricPropsSchema, examples: [{ label: 'Total', format: 'number' }] },
    { type: 'note', dataKind: 'none', propsSchema: Type.Object({ text: Type.String({ minLength: 1 }) }, { additionalProperties: false }) },
  ],
} satisfies SurfaceCatalog;
const policy = { resources: { orders: { readFields: ['id', 'total'], filterFields: ['id'], sortFields: ['total'], maxPageSize: 5, allowGetOne: true } } } satisfies SurfacePolicy;
function spec(): SurfaceSpec {
  return {
    schemaVersion: 'surface/v1', catalogVersion: catalog.version, surfaceId: 'orders', title: 'Orders',
    layout: { type: 'grid', columns: 12 },
    dataSources: [{ id: 'orders-data', type: 'resource-list', resource: 'orders', pageSize: 5 }],
    widgets: [{ id: 'total', type: 'metric', props: { label: 'Total', format: 'number' }, binding: { sourceId: 'orders-data', pointer: '/total' } }],
  };
}

describe('catalog-derived generation contract', () => {
  test('exports descriptions, required props and validated examples without executable metadata', () => {
    const manifest = createSurfaceCatalogManifest(catalog);
    expect(required(manifest.widgets[0]).propsSchema).toEqual(JSON.parse(JSON.stringify(metricPropsSchema)));
    expect(required(manifest.widgets[0]).description).toContain('scalar');
    expect(required(manifest.widgets[0]).examples).toEqual([{ label: 'Total', format: 'number' }]);
    expect(JSON.stringify(manifest)).not.toContain('getReferencedFields');
    expect(JSON.parse(JSON.stringify(createSurfaceAgentResponseSchema(catalog, policy)))).toHaveProperty('anyOf');
  });

  test('shares the actual widget schema and narrows resource/field/page policies', () => {
    const compiled = TypeCompiler.Compile(createSurfaceGenerationSpecSchema(catalog, policy));
    const candidate = spec();
    expect(compiled.Check(candidate)).toBe(true);
    expect(validateSurfaceSpec(candidate, catalog, policy).ok).toBe(true);
    expect(compiled.Check({ ...candidate, catalogVersion: 'other/v1' })).toBe(false);
    expect(compiled.Check({ ...candidate, widgets: [{ ...required(candidate.widgets[0]), props: { label: 'Total', format: 'currency' } }] })).toBe(false);
    expect(compiled.Check({ ...candidate, dataSources: [{ ...required(candidate.dataSources[0]), pageSize: 6 }] })).toBe(false);
    expect(compiled.Check({ ...candidate, dataSources: [{ id: 'orders-data', type: 'resource-list', resource: 'secrets', pageSize: 5 }] })).toBe(false);
    expect(compiled.Check({ ...candidate, dataSources: [{ ...required(candidate.dataSources[0]), sorters: [{ field: 'secret', order: 'asc' }] }] })).toBe(false);
    expect(compiled.Check({ ...candidate, dataSources: [{ ...required(candidate.dataSources[0]), filters: [{ field: 'secret', operator: 'eq', value: 'x' }] }] })).toBe(false);
  });

  test('task-scoped catalogs constrain both generation and runtime without losing renderer metadata', () => {
    const rich = { ...catalog, label: 'Host', widgets: catalog.widgets.map((widget) => ({ ...widget, component: 'trusted-renderer' })) };
    const selected = selectSurfaceCatalog(rich, ['note']);
    expect(selected.label).toBe('Host');
    expect(required(selected.widgets[0]).component).toBe('trusted-renderer');
    expect(createSurfaceCatalogManifest(selected).widgets.map((widget) => widget.type)).toEqual(['note']);
    expect(validateSurfaceSpec(spec(), selected, policy)).toMatchObject({ ok: false, issues: [{ code: 'unknown_widget_type' }] });
    expect(() => selectSurfaceCatalog(catalog, ['unknown'])).toThrow('Unknown');
    expect(() => selectSurfaceCatalog(catalog, ['note', 'note'])).toThrow('Duplicate');
  });

  test('rejects duplicate catalog entries, loose object schemas and invalid examples', () => {
    expect(() => createSurfaceCatalogManifest({ ...catalog, widgets: [required(catalog.widgets[0]), required(catalog.widgets[0])] })).toThrow('duplicate');
    expect(() => createSurfaceCatalogManifest({ ...catalog, widgets: [{ ...required(catalog.widgets[1]), propsSchema: Type.Object({ text: Type.String() }) }] })).toThrow('closed');
    expect(() => createSurfaceCatalogManifest({ ...catalog, widgets: [{ ...required(catalog.widgets[0]), examples: [{ label: 'Total', format: 'currency' }] }] })).toThrow('example');
  });

  test('fails explicitly rather than dropping transforms, schema references, accessors or cycles', () => {
    const transformed = Type.Transform(Type.String()).Decode((value) => value).Encode((value) => value);
    expect(() => surfaceSchemaToJson(transformed)).toThrow('transform');
    expect(() => surfaceSchemaToJson(Type.Ref('External'))).toThrow('inline');
    const getter = Type.Object({}, { additionalProperties: false });
    Object.defineProperty(getter, 'description', { enumerable: true, get() { throw new Error('must not execute'); } });
    expect(() => surfaceSchemaToJson(getter)).toThrow('accessors');
    const cyclic = Type.Object({}, { additionalProperties: false });
    cyclic['self'] = cyclic;
    expect(() => surfaceSchemaToJson(cyclic)).toThrow('cycles');
  });

  test('empty capability sets only permit empty lists, and none widgets cannot bind data', () => {
    const empty = TypeCompiler.Compile(createSurfaceGenerationSpecSchema({ version: catalog.version, widgets: [] }, { resources: {} }));
    expect(empty.Check({ ...spec(), dataSources: [], widgets: [] })).toBe(true);
    expect(empty.Check(spec())).toBe(false);
    const note = { id: 'note', type: 'note', props: { text: 'Summary' } };
    const compiled = TypeCompiler.Compile(createSurfaceGenerationSpecSchema(catalog, policy));
    expect(compiled.Check({ ...spec(), widgets: [note] })).toBe(true);
    expect(compiled.Check({ ...spec(), widgets: [{ ...note, binding: { sourceId: 'orders-data', pointer: '/total' } }] })).toBe(false);
  });
});
