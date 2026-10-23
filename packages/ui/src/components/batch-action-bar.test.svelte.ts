import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import BatchActionBar from './BatchActionBar.svelte';
import BatchActionBarHost from './batch-action-bar.test-host.svelte';

describe('BatchActionBar component', () => {
  it('does not render when selectedCount is 0', () => {
    const view = render(BatchActionBar, { selectedCount: 0 });
    expect(view.container.querySelector('[role="region"]')).toBeNull();
  });

  it('renders inline batch bar when items are selected', () => {
    const view = render(BatchActionBar, {
      selectedCount: 5,
      totalCount: 20,
    });
    const region = view.container.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(view.container.textContent).toContain('5 of 20 records selected');
  });

  it('handles custom selectedLabel template', () => {
    const view = render(BatchActionBar, {
      selectedCount: 8,
      selectedLabel: '已选择 {count} 项数据',
    });
    expect(view.container.textContent).toContain('已选择 8 项数据');
  });

  it('triggers onclear callback when clear button is clicked', async () => {
    const onclear = vi.fn();
    const view = render(BatchActionBar, {
      selectedCount: 3,
      clearLabel: '取消选择',
      onclear,
    });
    const clearBtn = view.container.querySelector('button');
    expect(clearBtn?.textContent).toContain('取消选择');
    if (clearBtn) await fireEvent.click(clearBtn);
    expect(onclear).toHaveBeenCalledOnce();
  });

  it('renders floating variant with distinct styling', () => {
    const view = render(BatchActionBar, {
      selectedCount: 2,
      variant: 'floating',
    });
    const region = view.container.querySelector('[role="region"]');
    expect(region?.className).toContain('svadmin-batch-action-bar--floating');
  });

  it('uses localized semantics and locks clear while pending', async () => {
    const onclear = vi.fn();
    const view = render(BatchActionBar, {
      selectedCount: 2,
      pending: true,
      onclear,
    });
    const region = view.container.querySelector('[role="region"]');
    expect(region?.getAttribute('aria-label')).toBe('Batch actions');
    expect(region?.getAttribute('aria-busy')).toBe('true');
    expect(view.getByRole('status').textContent).toContain('Processing');
    const clear = view.getByRole('button', { name: 'Clear selection' });
    expect(clear.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(clear);
    expect(onclear).not.toHaveBeenCalled();
  });

  it('updates the default region and count language without replacing custom text', async () => {
    const onclear = vi.fn();
    const onaction = vi.fn();
    const onsubmit = vi.fn();
    const view = render(BatchActionBarHost, { pending: true, onclear, onaction, onsubmit });
    expect(view.getByRole('region', { name: 'Batch actions' })).toBeTruthy();
    expect(view.container.textContent).toContain('2 of 10 records selected');
    expect(view.getByRole('button', { name: 'Clear selection' })).toBeTruthy();
    expect(view.getByRole('status').textContent).toContain('Processing');
    await view.component.setLocale('zh-CN');
    expect(view.getByRole('region', { name: '批量操作' })).toBeTruthy();
    expect(view.container.textContent).toContain('已选择 2 / 10 条记录');
    expect(view.getByRole('button', { name: '清除选择' })).toBeTruthy();
    expect(view.getByRole('status').textContent).toContain('处理中');
    await view.rerender({ selectedLabel: '已选择 {count} 条任务' });
    expect(view.container.textContent).toContain('已选择 2 条任务');
  });

  it.each(['default', 'floating', 'subtle'] as const)('locks and restores actions without submitting in %s mode', async variant => {
    const onclear = vi.fn();
    const onaction = vi.fn();
    const onsubmit = vi.fn();
    const view = render(BatchActionBarHost, { pending: true, variant, onclear, onaction, onsubmit });
    expect(view.getByRole('region').getAttribute('aria-busy')).toBe('true');
    expect(view.container.querySelectorAll('[inert]').length).toBeGreaterThan(0);
    const clear = view.getByRole('button', { name: 'Clear selection' });
    expect(clear.getAttribute('type')).toBe('button');
    expect(clear.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(clear);
    expect(onclear).not.toHaveBeenCalled();
    expect(onsubmit).not.toHaveBeenCalled();
    expect(onaction).not.toHaveBeenCalled();
    const buttons = [...view.container.querySelectorAll('button')].filter(button =>
      ['Apply', 'Archive'].includes(button.textContent ?? ''),
    );
    expect(buttons).toHaveLength(2);
    for (const button of buttons) expect(button.closest('[inert]')).not.toBeNull();
    await view.rerender({ pending: false });
    expect(view.getByRole('region').hasAttribute('aria-busy')).toBe(false);
    expect(view.container.querySelector('[inert]')).toBeNull();
    expect(clear.hasAttribute('disabled')).toBe(false);
    await fireEvent.click(clear);
    expect(onclear).toHaveBeenCalledOnce();
    expect(onsubmit).not.toHaveBeenCalled();
    await fireEvent.click(view.getByRole('button', { name: 'Apply' }));
    expect(onaction).toHaveBeenCalledOnce();
  });

  it('keeps pending context visible at zero selection and hides after completion', async () => {
    const view = render(BatchActionBar, { selectedCount: 0, pending: true });
    expect(view.getByRole('region')).toBeTruthy();
    expect(view.getByRole('status').textContent).toContain('Processing');
    await view.rerender({ pending: false });
    expect(view.queryByRole('region')).toBeNull();
  });

  it.each(['default', 'floating', 'subtle'] as const)('keeps a stable live region outside the busy %s toolbar', async variant => {
    const view = render(BatchActionBar, { selectedCount: 2, variant });
    const status = view.getByRole('status');
    expect(status.textContent).toBe('');
    await view.rerender({ pending: true });
    expect(view.getByRole('status')).toBe(status);
    expect(status.textContent).toContain('Processing');
    expect(status.closest('[aria-busy="true"]')).toBeNull();
    expect(view.getByRole('region').getAttribute('aria-busy')).toBe('true');
    await view.rerender({ pending: false, selectedCount: 0 });
    expect(view.getByRole('status')).toBe(status);
    expect(status.textContent).toBe('');
  });

  it('preserves explicit accessible labels through locale changes', async () => {
    const view = render(BatchActionBarHost, {
      pending: true, onclear: vi.fn(), onaction: vi.fn(), onsubmit: vi.fn(),
      ariaLabel: 'Task actions', clearLabel: 'Reset tasks', pendingLabel: 'Updating tasks',
      selectedLabel: '{count} tasks',
    });
    await view.component.setLocale('zh-CN');
    expect(view.getByRole('region', { name: 'Task actions' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Reset tasks' })).toBeTruthy();
    expect(view.getByRole('status').textContent).toBe('Updating tasks');
    expect(view.container.textContent).toContain('2 tasks');
  });
});
