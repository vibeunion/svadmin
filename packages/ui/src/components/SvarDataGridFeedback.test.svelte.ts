import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Host from './SvarDataGridFeedback.test-host.svelte';
import type { SvarInteractiveColumn } from './svar-grid-interactions.js';

const columns: SvarInteractiveColumn[] = [{ key: 'title', label: '标题' }];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SvarDataGrid error feedback', () => {
  it('hides configuration diagnostics behind a localized generic alert', async () => {
    const unsafeColumn = {
      key: 'title',
      label: '标题',
      get width(): number { throw new Error('PRIVATE_DIAGNOSTIC'); },
    } as SvarInteractiveColumn;
    const view = render(Host, { columns: [unsafeColumn], locale: 'zh-CN' });

    await waitFor(() => expect(view.getByRole('alert').textContent).toBe('表格配置无效，请检查后重试'));
    expect(view.baseElement.textContent).not.toContain('PRIVATE_DIAGNOSTIC');
  });

  it('hides data diagnostics behind a localized generic alert', async () => {
    const unsafeRecord = new Proxy({ id: 1, title: 'Sensitive' }, {
      getOwnPropertyDescriptor() { throw new Error('PRIVATE_DIAGNOSTIC'); },
    });
    const view = render(Host, { columns, items: [unsafeRecord], locale: 'zh-CN' });

    await waitFor(() => expect(view.getByRole('alert').textContent).toBe('表格数据无效，请刷新后重试'));
    expect(view.baseElement.textContent).not.toContain('PRIVATE_DIAGNOSTIC');
  });

  it('hides rejected edit diagnostics and shows the generic save failure', async () => {
    const onCellEdit = vi.fn<(edit: { id: string | number; field: string; value: string | number }) => Promise<void>>()
      .mockRejectedValueOnce(new Error('PRIVATE_DIAGNOSTIC'));
    const view = render(Host, { columns: [{ key: 'title', label: 'Title', editable: 'text' }], items: [{ id: 1, title: 'Before' }], onCellEdit, locale: 'en-US' });

    await waitFor(() => expect(view.getByTestId('grid-row').textContent).toContain('Before'));
    window.dispatchEvent(new CustomEvent('svadmin-test-grid-edit', { detail: { id: 'n:1', column: 'title', value: 'After' } }));

    await waitFor(() => expect(onCellEdit).toHaveBeenCalledWith({ id: 1, field: 'title', value: 'After' }));
    await waitFor(() => expect(view.getByRole('alert').textContent).toBe('Save failed; refresh before retrying'));
    expect(view.baseElement.textContent).not.toContain('PRIVATE_DIAGNOSTIC');
  });
});

describe('SvarDataGrid locale defaults', () => {
  it('localizes default labels and pane names for zh-CN', async () => {
    const view = render(Host, {
      columns: [{ key: 'title', label: '标题' }, { key: 'status', label: '状态' }],
      items: [], locale: 'zh-CN', freezeRight: 1,
    });

    await waitFor(() => expect(view.getByRole('region', { name: '可滚动列' })).toBeTruthy());
    expect(view.getByRole('group', { name: '数据表格' })).toBeTruthy();
    expect(view.getByRole('region', { name: '右侧冻结列' })).toBeTruthy();
    expect(view.getByRole('status').textContent).toBe('暂无记录');
    for (const internal of ['Data grid', 'No records', 'Scrollable columns', 'Frozen right columns']) {
      expect(view.baseElement.textContent).not.toContain(internal);
    }
  });

  it('localizes default loading and disabled labels without changing overrides', async () => {
    const columns: SvarInteractiveColumn[] = [{ key: 'title', label: '标题' }];
    const view = render(Host, { columns, items: [], locale: 'zh-CN', loading: true });
    await waitFor(() => expect(view.getByRole('status').textContent).toBe('加载中...'));

    await view.rerender({ columns, items: [], locale: 'zh-CN', loading: false, disabled: true });
    await waitFor(() => expect(view.getByRole('status').textContent).toBe('表格已禁用'));

    await view.rerender({ columns, items: [], locale: 'zh-CN', loading: false, disabled: false, label: '自定义表格', emptyLabel: '自定义空状态' });
    await waitFor(() => expect(view.getByRole('group', { name: '自定义表格' })).toBeTruthy());
    expect(view.getByRole('status').textContent).toBe('自定义空状态');
  });

  it('localizes window load failures without exposing diagnostics', async () => {
    const load = vi.fn(async () => { throw new Error('PRIVATE_DIAGNOSTIC'); });
    const view = render(Host, {
      columns: [{ key: 'title', label: '标题' }], items: [], locale: 'zh-CN',
      queryMode: 'server', windowSource: { total: 2, load },
    });

    await waitFor(() => expect(view.getByRole('region', { name: '可滚动列' })).toBeTruthy());
    window.dispatchEvent(new CustomEvent('svadmin-test-grid-request', { detail: { row: { start: 0, end: 2 } } }));
    await waitFor(() => expect(view.getByRole('alert').textContent).toBe('窗口加载失败，请重试'));
    expect(view.getByRole('button', { name: '重试窗口' })).toBeTruthy();
    expect(view.baseElement.textContent).not.toContain('Window load failed');
    expect(view.baseElement.textContent).not.toContain('PRIVATE_DIAGNOSTIC');
  });

  it('localizes invalid window feedback for zh-CN', async () => {
    const load = vi.fn(async () => ({ data: [], total: 0 }));
    const view = render(Host, {
      columns: [{ key: 'title', label: '标题' }], items: [], locale: 'zh-CN',
      queryMode: 'server', windowSource: { total: 2, load },
    });

    await waitFor(() => expect(view.getByRole('region', { name: '可滚动列' })).toBeTruthy());
    window.dispatchEvent(new CustomEvent('svadmin-test-grid-request', { detail: { row: { start: -1, end: 0 } } }));
    await waitFor(() => expect(view.getByRole('alert').textContent).toBe('表格窗口无效'));
    expect(view.baseElement.textContent).not.toContain('Invalid grid window');
    expect(load).not.toHaveBeenCalled();
  });
});
