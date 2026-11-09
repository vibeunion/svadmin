import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProCard from './ProCard.svelte';

afterEach(() => cleanup());

const bodySnippet = createRawSnippet(() => ({
  render: () => '<p>Card Body Content</p>',
}));

describe('ProCard', () => {
  it('renders standard card with title, subtitle, and body', () => {
    const { container } = render(ProCard, {
      title: 'Metrics Overview',
      subTitle: 'Updated 5m ago',
      tooltip: 'Real-time aggregated numbers',
      children: bodySnippet,
    });

    const card = container.querySelector('[data-svadmin-component="ProCard"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('Metrics Overview');
    expect(card?.textContent).toContain('Updated 5m ago');
    expect(card?.textContent).toContain('Card Body Content');
  });

  it('handles collapsible toggle interaction', async () => {
    const oncollapse = vi.fn();
    const { container, getByRole } = render(ProCard, {
      title: 'Collapsible Section',
      collapsible: true,
      defaultCollapsed: false,
      oncollapse,
      children: bodySnippet,
    });

    const header = getByRole('button');
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Card Body Content');

    await fireEvent.click(header);
    expect(oncollapse).toHaveBeenCalledWith(true);
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).not.toContain('Card Body Content');
  });

  it('renders tabs in header and handles tab switching', async () => {
    const ontabchange = vi.fn();
    const { getByText } = render(ProCard, {
      title: 'Analytics Card',
      tabs: [
        { key: 'daily', label: 'Daily' },
        { key: 'monthly', label: 'Monthly' },
      ],
      activeTabKey: 'daily',
      ontabchange,
      children: bodySnippet,
    });

    const monthlyTab = getByText('Monthly');
    await fireEvent.click(monthlyTab);
    expect(ontabchange).toHaveBeenCalledWith('monthly');
  });

  it('supports ghost mode without border and background', () => {
    const { container } = render(ProCard, {
      ghost: true,
      children: bodySnippet,
    });

    const card = container.querySelector('[data-svadmin-component="ProCard"]');
    expect(card?.getAttribute('data-ghost')).toBe('true');
    expect(card?.classList.contains('bg-transparent')).toBe(true);
  });
});
