import { Type } from '@sinclair/typebox';
import { describe, expect, test } from 'vitest';
import type { SurfaceCatalog } from './types.js';
import { jsonRenderSpecToSurfaceSpec, surfaceSpecToJsonRenderSpec } from './json-render.js';

const catalog: SurfaceCatalog = {
  version: 'test/v1',
  widgets: [{
    type: 'metric',
    dataKind: 'scalar',
    propsSchema: Type.Object({ label: Type.String(), format: Type.Literal('number') }, { additionalProperties: false }),
  }],
};
const policy = { resources: { orders: { readFields: ['id', 'total'], maxPageSize: 10 } } };
const rootProps = {
  surfaceId: 'home', title: 'Home', catalogVersion: catalog.version,
  layout: { type: 'grid', columns: 12 }, dataSources: [{ id: 'orders', type: 'resource-list', resource: 'orders', pageSize: 1 }],
};

describe('json-render Surface adapter', () => {
  test('converts the supported flat spec and keeps Surface validation authoritative', () => {
    const result = jsonRenderSpecToSurfaceSpec({
      root: 'page',
      elements: {
        page: { type: 'surface', props: rootProps, children: ['metric-1'] },
        'metric-1': { type: 'metric', props: { label: 'Orders', format: 'number', binding: { sourceId: 'orders', pointer: '/total' } } },
      },
    }, catalog, policy);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.widgets[0]).toMatchObject({ id: 'metric-1', type: 'metric' });
      expect(surfaceSpecToJsonRenderSpec(result.value).root).toBe('__svadmin_surface_root');
    }
  });

  test('rejects arbitrary roots, unknown widgets, orphan elements, and reserved props', () => {
    expect(jsonRenderSpecToSurfaceSpec({ root: 'button', elements: { button: { type: 'button', props: { binding: { sourceId: 'orders', pointer: '/total' } } } } }, catalog, policy).ok).toBe(false);
    expect(jsonRenderSpecToSurfaceSpec({ root: 'page', elements: { page: { type: 'surface', props: rootProps, children: ['x'] }, x: { type: 'unknown', props: { binding: { sourceId: 'orders', pointer: '/total' } } } } }, catalog, policy).ok).toBe(false);
    expect(jsonRenderSpecToSurfaceSpec({ root: 'page', elements: { page: { type: 'surface', props: rootProps }, orphan: { type: 'metric', props: { binding: { sourceId: 'orders', pointer: '/total' } } } } }, catalog, policy).ok).toBe(false);
    expect(jsonRenderSpecToSurfaceSpec({ root: 'page', elements: { page: { type: 'surface', props: rootProps, children: ['x'] }, x: { type: 'metric', props: { binding: 'ambiguous' } } } }, catalog, policy).ok).toBe(false);
  });
});
