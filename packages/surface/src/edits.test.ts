import { describe, expect, test } from 'vitest';
import { Type } from '@sinclair/typebox';
import {
  applySurfaceEditProposal, buildSurfaceEditMessages, createSurfaceEditSchema,
  createSurfaceRevision, SURFACE_EDIT_LIMITS,
} from './edits.js';
import type { SurfaceEditOperation, SurfaceRevision } from './edits.js';
import type { SurfaceCatalog, SurfacePolicy, SurfaceSpec } from './types.js';

const catalog = { version: 'edits/v1', widgets: [{
  type: 'metric', dataKind: 'scalar',
  propsSchema: Type.Object({ label: Type.String() }, { additionalProperties: false }),
}] } satisfies SurfaceCatalog;
const policy = { resources: { orders: { readFields: ['id'], filterFields: ['id'], maxPageSize: 20 } } } satisfies SurfacePolicy;
function initial(): SurfaceSpec {
  return {
    schemaVersion: 'surface/v1', catalogVersion: catalog.version, surfaceId: 'orders', title: 'Orders',
    layout: { type: 'grid', columns: 12 },
    dataSources: [{ id: 'rows', type: 'resource-list', resource: 'orders', filters: [{ field: 'id', operator: 'eq', value: 1 }] }],
    widgets: [{ id: 'total', type: 'metric', props: { label: 'Total' }, binding: { sourceId: 'rows', pointer: '/total' } }],
  };
}
function snapshot(revision = 3): SurfaceRevision {
  const result = createSurfaceRevision(initial(), catalog, policy, revision);
  if (!result.ok) throw new Error('Invalid test fixture');
  return result.value;
}
function edit(operations: readonly SurfaceEditOperation[], overrides: Record<string, unknown> = {}) {
  return { schemaVersion: 'surface-edit/v1', catalogVersion: catalog.version, surfaceId: 'orders', baseRevision: 3, operations, ...overrides };
}

describe('revisioned surface edits', () => {
  test('changes only requested definitions and produces a detached frozen next snapshot', () => {
    const current = snapshot();
    const result = applySurfaceEditProposal(current, edit([{ op: 'set-title', value: 'Order overview' }]), catalog, policy);
    expect(result).toMatchObject({ ok: true, value: { revision: 4, spec: { title: 'Order overview' } } });
    expect(current.revision).toBe(3);
    expect(current.spec.title).toBe('Orders');
    if (!result.ok) throw new Error('Expected success');
    expect(result.value.spec.widgets).toEqual(current.spec.widgets);
    expect(result.value.spec.dataSources).toEqual(current.spec.dataSources);
    expect(Object.isFrozen(result.value.spec.widgets[0].props)).toBe(true);
    expect(() => Object.assign(result.value.spec, { title: 'Mutation' })).toThrow();
  });

  test('snapshot creation does not mutate or freeze caller input', () => {
    const input = initial();
    const result = createSurfaceRevision(input, catalog, policy);
    expect(result.ok).toBe(true);
    expect(Object.isFrozen(input)).toBe(false);
    Object.assign(input, { title: 'Local change' });
    expect(result).toMatchObject({ ok: true, value: { spec: { title: 'Orders' } } });
  });

  test('rejects stale revisions, wrong surfaces and mismatched catalogs', () => {
    const current = snapshot();
    const operations = [{ op: 'set-title', value: 'Changed' }] as const;
    expect(applySurfaceEditProposal(current, edit(operations, { baseRevision: 2 }), catalog, policy)).toMatchObject({ ok: false, issues: [{ code: 'revision_conflict' }] });
    expect(applySurfaceEditProposal(current, edit(operations, { surfaceId: 'other' }), catalog, policy).ok).toBe(false);
    expect(applySurfaceEditProposal(current, edit(operations, { catalogVersion: 'other/v1' }), catalog, policy)).toMatchObject({ ok: false, issues: [{ code: 'catalog_version_mismatch' }] });
  });

  test('validates all operations atomically, including final reference integrity', () => {
    const current = snapshot();
    expect(applySurfaceEditProposal(current, edit([{ op: 'set-title', value: 'Changed' }, { op: 'remove-source', id: 'rows' }]), catalog, policy).ok).toBe(false);
    expect(current.spec.title).toBe('Orders');
    const result = applySurfaceEditProposal(current, edit([{ op: 'remove-source', id: 'rows' }, { op: 'remove-widget', id: 'total' }]), catalog, policy);
    expect(result).toMatchObject({ ok: true, value: { spec: { dataSources: [], widgets: [] } } });
  });

  test('enforces current resource policies and forbidden props, never granting authority from edits', () => {
    const current = snapshot();
    expect(applySurfaceEditProposal(current, edit([{ op: 'upsert-source', source: { id: 'rows', type: 'resource-list', resource: 'secrets' } }]), catalog, policy)).toMatchObject({ ok: false, issues: [{ code: 'resource_denied' }] });
    expect(applySurfaceEditProposal(current, edit([{ op: 'upsert-widget', widget: { ...current.spec.widgets[0], props: { label: 'X', class: 'hidden' } } }]), catalog, policy).ok).toBe(false);
    expect(applySurfaceEditProposal(current, edit([{ op: 'set-title', value: 'X' }]), catalog, { resources: {} }).ok).toBe(false);
    expect(applySurfaceEditProposal(current, edit([{ op: 'set-title', value: 'X' }], { policy: { allowAll: true } }), catalog, policy).ok).toBe(false);
  });

  test('uses stable IDs, rejects unknown removals and requires a complete reorder', () => {
    const current = snapshot();
    const next = { ...current.spec.widgets[0], id: 'second' };
    const result = applySurfaceEditProposal(current, edit([{ op: 'upsert-widget', widget: next }, { op: 'reorder-widgets', ids: ['second', 'total'] }]), catalog, policy);
    if (!result.ok) throw new Error('Expected success');
    expect(result.value.spec.widgets.map((widget) => widget.id)).toEqual(['second', 'total']);
    expect(applySurfaceEditProposal(current, edit([{ op: 'remove-widget', id: 'missing' }]), catalog, policy).ok).toBe(false);
    expect(applySurfaceEditProposal(current, edit([{ op: 'reorder-widgets', ids: [] }]), catalog, policy).ok).toBe(false);
    expect(applySurfaceEditProposal(current, edit([{ op: 'reorder-widgets', ids: ['missing'] }]), catalog, policy).ok).toBe(false);
  });

  test('rejects generic paths, unsafe JSON, excessive operations and counter overflow', () => {
    const current = snapshot();
    expect(applySurfaceEditProposal(current, edit([], { operations: [{ op: 'replace', path: '/__proto__/x', value: true }] }), catalog, policy).ok).toBe(false);
    expect(applySurfaceEditProposal(current, '{"__proto__":{}}', catalog, policy).ok).toBe(false);
    expect(applySurfaceEditProposal(current, edit(Array.from({ length: SURFACE_EDIT_LIMITS.maxOperations + 1 }, () => ({ op: 'set-title', value: 'X' }))), catalog, policy).ok).toBe(false);
    expect(applySurfaceEditProposal(snapshot(Number.MAX_SAFE_INTEGER), edit([{ op: 'set-title', value: 'X' }], { baseRevision: Number.MAX_SAFE_INTEGER }), catalog, policy).ok).toBe(false);
    expect(createSurfaceRevision(initial(), catalog, policy, -1).ok).toBe(false);
  });

  test('generates edit instructions from the active catalog and separates the user request', () => {
    const messages = buildSurfaceEditMessages('Rename the page', snapshot(), catalog, policy);
    expect(messages[0].content).toContain('"baseRevision"');
    expect(messages[0].content).toContain('"revision":3');
    expect(messages[0].content).toContain('"required":["label"]');
    expect(messages[1]).toEqual({ role: 'user', content: 'Rename the page' });
    expect(createSurfaceEditSchema()).toHaveProperty('additionalProperties', false);
    expect(() => buildSurfaceEditMessages('', snapshot(), catalog, policy)).toThrow();
  });
});
