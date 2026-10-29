import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import CopyButton from './CopyButton.svelte';

const writeText = vi.fn<(value: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockReset();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
});

describe('CopyButton', () => {
  it('copies the value, reports success, and calls oncopy', async () => {
    writeText.mockResolvedValue(undefined);
    const oncopy = vi.fn();
    render(CopyButton, { props: { value: 'FA-2026-001', description: '完整编号', oncopy } });
    const button = screen.getByRole('button', { name: '复制完整编号' });
    await fireEvent.click(button);
    expect(writeText).toHaveBeenCalledWith('FA-2026-001');
    expect(oncopy).toHaveBeenCalledWith('FA-2026-001');
    expect(button.getAttribute('data-state')).toBe('copied');
    expect(screen.getByRole('status').textContent).toBe('已复制完整编号');
  });

  it('keeps successful clipboard feedback when the host callback throws', async () => {
    writeText.mockResolvedValue(undefined);
    const oncopy = vi.fn(() => { throw new Error('Host callback failed'); });
    render(CopyButton, { props: { value: 'FA-2026-005', oncopy } });
    const button = screen.getByRole('button', { name: '复制内容' });
    await fireEvent.click(button);
    expect(oncopy).toHaveBeenCalledWith('FA-2026-005');
    expect(button.getAttribute('data-state')).toBe('copied');
    expect(screen.getByRole('status').textContent).toBe('已复制内容');
  });

  it('keeps the accessible label stable while exposing the failure state', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    render(CopyButton, { props: { value: 'FA-2026-002', description: '完整编号' } });
    const button = screen.getByRole('button', { name: '复制完整编号' });
    await fireEvent.click(button);
    expect(button.getAttribute('data-state')).toBe('error');
    expect(screen.getByRole('status').textContent).toBe('复制失败，请检查剪贴板权限。');
  });

  it('disables empty or explicitly disabled buttons', () => {
    render(CopyButton, { props: { value: '', description: '空值' } });
    expect(screen.getByRole('button', { name: '复制空值' }).hasAttribute('disabled')).toBe(true);
    render(CopyButton, { props: { value: 'FA-2026-003', description: '禁用', disabled: true } });
    expect(screen.getByRole('button', { name: '复制禁用' }).hasAttribute('disabled')).toBe(true);
  });

  it('resets the copied state after the configured delay', async () => {
    vi.useFakeTimers();
    writeText.mockResolvedValue(undefined);
    render(CopyButton, { props: { value: 'FA-2026-004', description: '完整编号', resetDelayMs: 500 } });
    const button = screen.getByRole('button', { name: '复制完整编号' });
    await fireEvent.click(button);
    expect(button.getAttribute('data-state')).toBe('copied');
    vi.advanceTimersByTime(500);
    await Promise.resolve();
    expect(button.getAttribute('data-state')).toBe('idle');
  });
});
