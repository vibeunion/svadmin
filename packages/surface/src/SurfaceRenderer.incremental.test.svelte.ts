import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import type { BaseRecord, GetListParams, GetListResult, GetOneResult } from '@svadmin/core';
import { resetAccessControlProvider } from '@svadmin/core/permissions';
import { resetI18n } from '@svadmin/core/i18n';
import SurfaceRenderer from './components/SurfaceRenderer.svelte';
import StatefulWidget from './incremental.test-host.svelte';
import { defaultSurfaceCatalog } from './catalog.js';
import type { SurfaceDataProvider, SurfacePolicy, SurfaceSpec } from './types.js';
import { applySurfaceEditProposal, createSurfaceRevision } from './edits.js';

const catalog = { version: 'incremental/v1', widgets: [
  ...defaultSurfaceCatalog.widgets,
  { type: 'draft', dataKind: 'none' as const, propsSchema: Type.Object({ label: Type.String() }, { additionalProperties: false }), component: StatefulWidget },
] };
const policy: SurfacePolicy = { resources: { orders: { readFields: ['id', 'name'], maxPageSize: 20 } } };
function initial(): SurfaceSpec {
  return { schemaVersion: 'surface/v1', catalogVersion: catalog.version, surfaceId: 'incremental', title: 'Orders',
    layout: { type: 'grid', columns: 12 },
    dataSources: [{ id: 'rows', type: 'resource-list', resource: 'orders' }], widgets: [
      { id: 'draft', type: 'draft', props: { label: 'Draft note' } },
      { id: 'total', type: 'metric', props: { label: 'Total', format: 'number' }, binding: { sourceId: 'rows', pointer: '/total' } },
    ] };
}
function provider() {
  const calls = vi.fn();
  const value: SurfaceDataProvider = {
    async getList<T extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResult<T>> {
      calls(params);
      return { data: [{ id: 1, name: 'One' }] as unknown as T[], total: 1 };
    },
    async getOne<T extends BaseRecord = BaseRecord>(): Promise<GetOneResult<T>> { return { data: { id: 1 } as unknown as T }; },
  };
  return { value, calls };
}
afterEach(() => { resetAccessControlProvider(); resetI18n(); });

describe('incremental Surface rendering', () => {
  test('applies a revisioned visual edit without refetching or losing input state/DOM identity', async () => {
    const p = provider();
    const snapshot = createSurfaceRevision(initial(), catalog, policy);
    if (!snapshot.ok) throw new Error('Invalid fixture');
    const view = render(SurfaceRenderer, { spec: snapshot.value.spec, policy, catalog, dataProvider: p.value });
    await waitFor(() => expect(p.calls).toHaveBeenCalledTimes(1));
    const input = screen.getByRole('textbox', { name: 'Draft note' });
    await fireEvent.input(input, { target: { value: 'Unsaved note' } });
    const edit = { schemaVersion: 'surface-edit/v1', catalogVersion: catalog.version, surfaceId: 'incremental', baseRevision: 0,
      operations: [{ op: 'set-title', value: 'Renamed' }, { op: 'reorder-widgets', ids: ['total', 'draft'] }] };
    const next = applySurfaceEditProposal(snapshot.value, edit, catalog, policy);
    if (!next.ok) throw new Error('Invalid edit');
    await view.rerender({ spec: next.value.spec });
    expect(screen.getByRole('heading', { name: 'Renamed' })).not.toBeNull();
    expect(screen.getByRole('textbox', { name: 'Draft note' })).toBe(input);
    expect((input as HTMLInputElement).value).toBe('Unsaved note');
    expect(p.calls).toHaveBeenCalledTimes(1);
  });
  test('resets component state and data at an explicit tenant boundary', async () => {
    const p = provider();
    const view = render(SurfaceRenderer, { spec: initial(), policy, catalog, dataProvider: p.value, scopeKey: 'tenant-a' });
    await waitFor(() => expect(p.calls).toHaveBeenCalledTimes(1));
    const input = screen.getByRole('textbox', { name: 'Draft note' });
    await fireEvent.input(input, { target: { value: 'Tenant A draft' } });
    await view.rerender({ scopeKey: 'tenant-b' });
    await waitFor(() => expect(p.calls).toHaveBeenCalledTimes(2));
    const next = screen.getByRole('textbox', { name: 'Draft note' });
    expect(next).not.toBe(input);
    expect((next as HTMLInputElement).value).toBe('');
  });
  test('locale and callback changes alone do not reload data', async () => {
    const p = provider();
    const view = render(SurfaceRenderer, { spec: initial(), policy, catalog, dataProvider: p.value, locale: 'en' });
    await waitFor(() => expect(p.calls).toHaveBeenCalledTimes(1));
    await view.rerender({ locale: 'zh-CN', onError: vi.fn() });
    expect(p.calls).toHaveBeenCalledTimes(1);
  });
});
