import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Tool from './tool/index.js';
import Host from './core-contracts.test-host.svelte';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('official composition contracts', () => {
  it('accepts from-based messages and renders response children', async () => {
    const { container } = render(Host);

    const message = container.querySelector('[data-message-id="message-contract"]');
    expect(message?.getAttribute('data-role')).toBe('assistant');
    expect(message?.getAttribute('data-contract')).toBe('message');
    await waitFor(() => expect(screen.getByText('Composed response')).not.toBeNull());
    await waitFor(() => expect(screen.getByText('Markdown response').closest('[data-streamdown-strong]')).not.toBeNull());
    const action = screen.getByTestId('message-action');
    expect(action.getAttribute('data-size')).toBe('icon-sm');
    expect(action.parentElement?.querySelector('[role="tooltip"]')?.textContent).toBe('Copy response');
  });

  it('only renders the explicit conversation scroll button away from the bottom', async () => {
    const { container } = render(Host);
    const content = container.querySelector('[role="log"]') as HTMLElement;
    expect(content).not.toBeNull();
    expect(screen.queryByTestId('scroll-button')).toBeNull();

    Object.defineProperties(content, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 500 },
      scrollTop: { configurable: true, value: 0, writable: true },
    });
    await fireEvent.scroll(content);
    expect(screen.getByTestId('scroll-button')).not.toBeNull();
    await fireEvent.click(screen.getByTestId('scroll-button'));
    expect(screen.queryByTestId('scroll-button')).toBeNull();
    expect(screen.getByTestId('empty-state-icon')).not.toBeNull();
    expect(screen.getByText('No messages yet')).not.toBeNull();
  });

  it('tracks reasoning streaming and auto-closes once after completion', async () => {
    vi.useFakeTimers();
    const view = render(Host, { streaming: true });
    await waitFor(() => expect(screen.getByTestId('reasoning-open').textContent).toBe('true'));

    await view.rerender({ streaming: false });
    vi.advanceTimersByTime(999);
    expect(screen.getByTestId('reasoning-open').textContent).toBe('true');
    vi.advanceTimersByTime(1);
    await waitFor(() => expect(screen.getByTestId('reasoning-open').textContent).toBe('false'));
  });

  it('forwards native form attributes and syncs the hidden input', async () => {
    const view = render(Host, { promptValue: 'native form value' });
    const { container } = view;
    const form = container.querySelector('form#prompt-contract');
    expect(form?.getAttribute('name')).toBe('prompt-form');
    expect(form?.getAttribute('data-contract')).toBe('form');
    const hidden = form?.querySelector('input[type="hidden"][name="message"]') as HTMLInputElement | null;
    expect(hidden?.value).toBe('native form value');
    await view.rerender({ promptValue: 'updated form value' });
    expect(hidden?.value).toBe('updated form value');
  });

  it('keeps tool status metadata as a data contract and renders artifact/open-in actions', async () => {
    expect(Tool.getStatusBadge('output-available')).toMatchObject({ label: 'Completed', tone: 'success', icon: 'check-circle' });
    expect(Tool.getStatusBadge('approval-requested')).toMatchObject({ tone: 'warning', icon: 'clock' });
    expect(Tool.getStatusBadge('input-available')).toMatchObject({ icon: 'clock', pulse: true });
    render(Host);
    await fireEvent.click(screen.getByRole('button', { name: 'Open in chat' }));
    expect(screen.getByTestId('chatgpt-link').getAttribute('href')).toContain('prompt=hello+world');
    const artifactAction = screen.getByTestId('artifact-action');
    expect(artifactAction.getAttribute('data-size')).toBe('icon-sm');
    expect(artifactAction.getAttribute('data-variant')).toBe('outline');
    expect(artifactAction.querySelector('svg')).not.toBeNull();
    expect(artifactAction.parentElement?.querySelector('[role="tooltip"]')?.textContent).toBe('Copy artifact');
    expect(screen.getByTestId('artifact-close').getAttribute('data-size')).toBe('lg');
  });
});
