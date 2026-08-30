import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import {
  buildSurfaceAgentPrompt,
  parseSurfaceAgentProposal,
  SURFACE_AGENT_SCHEMA_VERSION,
} from './agent.js';
import type { SurfaceCatalog, SurfacePolicy } from './types.js';

const catalog = {
  version: 'test/v1',
  widgets: [{
    type: 'metric',
    dataKind: 'scalar',
    propsSchema: z.object({ label: z.string(), format: z.enum(['number', 'currency', 'percent']) }).strict(),
  }],
} satisfies SurfaceCatalog;

const policy = {
  resources: {
    products: { readFields: ['id', 'name'], maxPageSize: 20 },
  },
} satisfies SurfacePolicy;

function validProposal(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: SURFACE_AGENT_SCHEMA_VERSION,
    action: 'propose',
    summary: '商品总数',
    spec: {
      schemaVersion: 'surface/v1',
      catalogVersion: 'test/v1',
      surfaceId: 'inventory',
      title: 'Inventory',
      layout: { type: 'grid', columns: 12 },
      dataSources: [{ id: 'products', type: 'resource-list', resource: 'products' }],
      widgets: [{
        id: 'count',
        type: 'metric',
        props: { label: 'Products', format: 'number' },
        binding: { sourceId: 'products', pointer: '/total' },
      }],
    },
    ...overrides,
  };
}

describe('surface agent protocol', () => {
  test('parses fenced JSON and returns a fully validated proposal', () => {
    const result = parseSurfaceAgentProposal(`说明\n\n\`\`\`json\n${JSON.stringify(validProposal())}\n\`\`\``, catalog, policy);
    expect(result).toMatchObject({ ok: true, value: { action: 'propose', spec: { surfaceId: 'inventory' } } });
  });

  test('fails closed for unknown envelope fields and invalid surface specs', () => {
    expect(parseSurfaceAgentProposal(validProposal({ unsafe: true }), catalog, policy).ok).toBe(false);
    expect(parseSurfaceAgentProposal(validProposal({ spec: { schemaVersion: 'surface/v1' } }), catalog, policy).ok).toBe(false);
  });

  test('does not invoke a provider and emits bounded generation instructions', () => {
    const prompt = buildSurfaceAgentPrompt('生成库存看板', catalog, policy);
    expect(prompt).toContain(SURFACE_AGENT_SCHEMA_VERSION);
    expect(prompt).toContain('Never generate or execute Svelte, HTML, CSS, JavaScript');
    expect(prompt).toContain('test/v1');
    expect(prompt).toContain('products(read=id,name');
    expect(prompt).toContain('metric');
  });
});
