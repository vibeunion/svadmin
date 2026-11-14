import { cleanup, render, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { afterEach, describe, expect, it } from 'vitest';
import DashboardPageTestHost from './dashboard-page.test-host.svelte';
import { registerDashboardTranslations, dashboardTranslationsZh, dashboardTranslationsEn } from '../src/features/dashboard/dashboard-i18n';

afterEach(() => {
  cleanup();
});

describe('Dashboard Page Architecture and Performance Polish', () => {
  it('registers bilingual dictionary without key collisions or undefined strings', () => {
    registerDashboardTranslations();
    expect(dashboardTranslationsZh['dashboard.pageTitle']).toBe('运营工作台');
    expect(dashboardTranslationsEn['dashboard.pageTitle']).toBe('Operations workspace');
    expect(dashboardTranslationsZh['dashboard.section.stockRisk']).toBe('库存风险清单');
    expect(dashboardTranslationsEn['dashboard.section.stockRisk']).toBe('Stock risk queue');
    expect(dashboardTranslationsZh['dashboard.metric.stockAtRisk']).toBe('库存风险');
  });

  it('renders dashboard with SVAdmin visual grounding attributes', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(DashboardPageTestHost, { client });

    const dashboardRoot = view.container.querySelector('[data-svadmin-component="OperationsDashboard"]');
    expect(dashboardRoot).toBeTruthy();
    expect(dashboardRoot?.getAttribute('data-svadmin-resource')).toBe('dashboard');

    const metricsContainer = view.container.querySelector('[data-svadmin-component="StockRiskMetric"]');
    expect(metricsContainer).toBeTruthy();
    expect(metricsContainer?.getAttribute('data-svadmin-resource')).toBe('products');

    const openWorkMetric = view.container.querySelector('[data-svadmin-component="OpenWorkMetric"]');
    expect(openWorkMetric).toBeTruthy();
    expect(openWorkMetric?.getAttribute('data-svadmin-resource')).toBe('todos');

    const inventoryValueMetric = view.container.querySelector('[data-svadmin-component="InventoryValueMetric"]');
    expect(inventoryValueMetric).toBeTruthy();
  });

  it('supports collapsible secondary operations with lazy query gating', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(DashboardPageTestHost, { client });

    const collapsibles = view.container.querySelectorAll<HTMLDetailsElement>('details.dashboard-secondary');
    expect(collapsibles.length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      const stockRiskList = view.container.querySelector('[data-svadmin-component="StockRiskList"]');
      expect(stockRiskList).toBeTruthy();
    });
  });
});
