import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import LiteTenantContextSwitcher from './LiteTenantContextSwitcher.svelte';
import LiteOmnibarCommandPalette from './LiteOmnibarCommandPalette.svelte';
import LiteAuditTrailInspector from './LiteAuditTrailInspector.svelte';

describe('Lite Enterprise Parity Wave 11 suite', () => {
  it('renders LiteTenantContextSwitcher with current tenant info and list', () => {
    const { getAllByText, getByText, container } = render(LiteTenantContextSwitcher, {
      currentTenantId: 'tenant-corp-01',
    });

    expect(getAllByText('星谷数智总集团').length).toBeGreaterThan(0);
    expect(getByText('HQ-GLOBAL')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="LiteTenantContextSwitcher"]')).toBeTruthy();
  });

  it('renders LiteOmnibarCommandPalette with default commands', () => {
    const { getByText, container } = render(LiteOmnibarCommandPalette);

    expect(getByText('运营与财务仪表盘')).toBeTruthy();
    expect(getByText('新建采购审批流')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="LiteOmnibarCommandPalette"]')).toBeTruthy();
  });

  it('renders LiteAuditTrailInspector with audit log table', () => {
    const { getByText, container } = render(LiteAuditTrailInspector);

    expect(getByText('全局操作审计追踪中心 (SSR 降级表格)')).toBeTruthy();
    expect(getByText('李思远 (运营主管)')).toBeTruthy();
    expect(getByText('切换工作区租户')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="LiteAuditTrailInspector"]')).toBeTruthy();
  });
});
