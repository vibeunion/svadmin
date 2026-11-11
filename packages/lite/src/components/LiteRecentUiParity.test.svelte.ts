import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LiteTrendIndicator from './LiteTrendIndicator.svelte';
import LiteMetricGrid from './LiteMetricGrid.svelte';
import LiteOrgChart from './LiteOrgChart.svelte';
import LiteCronExpressionBuilder from './LiteCronExpressionBuilder.svelte';
import LiteVirtualTreeSelect from './LiteVirtualTreeSelect.svelte';
import LiteConcurrentConflictModal from './LiteConcurrentConflictModal.svelte';
import LiteTaskCenter from './LiteTaskCenter.svelte';
import LiteMicroAppFrame from './LiteMicroAppFrame.svelte';
import LiteSafeDeleteConfirm from './LiteSafeDeleteConfirm.svelte';
import LiteAuditLog from './LiteAuditLog.svelte';
import LitePresenceAvatarGroup from './LitePresenceAvatarGroup.svelte';
import LiteTour from './LiteTour.svelte';
import LiteGaugeChart from './widgets/LiteGaugeChart.svelte';
import LiteKpiCard from './LiteKpiCard.svelte';
import LiteJsonViewer from './LiteJsonViewer.svelte';
import LiteResultPage from './LiteResultPage.svelte';
import LiteWatermarkContainer from './LiteWatermarkContainer.svelte';
import LiteContextMenu from './LiteContextMenu.svelte';
import LiteUnsavedChangesGuard from './LiteUnsavedChangesGuard.svelte';
import LiteAnnouncementBanner from './LiteAnnouncementBanner.svelte';
import LiteTextDiffViewer from './LiteTextDiffViewer.svelte';
import LiteAsyncExportModal from './LiteAsyncExportModal.svelte';
import LiteStepWizard from './LiteStepWizard.svelte';
import LiteWorkflowStepper from './LiteWorkflowStepper.svelte';
import LiteDualApprovalGate from './LiteDualApprovalGate.svelte';
import LiteKeyboardShortcutsModal from './LiteKeyboardShortcutsModal.svelte';
import LiteWebhookSimulator from './LiteWebhookSimulator.svelte';
import LiteHmacSignatureCalculator from './LiteHmacSignatureCalculator.svelte';
import LiteApiPlayground from './LiteApiPlayground.svelte';
import LitePlanUsageQuotaBar from './LitePlanUsageQuotaBar.svelte';
import LiteTierFeatureComparison from './LiteTierFeatureComparison.svelte';
import LiteBillingInvoiceDrawer from './LiteBillingInvoiceDrawer.svelte';

afterEach(() => cleanup());

describe('recent UI parity fallbacks', () => {
  it('computes trend direction and supports reversed color semantics', () => {
    const up = render(LiteTrendIndicator, { value: 12, prevValue: 10 });
    expect(up.container.textContent).toContain('20.0%');
    expect(up.container.querySelector('[data-tone="positive"]')).toBeTruthy();

    const reversed = render(LiteTrendIndicator, { value: -5, prevValue: 10, reverseColor: true });
    expect(reversed.container.textContent).toContain('150.0%');
    expect(reversed.container.querySelector('[data-tone="positive"]')).toBeTruthy();
  });

  it('renders metric grid items and empty/loading states', () => {
    const view = render(LiteMetricGrid, {
      title: 'Operations',
      items: [
        { label: 'Open', value: 12, trend: 'up', trendValue: '+4%' },
        { label: 'Closed', value: 30 },
      ],
    });
    expect(view.getByRole('heading', { name: 'Operations' })).toBeTruthy();
    expect(view.container.querySelectorAll('.lite-stats-card')).toHaveLength(2);

    const empty = render(LiteMetricGrid, { empty: true, emptyMessage: 'No metrics' });
    expect(empty.getByText('No metrics')).toBeTruthy();
  });

  it('renders organization hierarchy and cron fallback forms', () => {
    const org = render(LiteOrgChart, {
      data: [
        {
          id: 'ceo',
          name: 'Ada',
          title: 'CEO',
          department: 'Executive',
          children: [{ id: 'cto', name: 'Lin', title: 'CTO', href: '/people/lin' }],
        },
      ],
    });
    expect(org.container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(org.getByRole('link', { name: 'Lin' }).getAttribute('href')).toBe('/people/lin');

    const cron = render(LiteCronExpressionBuilder, {
      value: '0 9 * * 1',
      formAction: '/schedules',
      presets: [{ label: 'Weekly', value: '0 9 * * 1' }],
    });
    expect((cron.getByLabelText('Expression') as HTMLInputElement).value).toBe('0 9 * * 1');
    expect(cron.container.querySelector('form')?.getAttribute('action')).toBe('/schedules');
    expect(cron.getByText('Weekly')).toBeTruthy();
  });

  it('renders native tree select values and multiple selection', () => {
    const single = render(LiteVirtualTreeSelect, {
      label: 'Team',
      value: 'child',
      nodes: [{ value: 'root', label: 'Root', children: [{ value: 'child', label: 'Child' }] }],
    });
    expect((single.getByLabelText('Team') as HTMLSelectElement).value).toBe('child');
    expect(single.getByRole('option', { name: /Child/ })).toBeTruthy();

    const multiple = render(LiteVirtualTreeSelect, {
      label: 'Teams',
      multiple: true,
      value: ['root', 'child'],
      nodes: [{ value: 'root', label: 'Root', children: [{ value: 'child', label: 'Child' }] }],
    });
    const multipleSelect = multiple.container.querySelector('select') as HTMLSelectElement;
    const selected = [...multipleSelect.querySelectorAll('option')]
      .filter((option) => option.selected)
      .map((option) => option.getAttribute('value'));
    expect(selected).toEqual(['root', 'child']);
  });

  it('renders conflict fields, task actions and micro app iframe', () => {
    const conflict = render(LiteConcurrentConflictModal, {
      formAction: '/orders/7/conflict',
      fields: [{ field: 'price', label: 'Price', localValue: 10, remoteValue: 12 }],
      modifiedBy: 'Ada',
    });
    expect(conflict.getByRole('dialog')).toBeTruthy();
    expect(conflict.getByRole('radio', { name: 'Mine' })).toBeTruthy();
    expect(conflict.getByRole('radio', { name: 'Theirs' })).toBeTruthy();
    expect(conflict.container.querySelector('form')?.getAttribute('action')).toBe('/orders/7/conflict');

    const tasks = render(LiteTaskCenter, {
      tasks: [
        { id: 't1', title: 'Export orders', status: 'running', progress: 42 },
        { id: 't2', title: 'Import users', status: 'completed', downloadHref: '/files/users.csv' },
      ],
    });
    expect(tasks.container.querySelector('progress')?.getAttribute('value')).toBe('42');
    expect(tasks.getByRole('link', { name: 'Download' }).getAttribute('href')).toBe('/files/users.csv');

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const frame = render(LiteMicroAppFrame, {
      src: 'about:blank',
      title: 'Metrics',
      fallbackHref: 'https://example.test/app',
    });
    const iframe = frame.container.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe('about:blank');
    expect(iframe?.getAttribute('sandbox')).toContain('allow-scripts');
    expect(frame.getByRole('link', { name: 'Open in a new tab' })).toBeTruthy();
    consoleError.mockRestore();
  });

  it('renders safe-delete impact and native confirmation form', () => {
    const view = render(LiteSafeDeleteConfirm, {
      action: '/orders/7/delete',
      impactItems: [{ label: 'Line items', count: 3 }, { label: 'Attachments' }],
      confirmationText: 'DELETE',
    });
    expect(view.getByText('Line items')).toBeTruthy();
    expect(view.getByText('3')).toBeTruthy();
    expect(view.getByLabelText(/Type DELETE to confirm/)).toBeTruthy();
    expect(view.container.querySelector('form')?.getAttribute('action')).toBe('/orders/7/delete');
  });

  it('renders audit entries with field diffs and legacy logs', () => {
    const view = render(LiteAuditLog, {
      entries: [{
        id: 'a1',
        timestamp: '2026-11-10T00:00:00.000Z',
        action: 'update',
        resource: 'orders',
        recordId: 7,
        userId: 'ada',
        previousData: { status: 'pending' },
        data: { status: 'approved' },
      }],
    });
    expect(view.getByText('orders #7')).toBeTruthy();
    expect(view.getByText('pending')).toBeTruthy();
    expect(view.getByText('approved')).toBeTruthy();

    const legacy = render(LiteAuditLog, {
      logs: [{ id: 1, action: 'create', resource: 'users', userName: 'Lin', createdAt: '2026-11-10T00:00:00.000Z' }],
    });
    expect(legacy.getByText('Lin')).toBeTruthy();
  });

  it('renders presence overflow, tour targets and gauge thresholds', () => {
    const presence = render(LitePresenceAvatarGroup, {
      users: [
        { id: '1', name: 'Ada', status: 'editing', avatar: '/ada.png' },
        { id: '2', name: 'Lin', status: 'viewing' },
        { id: '3', name: 'Sam', status: 'idle' },
      ],
      maxVisible: 2,
    });
    expect(presence.container.querySelectorAll('[data-presence-user]')).toHaveLength(2);
    expect(presence.getByText('+1')).toBeTruthy();

    const tour = render(LiteTour, {
      steps: [{ title: 'Open settings', target: '#settings', placement: 'bottom', href: '/settings' }],
    });
    expect(tour.getByText('Open settings')).toBeTruthy();

    const gauge = render(LiteGaugeChart, {
      props: {
        value: 72,
        unit: '%',
        target: 80,
        thresholds: [{ value: 60, label: 'Normal' }, { value: 85, label: 'Warning' }],
      },
    });
    expect(gauge.getAllByText('72%').length).toBeGreaterThan(0);
    expect(gauge.getAllByText('Warning').length).toBeGreaterThan(0);
  });
});

  it('renders enterprise suites: KpiCard, JsonViewer, and ResultPage', () => {
    // 1. LiteKpiCard
    const kpi = render(LiteKpiCard, {
      title: '季度总营收',
      value: 1250000,
      prefix: '¥',
      suffix: '元',
      trendText: '12.4%',
      trendDirection: 'up',
      sparklineData: [10, 20, 15, 30, 45, 40, 60],
      targetProgress: { current: 75, target: 100, label: '达成率' },
      alertStatus: 'warning',
      alertMessage: '接近季度阈值',
    });
    expect(kpi.getByText('季度总营收')).toBeTruthy();
    expect(kpi.getByText('1,250,000')).toBeTruthy();
    expect(kpi.getByText('¥')).toBeTruthy();
    expect(kpi.getByText('元')).toBeTruthy();
    expect(kpi.getByText('12.4%')).toBeTruthy();
    expect(kpi.getByText('75%')).toBeTruthy();
    expect(kpi.getByText('接近季度阈值')).toBeTruthy();
    expect(kpi.container.querySelector('polyline')).toBeTruthy();

    // 2. LiteJsonViewer
    const json = render(LiteJsonViewer, {
      title: 'Order Payload',
      data: { orderId: 'ORD-98213', amount: 450.8, status: 'paid' },
      initialDepth: 1,
    });
    expect(json.getByText('Order Payload')).toBeTruthy();
    expect(json.container.textContent).toContain('ORD-98213');
    expect(json.container.textContent).toContain('450.8');

    // 3. LiteResultPage
    const result = render(LiteResultPage, {
      status: 'success',
      title: '创建成功',
      description: '多租户项目已初始化完成',
      primaryActionHref: '/dashboard',
      primaryActionLabel: '前往工作台',
    });
    expect(result.getByText('创建成功')).toBeTruthy();
    expect(result.getByText('多租户项目已初始化完成')).toBeTruthy();
    expect(result.getByRole('link', { name: '前往工作台' }).getAttribute('href')).toBe('/dashboard');
  });

  it('renders enterprise suites: WatermarkContainer, ContextMenu, and UnsavedChangesGuard', () => {
    // 4. LiteWatermarkContainer
    const watermark = render(LiteWatermarkContainer, {
      content: ['CONFIDENTIAL', 'USER-9527'],
    });
    expect(watermark.container.querySelector('.lite-watermark-overlay')).toBeTruthy();
    const styleAttr = watermark.container.querySelector('.lite-watermark-container')?.getAttribute('style');
    expect(styleAttr).toContain('--lite-watermark-pattern');
    expect(styleAttr).toContain('CONFIDENTIAL');

    // 5. LiteContextMenu
    const contextMenu = render(LiteContextMenu, {
      items: [
        { key: 'copy', label: '复制编号', shortcut: '⌘C' },
        { key: 'sep', label: '', divider: true },
        { key: 'del', label: '彻底删除', danger: true, href: '/delete' },
      ],
    });
    expect(contextMenu.getByText('复制编号')).toBeTruthy();
    expect(contextMenu.getByText('⌘C')).toBeTruthy();
    expect(contextMenu.getByRole('link', { name: '彻底删除' }).getAttribute('href')).toBe('/delete');
    expect(contextMenu.container.querySelector('.lite-context-danger')).toBeTruthy();

    // 6. LiteUnsavedChangesGuard
    const unsaved = render(LiteUnsavedChangesGuard, {
      hasChanges: true,
      message: '表单存在尚未保存的修改',
    });
    expect(unsaved.getByText('表单存在尚未保存的修改')).toBeTruthy();
    expect(unsaved.container.querySelector('[data-dirty="true"]')).toBeTruthy();
  });

  it('renders enterprise suites: AnnouncementBanner, TextDiffViewer, and AsyncExportModal', () => {
    // 7. LiteAnnouncementBanner
    const banner = render(LiteAnnouncementBanner, {
      message: '生产数据库即将于 22:00 进行只读维护',
      tone: 'warning',
      countdownText: '01:30:00',
      actionText: '查看计划',
      actionHref: '/maintenance',
    });
    expect(banner.getByText('生产数据库即将于 22:00 进行只读维护')).toBeTruthy();
    expect(banner.getByText('01:30:00')).toBeTruthy();
    expect(banner.getByRole('link', { name: '查看计划' }).getAttribute('href')).toBe('/maintenance');

    // 8. LiteTextDiffViewer
    const diff = render(LiteTextDiffViewer, {
      oldText: 'port = 3000\nmode = "dev"',
      newText: 'port = 8080\nmode = "prod"',
      oldTitle: 'Base',
      newTitle: 'Head',
    });
    expect(diff.getByText('Base ↔ Head')).toBeTruthy();
    expect(diff.container.querySelectorAll('.lite-diff-add').length).toBeGreaterThan(0);
    expect(diff.container.querySelectorAll('.lite-diff-del').length).toBeGreaterThan(0);

    // 9. LiteAsyncExportModal
    const exportModal = render(LiteAsyncExportModal, {
      open: true,
      resourceName: 'Orders',
      action: '/api/export/orders',
      columns: [
        { key: 'id', label: 'Order No' },
        { key: 'amount', label: 'Total Amount' },
      ],
    });
    expect(exportModal.getByRole('region', { name: 'Export Orders' })).toBeTruthy();
    expect(exportModal.getByText('Order No')).toBeTruthy();
    expect(exportModal.getByText('Total Amount')).toBeTruthy();
    expect(exportModal.container.querySelector('form')?.getAttribute('action')).toBe('/api/export/orders');
  });
it('renders enterprise suites wave 2: StepWizard, WorkflowStepper, DualApprovalGate, KeyboardShortcutsModal', () => {
    // 10. LiteStepWizard
    const wizard = render(LiteStepWizard, {
      steps: [
        { id: '1', title: '空间信息' },
        { id: '2', title: '配置确认' },
      ],
      currentStep: 0,
      action: '/wizard/next',
    });
    expect(wizard.getByText('空间信息')).toBeTruthy();
    expect(wizard.container.querySelector('form')?.getAttribute('action')).toBe('/wizard/next');

    // 11. LiteWorkflowStepper
    const flow = render(LiteWorkflowStepper, {
      title: '部署进度',
      nodes: [
        { id: 'n1', label: '初始化网络', status: 'completed', durationText: '200ms' },
        { id: 'n2', label: '挂载存储', status: 'running' },
      ],
    });
    expect(flow.getByText('部署进度')).toBeTruthy();
    expect(flow.getByText('初始化网络')).toBeTruthy();
    expect(flow.getByText('200ms')).toBeTruthy();

    // 12. LiteDualApprovalGate
    const approval = render(LiteDualApprovalGate, {
      actionTitle: '大额打款复核',
      requiredRole: '财务主管',
      formAction: '/approve',
    });
    expect(approval.getByText('大额打款复核')).toBeTruthy();
    expect(approval.container.querySelector('form')?.getAttribute('action')).toBe('/approve');

    // 13. LiteKeyboardShortcutsModal
    const shortcuts = render(LiteKeyboardShortcutsModal, {
      title: '系统快捷键',
      shortcuts: [{ label: '搜索', keys: ['Ctrl', 'K'] }],
    });
    expect(shortcuts.getByText('系统快捷键')).toBeTruthy();
    expect(shortcuts.getByText('搜索')).toBeTruthy();
    expect(shortcuts.getByText('Ctrl')).toBeTruthy();
  });

  it('renders enterprise suites: WebhookSimulator, HmacSignatureCalculator, and ApiPlayground', () => {
    // 14. LiteWebhookSimulator
    const webhook = render(LiteWebhookSimulator, {
      eventType: 'order.paid',
      endpoint: 'https://api.test/hook',
      payload: { amount: 100 },
      statusCode: 200,
      durationMs: 45,
    });
    expect(webhook.getByText('order.paid')).toBeTruthy();
    expect(webhook.getByText('https://api.test/hook')).toBeTruthy();
    expect(webhook.container.textContent).toContain('100');
    expect(webhook.getByText('HTTP 200 OK')).toBeTruthy();
    expect(webhook.getByText('45ms')).toBeTruthy();

    // 15. LiteHmacSignatureCalculator
    const hmac = render(LiteHmacSignatureCalculator, {
      secret: 'my_secret',
      payload: '{"ok":true}',
      algorithm: 'SHA-256',
      signature: '7b5a8e0f9c2d1b4a',
    });
    expect(hmac.getByText('my_secret')).toBeTruthy();
    expect(hmac.getByText('{"ok":true}')).toBeTruthy();
    expect(hmac.getByText('HMAC-SHA-256')).toBeTruthy();
    expect(hmac.getByText('7b5a8e0f9c2d1b4a')).toBeTruthy();

    // 16. LiteApiPlayground
    const api = render(LiteApiPlayground, {
      method: 'POST',
      url: '/api/v1/orders',
      curl: 'curl -X POST "/api/v1/orders"',
      responseStatus: 200,
    });
    expect(api.getAllByText('POST').length).toBeGreaterThan(0);
    expect(api.getByText('/api/v1/orders')).toBeTruthy();
    expect(api.container.textContent).toContain('curl -X POST "/api/v1/orders"');
    expect(api.getByText('预估状态: HTTP 200 OK')).toBeTruthy();
  });

  it('renders enterprise suites: PlanUsageQuotaBar, TierFeatureComparison, and BillingInvoiceDrawer', () => {
    // 17. LitePlanUsageQuotaBar
    const quota = render(LitePlanUsageQuotaBar, {
      planName: '企业旗舰专属版',
      resetDateText: '2026-12-01',
      quotas: [
        { label: 'API 额度', current: 80, limit: 100, unit: '次' },
      ],
    });
    expect(quota.getByText('企业旗舰专属版')).toBeTruthy();
    expect(quota.getByText('重置周期: 2026-12-01')).toBeTruthy();
    expect(quota.getByText('API 额度')).toBeTruthy();
    expect(quota.getByText('80 / 100 次 (80%)')).toBeTruthy();

    // 18. LiteTierFeatureComparison
    const tier = render(LiteTierFeatureComparison, {
      tiers: [
        { key: 'starter', name: '基础版', price: '¥0', isCurrent: true },
        { key: 'pro', name: '专业版', price: '¥999' },
      ],
      features: [
        { name: '多租户隔离', values: { starter: true, pro: true } },
        { name: '坐席席位', values: { starter: '5', pro: '50' } },
      ],
    });
    expect(tier.getByText('基础版')).toBeTruthy();
    expect(tier.getByText('专业版')).toBeTruthy();
    expect(tier.getByText('当前套餐')).toBeTruthy();
    expect(tier.getByText('多租户隔离')).toBeTruthy();
    expect(tier.getByText('50')).toBeTruthy();

    // 19. LiteBillingInvoiceDrawer
    const inv = render(LiteBillingInvoiceDrawer, {
      invoiceNo: 'INV-202611-999',
      period: '2026-10月度',
      totalAmount: '¥18,450',
      status: 'paid',
      items: [
        { name: '企业席位租用', amount: '¥15,000' },
      ],
      downloadUrl: 'https://example.test/inv.pdf',
    });
    expect(inv.getByText('账单 #INV-202611-999')).toBeTruthy();
    expect(inv.getByText('(2026-10月度)')).toBeTruthy();
    expect(inv.getByText('PAID')).toBeTruthy();
    expect(inv.getByText('¥18,450')).toBeTruthy();
    expect(inv.getByText('企业席位租用')).toBeTruthy();
    expect(inv.getByRole('link', { name: '下载发票 (PDF)' }).getAttribute('href')).toBe('https://example.test/inv.pdf');
  });
