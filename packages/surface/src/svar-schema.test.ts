import { describe, expect, test } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { svarGridDefinition, svarGridPropsSchema, decodeSvarGridProps } from './svar-schema.js';
import { validateSurfaceSpec } from './validation.js';
import { buildSurfaceAgentPrompt } from './agent.js';
import type { SurfacePolicy, SurfaceSpec } from './types.js';

const catalog = { version: 'test+svar/v1', widgets: [svarGridDefinition] };
const policy: SurfacePolicy = { resources: { products: { readFields: ['id', 'name', 'stock'] } } };
const spec: SurfaceSpec = { schemaVersion: 'surface/v1', catalogVersion: catalog.version, surfaceId: 'grid-demo', title: 'Dashboard',
  layout: { type: 'grid', columns: 12 }, dataSources: [{ id: 'products', type: 'resource-list', resource: 'products' }],
  widgets: [{ id: 'grid', type: 'data-grid', binding: { sourceId: 'products', pointer: '/items' }, props: {
    title: 'Inventory', columns: [{ field: 'name', label: 'Name' }, { field: 'stock', label: 'Stock', format: 'number' }], freezeRight: 1,
  } }],
};
const widget = spec.widgets[0];
if (!widget) throw new Error('Missing widget fixture');

describe('SVAR Surface capability boundary', () => {
  test('accepts a read-only grid with all referenced fields authorized', () => { expect(validateSurfaceSpec(spec, catalog, policy).ok).toBe(true); });
  test('counts a non-displayed row key as a protected field', () => {
    const result = validateSurfaceSpec(spec, catalog, { resources: { products: { readFields: ['name', 'stock'] } } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.some(issue => issue.code === 'field_denied')).toBe(true);
  });
  test('rejects executable, request and mutation properties', () => {
    for (const extra of [{ editable: true }, { exportable: true }, { url: '/api' }, { onCellEdit: 'write' }, { windowSource: {} }, { loadChildren: 'fetch' }, { Grid: 'engine' }]) {
      expect(Value.Check(svarGridPropsSchema, { ...widget.props, ...extra })).toBe(false);
    }
  });
  test('rejects duplicated columns, invalid freezes and hidden-field references before requests', () => {
    for (const props of [
      { ...widget.props, columns: [{ field: 'name', label: 'A' }, { field: 'name', label: 'B' }] },
      { ...widget.props, freezeRight: 2 }, { ...widget.props, freezeLeft: 2, freezeRight: 1 },
      { ...widget.props, rowKey: 'secret' }, { ...widget.props, columns: [{ field: 'secret', label: 'Secret' }] },
    ]) {
      expect(validateSurfaceSpec({ ...spec, widgets: [{ ...widget, props }] }, catalog, policy).ok).toBe(false);
    }
  });
  test('requires bounded plain schema values and a valid items binding', () => {
    expect(Value.Check(svarGridPropsSchema, { ...widget.props, height: 99999 })).toBe(false);
    expect(validateSurfaceSpec({ ...spec, widgets: [{ ...widget, binding: { sourceId: 'products', pointer: '/total' } }] }, catalog, policy).ok).toBe(false);
    expect(decodeSvarGridProps(widget.props).columns).toHaveLength(2);
  });
  test('leaves the protocol definition JSON-safe', () => {
    const serialized = JSON.stringify(svarGridPropsSchema);
    expect(serialized).toContain('freezeRight'); expect(serialized).not.toContain('onCellEdit');
    expect(typeof buildSurfaceAgentPrompt).toBe('function');
  });
});
