import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { BaseRecord } from '@svadmin/core';
import { createBusinessSurfaceCatalog } from './business.js';
import SurfaceRenderer from './components/SurfaceRenderer.svelte';
import ActivityFeedWidget from './components/ActivityFeedWidget.svelte';
import ResourceDetailWidget from './components/ResourceDetailWidget.svelte';
import type { SurfaceDataProvider, SurfacePolicy, SurfaceSpec, SurfaceWidgetDataState } from './types.js';
const catalog = createBusinessSurfaceCatalog();
const policy: SurfacePolicy = { resources: {
  contacts: { readFields: ['name', 'active', 'balance'], allowGetOne: true },
  events: { readFields: ['id', 'action', 'at', 'actor', 'comment'], maxPageSize: 10 },
} };
const detailProps = { title: 'Contact detail', fields: [{ field: 'name', label: 'Name' }, { field: 'active', label: 'Active', format: 'boolean' }, { field: 'balance', label: 'Balance', format: 'number' }] };
const activityProps = { title: 'Contact history', idField: 'id', actionField: 'action', timestampField: 'at', actorField: 'actor', commentField: 'comment' };
const spec: SurfaceSpec = { schemaVersion: 'surface/v1', catalogVersion: catalog.version, surfaceId: 'contact-workspace', title: 'Contact workspace', layout: { type: 'grid', columns: 12 },
  dataSources: [{ id: 'person', type: 'resource-one', resource: 'contacts', recordId: 'c1' }, { id: 'events', type: 'resource-list', resource: 'events', pageSize: 10 }],
  widgets: [
    { id: 'detail', type: 'resource-detail', props: detailProps, binding: { sourceId: 'person', pointer: '' } },
    { id: 'activity', type: 'activity-feed', props: activityProps, binding: { sourceId: 'events', pointer: '/items' } },
  ] };
function provider() {
  const getOne = vi.fn(async () => ({ data: { id: 'c1', name: 'Synthetic contact', active: false, balance: 0, secret: 'secret-value' } }));
  const getList = vi.fn(async () => ({ data: [{ id: 'e1', action: 'Updated contact', at: '2026-09-20', actor: 'Synthetic operator', comment: '<img src=x onerror=alert(1)>', secret: 'event-secret' }], total: 1 }));
  const dataProvider: SurfaceDataProvider = {
    getOne: async <TData extends BaseRecord = BaseRecord>() => await getOne() as unknown as { data: TData },
    getList: async <TData extends BaseRecord = BaseRecord>() => await getList() as unknown as { data: TData[]; total: number },
  };
  return { dataProvider, getOne, getList };
}
describe('real read-only business widgets', () => {
  it('renders backend details and the real ActivityFeed without hidden fields or a composer', async () => {
    const p = provider(); const view = render(SurfaceRenderer, { spec, catalog, policy, dataProvider: p.dataProvider, locale: 'en-US' });
    expect(await screen.findByText('Synthetic contact')).toBeTruthy();
    expect(await screen.findByText('Updated contact')).toBeTruthy();
    expect(screen.getByText('No')).toBeTruthy(); expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
    expect(view.container.querySelector('img')).toBeNull(); expect(view.container.querySelector('textarea')).toBeNull();
    expect(view.container.textContent).not.toContain('secret-value'); expect(view.container.textContent).not.toContain('event-secret');
  });
  it('rejects forbidden detail before loading any source', async () => {
    const p = provider();
    render(SurfaceRenderer, { spec: { ...spec, widgets: [{ ...spec.widgets[0], props: { title: 'Secret', fields: [{ field: 'secret', label: 'Secret' }] } }] }, catalog, policy, dataProvider: p.dataProvider });
    expect(await screen.findByRole('alert')).toBeTruthy(); expect(p.getOne).not.toHaveBeenCalled(); expect(p.getList).not.toHaveBeenCalled();
  });
  it('preserves keyed detail DOM and source queries across presentation-only updates', async () => {
    const p = provider(); const view = render(SurfaceRenderer, { spec, catalog, policy, dataProvider: p.dataProvider });
    await screen.findByText('Synthetic contact'); await screen.findByText('Updated contact');
    const detail = screen.getByTestId('surface-widget-detail');
    await view.rerender({ spec: { ...spec, title: 'New arrangement', widgets: spec.widgets.map((widget) => ({ ...widget, props: { ...widget.props, tone: 'warning', density: 'compact' } })) } });
    expect(screen.getByTestId('surface-widget-detail')).toBe(detail); expect(p.getOne).toHaveBeenCalledTimes(1); expect(p.getList).toHaveBeenCalledTimes(1);
  });
  it('removes old record contents immediately when read permissions are revoked', async () => {
    const p = provider(); const view = render(SurfaceRenderer, { spec, catalog, policy, dataProvider: p.dataProvider });
    await screen.findByText('Synthetic contact');
    await view.rerender({ policy: { resources: {} } });
    await waitFor(() => expect(screen.queryByText('Synthetic contact')).toBeNull());
    expect(p.getOne).toHaveBeenCalledTimes(1);
  });
  for (const status of ['loading', 'empty', 'error'] as const) {
    it(`localizes ${status} states without disclosing provider error text`, () => {
      const data: SurfaceWidgetDataState = status === 'error'
        ? { status, sourceId: 'x', error: { sourceId: 'x', code: 'provider_failed', message: 'private-backend-diagnostic' } }
        : { status, sourceId: 'x' };
      const detail = render(ResourceDetailWidget, { widgetId: 'd', props: detailProps, data, locale: 'zh-CN' });
      const activity = render(ActivityFeedWidget, { widgetId: 'a', props: activityProps, data, locale: 'zh-CN' });
      expect(detail.container.textContent).toContain(status === 'loading' ? '正在加载记录' : status === 'empty' ? '暂无记录' : '记录不可用');
      expect(activity.container.textContent).toContain(status === 'loading' ? '正在加载动态' : status === 'empty' ? '暂无动态' : '动态不可用');
      expect(detail.container.textContent).not.toContain('private-backend'); expect(activity.container.textContent).not.toContain('private-backend');
    });
  }
});
