import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AuditTrailInspector from './AuditTrailInspector.svelte';

describe('AuditTrailInspector component suite', () => {
  it('renders summary statistics and event items', () => {
    const { getByText, container } = render(AuditTrailInspector);

    expect(getByText('全局操作审计追踪中心 (Audit Trail)')).toBeTruthy();
    expect(getByText('高危提权:')).toBeTruthy();
    expect(getByText('门禁拦截:')).toBeTruthy();
    expect(getByText('李思远 (运营主管)')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="audit-trail-inspector"]')).toBeTruthy();
  });

  it('filters events by severity tag', async () => {
    const { getByText, queryByText } = render(AuditTrailInspector);

    const criticalBtn = getByText('高危');
    await fireEvent.click(criticalBtn);

    expect(getByText('跨组织提权审批')).toBeTruthy();
    expect(getByText('尝试物理清空审计库')).toBeTruthy();
    expect(queryByText('切换工作区租户')).toBeNull();
  });

  it('triggers onExport callback when export button is clicked', async () => {
    const onExport = vi.fn();
    const { getByText } = render(AuditTrailInspector, {
      onExport,
    });

    const exportBtn = getByText('导出审计报告');
    await fireEvent.click(exportBtn);

    expect(onExport).toHaveBeenCalled();
  });
});
