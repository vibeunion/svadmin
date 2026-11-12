import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MicroAppSandbox from './MicroAppSandbox.svelte';

describe('MicroAppSandbox component suite', () => {
  it('renders micro app header and healthy mounted status', () => {
    const { getByText, container } = render(MicroAppSandbox, {
      appName: '企业商业智能 (BI) 报表子应用',
      appId: 'app-bi-micro-01',
    });

    expect(getByText('企业商业智能 (BI) 报表子应用')).toBeTruthy();
    expect(getByText('app-bi-micro-01')).toBeTruthy();
    expect(getByText('运行健康 (Mounted)')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="micro-app-sandbox"]')).toBeTruthy();
  });

  it('triggers onReload when reload button is clicked', async () => {
    const onReload = vi.fn();
    const { container } = render(MicroAppSandbox, {
      onReload,
    });

    const reloadBtn = container.querySelector('button[title="重新加载沙箱"]');
    expect(reloadBtn).toBeTruthy();
    if (reloadBtn) {
      await fireEvent.click(reloadBtn);
    }

    expect(onReload).toHaveBeenCalled();
  });

  it('switches to error boundary on simulated crash and allows recovery', async () => {
    const onError = vi.fn();
    const { getByText } = render(MicroAppSandbox, {
      onError,
    });

    const crashBtn = getByText('测试异常容灾兜底');
    await fireEvent.click(crashBtn);

    expect(getByText('子应用隔离拦截与崩溃保护')).toBeTruthy();
    expect(onError).toHaveBeenCalled();

    const recoverBtn = getByText('尝试自愈重启');
    expect(recoverBtn).toBeTruthy();
    await fireEvent.click(recoverBtn);
  });
});
