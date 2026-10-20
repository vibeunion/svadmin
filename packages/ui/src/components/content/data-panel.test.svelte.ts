import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import DataPanel from './DataPanel.svelte';

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

describe('DataPanel', () => {
  it('renders a titled region labelled by its heading', () => {
    const { container } = render(DataPanel, {
      title: '委托单明细',
      description: '审核通过后自动归档',
      children: snippet('<p>Body</p>'),
    });
    const panel = container.querySelector('[data-svadmin-data-panel]') as HTMLElement;
    const heading = screen.getByRole('heading', { level: 2, name: '委托单明细' });
    expect(panel.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.id).not.toBe('');
    expect(screen.getByText('审核通过后自动归档')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('omits the header entirely when untitled', () => {
    const { container } = render(DataPanel, { children: snippet('<p>Body</p>') });
    expect(container.querySelector('[data-slot="data-panel-header"]')).toBeNull();
    expect(container.querySelector('[data-svadmin-data-panel]')?.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('honours the requested heading level', () => {
    render(DataPanel, { title: '嵌套区块', headingLevel: 'h3', children: snippet('<p>Body</p>') });
    expect(screen.getByRole('heading', { level: 3, name: '嵌套区块' })).toBeTruthy();
  });

  it('maps padding onto the panel hook', () => {
    const { container, rerender } = render(DataPanel, { title: 'Panel', children: snippet('<p>Body</p>') });
    const panel = container.querySelector('[data-svadmin-data-panel]') as HTMLElement;
    expect(panel.getAttribute('data-padding')).toBe('default');
    rerender({ padding: 'none' });
    expect(panel.getAttribute('data-padding')).toBe('none');
    rerender({ padding: 'compact' });
    expect(panel.getAttribute('data-padding')).toBe('compact');
  });

  it('renders actions and footer slots', () => {
    render(DataPanel, {
      title: 'Panel',
      actions: snippet('<button type="button">导出</button>'),
      footer: snippet('<span>共 12 条</span>'),
      children: snippet('<p>Body</p>'),
    });
    expect(screen.getByRole('button', { name: '导出' })).toBeTruthy();
    expect(screen.getByText('共 12 条')).toBeTruthy();
  });
});