import { describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { createBusinessSurfaceDefinitions } from './business-definitions.js';
import { defaultSurfaceDefinitions } from './builtin-definitions.js';
import { createSurfaceCatalogManifest, createSurfaceGenerationSpecSchema } from './agent-contract.js';
import { buildSurfaceAgentMessages } from './agent.js';
import { validateSurfaceSpec } from './validation.js';
import { loadSurfaceSource } from './runtime.js';
import { resolveSurfaceSourceData } from './binding.js';
import { createInteractiveSurfaceDefinitions, withSurfaceAppearance } from './workflows/catalog.js';
import type { BaseRecord } from '@svadmin/core';
import type { SurfaceCatalog, SurfaceDataProvider, SurfacePolicy, SurfaceSpec } from './types.js';

const catalog = createBusinessSurfaceDefinitions(defaultSurfaceDefinitions);
const policy: SurfacePolicy = { resources: {
  contacts: { readFields: ['id', 'name', 'active', 'balance'], allowGetOne: true, maxPageSize: 10 },
  events: { readFields: ['id', 'action', 'at', 'actor', 'comment', 'status'], maxPageSize: 10 },
} };
function spec(): SurfaceSpec {
  return { schemaVersion: 'surface/v1', catalogVersion: catalog.version, surfaceId: 'contact', title: 'Contact workspace',
    layout: { type: 'grid', columns: 12 }, dataSources: [
      { id: 'person', type: 'resource-one', resource: 'contacts', recordId: 'c1' },
      { id: 'events', type: 'resource-list', resource: 'events', pageSize: 10 },
    ], widgets: [
      { id: 'detail', type: 'resource-detail', props: { title: 'Details', fields: [{ field: 'name', label: 'Name' }] }, binding: { sourceId: 'person', pointer: '' } },
      { id: 'activity', type: 'activity-feed', props: { title: 'Activity', idField: 'id', actionField: 'action', timestampField: 'at', actorField: 'actor' }, binding: { sourceId: 'events', pointer: '/items' } },
    ] };
}
function changeWidget(index: number, patch: Partial<SurfaceSpec['widgets'][number]>): SurfaceSpec {
  const current = spec();
  return { ...current, widgets: current.widgets.map((widget, at) => at === index ? { ...widget, ...patch } : widget) };
}
describe('opt-in business component contracts', () => {
  it('shares definitions across generation and policy validation without changing the old catalog', () => {
    expect(catalog.widgets).toHaveLength(6);
    expect(defaultSurfaceDefinitions.widgets).toHaveLength(4);
    expect(createSurfaceCatalogManifest(catalog).widgets.map((widget) => widget.dataKind)).toContain('record');
    expect(Value.Check(createSurfaceGenerationSpecSchema(catalog, policy), spec())).toBe(true);
    expect(validateSurfaceSpec(spec(), catalog, policy).ok).toBe(true);
    expect(buildSurfaceAgentMessages('Show contact details', catalog, policy)[0]?.content).toContain('resource-detail');
    expect(validateSurfaceSpec({ ...spec(), catalogVersion: defaultSurfaceDefinitions.version }, defaultSurfaceDefinitions, policy).ok).toBe(false);
    expect(() => createBusinessSurfaceDefinitions(catalog)).toThrow('already registered');
  });
  it.each(['neutral', 'success', 'warning', 'danger', 'info'])('supports precompiled %s with both densities', (tone) => {
    for (const density of ['compact', 'comfortable']) {
      const current = spec();
      expect(validateSurfaceSpec({ ...current, widgets: current.widgets.map((widget) => ({ ...widget, props: { ...widget.props, tone, density } })) }, catalog, policy).ok).toBe(true);
    }
  });
  it('supports appearance and registered forms without creating another renderer or granting writes', () => {
    const actions = [{ id: 'contacts.update', label: 'Update', version: '1', approval: 'confirm' as const, inputSchema: Type.Object({}, { additionalProperties: false }) }];
    const extended = createInteractiveSurfaceDefinitions(actions, catalog);
    const current = spec();
    expect(validateSurfaceSpec({ ...current, catalogVersion: extended.version, widgets: current.widgets.map((widget) => ({ ...widget, props: { ...widget.props, appearance: { tone: 'info' } } })) }, extended, policy).ok).toBe(true);
    expect(createSurfaceCatalogManifest(withSurfaceAppearance(catalog)).widgets).toHaveLength(6);
  });
  it.each(['idField', 'actionField', 'timestampField', 'actorField', 'commentField', 'statusField', 'targetField'])('checks read permission for %s', (key) => {
    const activity = spec().widgets[1]; if (!activity) throw new Error('Missing activity');
    const result = validateSurfaceSpec(changeWidget(1, { props: { ...activity.props, [key]: 'secret' } }), catalog, policy);
    expect(result).toMatchObject({ ok: false, issues: [expect.objectContaining({ code: 'field_denied' })] });
  });
  it('rejects private detail fields, duplicate selectors and model-supplied records or CSS', () => {
    const detail = spec().widgets[0]; if (!detail) throw new Error('Missing detail');
    for (const props of [
      { title: 'Private', fields: [{ field: 'secret', label: 'Secret' }] },
      { title: 'Duplicate', fields: [{ field: 'name', label: 'A' }, { field: 'name', label: 'B' }] },
      { ...detail.props, record: { name: 'Invented data' } }, { ...detail.props, style: 'color:red' },
      { ...detail.props, tone: '#123456' }, { ...detail.props, density: 'tiny' },
    ]) expect(validateSurfaceSpec(changeWidget(0, { props }), catalog, policy).ok).toBe(false);
  });
  it.each([
    { index: 0, sourceId: 'person', pointer: '/name' },
    { index: 0, sourceId: 'events', pointer: '' },
    { index: 1, sourceId: 'person', pointer: '' },
  ])('rejects wrong source/pointer combination $index $sourceId $pointer', ({ index, sourceId, pointer }) => {
    expect(validateSurfaceSpec(changeWidget(index, { binding: { sourceId, pointer } }), catalog, policy).ok).toBe(false);
  });
  it('does not widen old scalar pointers or bypass allowGetOne', () => {
    expect(validateSurfaceSpec(changeWidget(0, { type: 'metric', props: { label: 'Count', format: 'number' } }), catalog, policy).ok).toBe(false);
    expect(validateSurfaceSpec(spec(), catalog, { resources: { ...policy.resources, contacts: { readFields: ['name'] } } }).ok).toBe(false);
  });
  it('requires non-empty explicit record field selectors even for trusted custom catalogs', () => {
    const without: SurfaceCatalog = { ...catalog, widgets: catalog.widgets.map((widget) => {
      const { getReferencedFields: _selector, ...rest } = widget; return widget.type === 'resource-detail' ? rest : widget;
    }) };
    expect(() => createSurfaceCatalogManifest(without)).toThrow('field selector');
    expect(validateSurfaceSpec(spec(), without, policy).ok).toBe(false);
    const empty = { ...catalog, widgets: catalog.widgets.map((widget) => widget.type === 'resource-detail' ? { ...widget, getReferencedFields: () => [] } : widget) };
    expect(validateSurfaceSpec(spec(), empty, policy).ok).toBe(false);
  });
  it.each([undefined, null, 1, 'secret'].map((field) => ({ field })))('rejects malformed custom selector entries $field', ({ field }) => {
    const malformed: SurfaceCatalog = { ...catalog, widgets: catalog.widgets.map((widget) => widget.type === 'resource-detail'
      ? { ...widget, getReferencedFields: () => [field] as unknown as readonly string[] } : widget) };
    expect(validateSurfaceSpec(spec(), malformed, policy).ok).toBe(false);
  });
  it('rejects sparse custom record selectors rather than treating holes as readable fields', () => {
    const malformed: SurfaceCatalog = { ...catalog, widgets: catalog.widgets.map((widget) => widget.type === 'resource-detail'
      ? { ...widget, getReferencedFields: () => new Array<string>(1) } : widget) };
    expect(validateSurfaceSpec(spec(), malformed, policy).ok).toBe(false);
  });
  it('projects a root-bound record before delivery and never invokes unreadable getters', async () => {
    const secret = vi.fn(() => 'hidden');
    const record = Object.defineProperty({ id: 'c1', name: 'A', active: false, balance: 0 }, 'secret', { enumerable: true, get: secret });
    const provider: SurfaceDataProvider = {
      getList: async () => ({ data: [], total: 0 }),
      getOne: async <TData extends BaseRecord = BaseRecord>() => ({ data: record as unknown as TData }),
    };
    const current = spec(), source = current.dataSources[0], widget = current.widgets[0], resourcePolicy = policy.resources['contacts'];
    if (!source || !widget || !resourcePolicy) throw new Error('Missing fixture');
    const result = await loadSurfaceSource({ source, resourcePolicy, provider, authorize: async () => ({ can: true }) });
    expect(resolveSurfaceSourceData(widget, result)).toMatchObject({ status: 'ready', value: { name: 'A', active: false, balance: 0 } });
    expect(JSON.stringify(result)).not.toContain('hidden'); expect(secret).not.toHaveBeenCalled();
  });
});
