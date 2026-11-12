import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import LiteMicroAppSandbox from './LiteMicroAppSandbox.svelte';
import LiteMicroAppStateBusIndicator from './LiteMicroAppStateBusIndicator.svelte';
import LiteMicroAppRouteSync from './LiteMicroAppRouteSync.svelte';

describe('Lite Enterprise Parity Wave 14 suite', () => {
  it('renders LiteMicroAppSandbox with placeholder', () => {
    const { getByText, container } = render(LiteMicroAppSandbox, {
      appName: '企业商业智能 (BI) 报表子应用',
      appId: 'app-bi-micro-01',
    });

    expect(getByText('企业商业智能 (BI) 报表子应用')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="LiteMicroAppSandbox"]')).toBeTruthy();
  });

  it('renders LiteMicroAppStateBusIndicator with channel', () => {
    const { getByText, container } = render(LiteMicroAppStateBusIndicator, {
      channel: 'test_global_bus',
    });

    expect(getByText('跨应用响应式状态总线 (SSR 静态说明)')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="LiteMicroAppStateBusIndicator"]')).toBeTruthy();
  });

  it('renders LiteMicroAppRouteSync with mapping values', () => {
    const { getByText, container } = render(LiteMicroAppRouteSync, {
      subAppRoute: '/reports/finance',
    });

    expect(getByText('微前端路由双向同步协调器 (SSR 静态映射)')).toBeTruthy();
    expect(getByText('/reports/finance')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="LiteMicroAppRouteSync"]')).toBeTruthy();
  });
});
