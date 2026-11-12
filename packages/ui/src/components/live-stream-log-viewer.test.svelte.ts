import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import LiveStreamLogViewer from './LiveStreamLogViewer.svelte';

describe('LiveStreamLogViewer component suite', () => {
  it('renders log entries and stream controls', () => {
    const { getByText, container } = render(LiveStreamLogViewer, {
      title: '应用网关实时日志'
    });

    expect(getByText('应用网关实时日志')).toBeTruthy();
    expect(container.textContent).toContain('Gateway');
    expect(getByText('暂停')).toBeTruthy();
  });

  it('toggles stream state and triggers callback', async () => {
    const onToggle = vi.fn();
    const { getByText } = render(LiveStreamLogViewer, {
      ontogglestream: onToggle
    });

    const pauseBtn = getByText('暂停');
    await fireEvent.click(pauseBtn);
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
