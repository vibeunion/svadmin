import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EllipsisText from './EllipsisText.svelte';

afterEach(() => {
  cleanup();
});

describe('EllipsisText', () => {
  it('renders clamped text with line-clamp style and visual grounding', () => {
    const { container } = render(EllipsisText, {
      text: 'Long enterprise content that spans multiple sentences and paragraphs.',
      maxLines: 2,
      expandable: true,
    });

    const root = container.querySelector('[data-svadmin-component="EllipsisText"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('data-expanded')).toBe('false');

    const contentDiv = root?.querySelector('div');
    expect(contentDiv?.getAttribute('style')).toContain('--line-clamp: 2');
  });

  it('toggles expand and collapse on button click', async () => {
    const { container, getByRole } = render(EllipsisText, {
      text: 'Detailed description text here',
      maxLines: 1,
      expandable: true,
      expandText: 'Expand Details',
      collapseText: 'Collapse Details',
    });

    const button = getByRole('button');
    expect(button.textContent?.trim()).toBe('Expand Details');

    await fireEvent.click(button);
    expect(button.textContent?.trim()).toBe('Collapse Details');
    expect(container.querySelector('[data-svadmin-component="EllipsisText"]')?.getAttribute('data-expanded')).toBe('true');

    await fireEvent.click(button);
    expect(button.textContent?.trim()).toBe('Expand Details');
  });

  it('renders tooltip title attribute when tooltip prop is provided', () => {
    const { container } = render(EllipsisText, {
      text: 'Full tooltip text',
      tooltip: true,
    });

    const root = container.querySelector('[data-svadmin-component="EllipsisText"]');
    expect(root?.getAttribute('title')).toBe('Full tooltip text');
  });

  it('supports rows alias, suffix, and onchange callback', async () => {
    const onchange = vi.fn();
    const onExpand = vi.fn();
    const { container, getByRole } = render(EllipsisText, {
      text: 'Long content with suffix',
      rows: 4,
      suffix: '2026-11-17',
      expandable: true,
      onchange,
      onExpand,
    });

    const root = container.querySelector('[data-svadmin-component="EllipsisText"]');
    const contentDiv = root?.querySelector('div');
    expect(contentDiv?.getAttribute('style')).toContain('--line-clamp: 4');
    expect(container.textContent).toContain('2026-11-17');

    const button = getByRole('button');
    await fireEvent.click(button);
    expect(onchange).toHaveBeenCalledWith(true);
    expect(onExpand).toHaveBeenCalledWith(true);
  });

  it('respects controlled expanded prop', () => {
    const { container } = render(EllipsisText, {
      text: 'Controlled text content',
      expanded: true,
    });

    const root = container.querySelector('[data-svadmin-component="EllipsisText"]');
    expect(root?.getAttribute('data-expanded')).toBe('true');
  });
});
