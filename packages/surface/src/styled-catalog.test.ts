import { describe, expect, test } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { surfaceDesignContract } from '@svadmin/ui/design-contract';
import { buildSurfaceAgentPrompt } from './agent.js';
import { metricPropsSchema, styledMetricPropsSchema, styledResourceTablePropsSchema } from './builtin-schemas.js';
import { defaultSurfaceCatalog, defineSurfaceCatalog, styledSurfaceCatalog } from './catalog.js';
import { validateSurfaceSpec } from './validation.js';
import type { JsonObject, SurfacePolicy } from './types.js';

const policy = { resources: { products: { readFields: ['id', 'name', 'stock'], maxPageSize: 25 } } } satisfies SurfacePolicy;
function spec(catalogVersion: string, type: string, props: JsonObject) {
  return {
    schemaVersion: 'surface/v1', catalogVersion, surfaceId: 'inventory', title: 'Inventory',
    layout: { type: 'grid', columns: 12 },
    dataSources: [{ id: 'products', type: 'resource-list', resource: 'products', pageSize: 10 }],
    widgets: [{ id: 'widget', type, props, binding: { sourceId: 'products', pointer: type === 'metric' ? '/total' : '/items' } }],
  };
}

describe('opt-in styled Surface catalog', () => {
  test('preserves v1 schemas and requires explicit catalog selection', () => {
    const props = { label: 'Products', format: 'number' };
    expect(Value.Check(metricPropsSchema, props)).toBe(true);
    expect(validateSurfaceSpec(spec(defaultSurfaceCatalog.version, 'metric', props), defaultSurfaceCatalog, policy).ok).toBe(true);
    const styled = { ...props, tone: 'warning', density: 'compact' };
    expect(Value.Check(metricPropsSchema, styled)).toBe(false);
    expect(validateSurfaceSpec(spec(defaultSurfaceCatalog.version, 'metric', styled), defaultSurfaceCatalog, policy).ok).toBe(false);
    expect(validateSurfaceSpec(spec(styledSurfaceCatalog.version, 'metric', styled), defaultSurfaceCatalog, policy).ok).toBe(false);
  });

  test('accepts every shared semantic enum without allowing arbitrary style data', () => {
    for (const tone of surfaceDesignContract.metric.tone) {
      for (const density of surfaceDesignContract.metric.density) {
        const props = { label: 'Products', format: 'number', tone, density };
        expect(Value.Check(styledMetricPropsSchema, props)).toBe(true);
        expect(validateSurfaceSpec(spec(styledSurfaceCatalog.version, 'metric', props), styledSurfaceCatalog, policy).ok).toBe(true);
      }
    }
    for (const extra of [{ tone: '#ff0000' }, { density: '12px' }, { class: 'hidden' }, { style: { display: 'none' } }, { recipe: 'anything' }]) {
      expect(Value.Check(styledMetricPropsSchema, { label: 'Products', format: 'number', ...extra })).toBe(false);
    }
    expect(Value.Check(styledMetricPropsSchema, { label: 'Revenue', format: 'currency', tone: 'success' })).toBe(false);
    expect(Value.Check(styledMetricPropsSchema, { label: 'Revenue', format: 'currency', currency: 'USD', tone: 'success' })).toBe(true);
    expect(Value.Check(styledMetricPropsSchema, { label: 'Products', format: 'number', currency: 'USD', tone: 'success' })).toBe(false);
  });

  test('styled table fields still enforce the host read policy', () => {
    for (const density of surfaceDesignContract.table.density) {
      const props = { title: 'Products', columns: [{ field: 'name', label: 'Name' }], density };
      expect(Value.Check(styledResourceTablePropsSchema, props)).toBe(true);
      expect(validateSurfaceSpec(spec(styledSurfaceCatalog.version, 'resource-table', props), styledSurfaceCatalog, policy).ok).toBe(true);
      const secret = { ...props, columns: [{ field: 'secret', label: 'Secret' }] };
      const result = validateSurfaceSpec(spec(styledSurfaceCatalog.version, 'resource-table', secret), styledSurfaceCatalog, policy);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.issues.some((issue) => issue.code === 'field_denied')).toBe(true);
    }
  });

  test('prompt generation uses public schemas and examples, not renderer or recipe source', () => {
    const prompt = buildSurfaceAgentPrompt('Show inventory', styledSurfaceCatalog, policy);
    expect(prompt).toContain('Component contracts:');
    expect(prompt).toContain('"tone"');
    expect(prompt).toContain('"additionalProperties":false');
    expect(prompt).toContain('Pending orders');
    expect(prompt).not.toContain('function MetricWidget');
    expect(prompt).not.toContain('svadmin-surface-metric');
    expect(prompt).toContain('Never generate or execute Svelte, HTML, CSS, JavaScript');
  });

  test('catalog examples must themselves satisfy their strict props schema', () => {
    const widget = styledSurfaceCatalog.widgets.find((candidate) => candidate.type === 'metric');
    if (!widget) throw new Error('Styled catalog must contain the metric widget');
    expect(() => defineSurfaceCatalog({ version: 'invalid/v1', widgets: [{ ...widget, examples: [{ label: 'Invalid', format: 'number', tone: 'unknown' }] }] })).toThrow('Invalid catalog example');
  });
});
