import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import PagePattern from './PagePattern.svelte';
import PagePatternExample from '../../stories/PagePatternExample.svelte';

describe('PagePattern', () => {
  it.each([
    ['list', 'compact', 'wide'],
    ['form', 'comfortable', 'narrow'],
    ['detail', 'comfortable', 'default'],
    ['workspace', 'compact', 'wide'],
    ['dashboard', 'comfortable', 'wide'],
  ] as const)('applies the %s page defaults', (kind, density, width) => {
    const children = createRawSnippet(() => ({ render: () => '<p>Content</p>' }));
    const { container } = render(PagePattern, { kind, title: 'Page', children });
    expect(container.querySelector('[data-svadmin-content-page]')?.getAttribute('data-density')).toBe(density);
    expect(container.querySelector('[data-svadmin-content-page-width]')?.getAttribute('data-svadmin-content-page-width')).toBe(width);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Page');
  });

  it('renders a workspace secondary panel and named composition regions', () => {
    const children = createRawSnippet(() => ({ render: () => '<p>Primary</p>' }));
    const secondary = createRawSnippet(() => ({ render: () => '<p>Secondary</p>' }));
    const toolbar = createRawSnippet(() => ({ render: () => '<button>Filter</button>' }));
    const { container } = render(PagePattern, { kind: 'workspace', title: 'Workspace', children, secondary, toolbar });
    expect(container.querySelector('[data-page-pattern-toolbar]')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-workspace-primary]')?.textContent).toContain('Primary');
    expect(container.querySelector('[data-svadmin-workspace-secondary]')?.textContent).toContain('Secondary');
  });

  it('updates defaults when the page kind changes and respects explicit overrides', async () => {
    const children = createRawSnippet(() => ({ render: () => '<p>Content</p>' }));
    const { container, rerender } = render(PagePattern, { kind: 'list', title: 'Page', children });
    await rerender({ kind: 'form' });
    const shell = container.querySelector('[data-svadmin-content-page]');
    expect(shell?.getAttribute('data-density')).toBe('comfortable');
    expect(shell?.getAttribute('data-svadmin-content-page-width')).toBe('narrow');
    await rerender({ kind: 'workspace', width: 'default', density: 'comfortable' });
    expect(shell?.getAttribute('data-density')).toBe('comfortable');
    expect(shell?.getAttribute('data-svadmin-content-page-width')).toBe('default');
  });

  it('does not discard secondary content on a detail page', () => {
    const children = createRawSnippet(() => ({ render: () => '<p>Record</p>' }));
    const secondary = createRawSnippet(() => ({ render: () => '<p>Audit history</p>' }));
    render(PagePattern, { kind: 'detail', title: 'Record detail', children, secondary });
    expect(screen.getByText('Audit history')).toBeTruthy();
  });

  it('filters and clears results in the custom list example', async () => {
    render(PagePatternExample);
    await fireEvent.input(screen.getByRole('textbox', { name: '搜索客户项目' }), { target: { value: '不存在' } });
    expect(screen.getByText('没有匹配的项目')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: '清除筛选' }));
    expect(screen.getByRole('table')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    expect(screen.getByText('材料分析实验室')).toBeTruthy();
  });

  it('recovers from a failed query without exposing a premature success view', async () => {
    render(PagePatternExample, { viewState: 'error' });
    expect(screen.queryByRole('table')).toBeNull();
    await fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('changes workspace selection', async () => {
    render(PagePatternExample, { kind: 'workspace' });
    await fireEvent.click(screen.getByRole('button', { name: /材料分析实验室/ }));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('材料分析实验室');
  });

  it('creates a demo record that can be found after returning to the list', async () => {
    render(PagePatternExample);
    await fireEvent.click(screen.getByRole('button', { name: '新建项目' }));
    await fireEvent.input(screen.getByRole('textbox', { name: '客户名称' }), { target: { value: '新建验证项目' } });
    await fireEvent.click(screen.getByRole('button', { name: /^保存$/ }));
    expect(screen.getByRole('table').textContent).toContain('新建验证项目');
    expect((screen.getByRole('textbox', { name: '搜索客户项目' }) as HTMLInputElement).value).toBe('新建验证项目');
  });
});
