import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import PagePattern from './PagePattern.svelte';
import PagePatternExample from '../../stories/PagePatternExample.svelte';

describe('PagePattern', () => {
  it.each([
    ['list', 'wide'],
    ['form', 'narrow'],
    ['detail', 'default'],
    ['workspace', 'wide'],
    ['dashboard', 'wide'],
  ] as const)('applies the %s page defaults', (kind, width) => {
    const children = createRawSnippet(() => ({ render: () => '<p>Content</p>' }));
    const { container } = render(PagePattern, { kind, title: 'Page', children });
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
    expect(shell?.getAttribute('data-svadmin-content-page-width')).toBe('narrow');
    await rerender({ kind: 'workspace', width: 'default' });
    expect(shell?.getAttribute('data-svadmin-content-page-width')).toBe('default');
  });

  it('does not discard secondary content on a detail page', () => {
    const children = createRawSnippet(() => ({ render: () => '<p>Record</p>' }));
    const secondary = createRawSnippet(() => ({ render: () => '<p>Audit history</p>' }));
    render(PagePattern, { kind: 'detail', title: 'Record detail', children, secondary });
    expect(screen.getByText('Audit history')).toBeTruthy();
  });

  it('renders the standard data state contract instead of stale page content', async () => {
    const children = createRawSnippet(() => ({ render: () => '<p>Stale content</p>' }));
    const { container, rerender } = render(PagePattern, {
      kind: 'list',
      title: 'Projects',
      children,
      state: 'loading',
    });
    expect(container.querySelector('[data-page-pattern-state="loading"]')).toBeTruthy();
    expect(screen.queryByText('Stale content')).toBeNull();

    await rerender({ state: 'empty', stateTitle: 'No projects' });
    expect(container.querySelector('[data-page-pattern-state="empty"]')).toBeTruthy();
    expect(screen.getByText('No projects')).toBeTruthy();

    await rerender({ state: 'filtered-empty', stateTitle: 'No matching results' });
    expect(container.querySelector('[data-page-pattern-state="filtered-empty"]')).toBeTruthy();
    expect(screen.getByText('No matching results')).toBeTruthy();
  });

  it('exposes retry and action only for the corresponding state', async () => {
    let retried = false;
    const action = createRawSnippet(() => ({ render: () => '<button>Reset filters</button>' }));
    render(PagePattern, {
      kind: 'list',
      title: 'Projects',
      children: createRawSnippet(() => ({ render: () => '<p>Content</p>' })),
      state: 'error',
      retry: () => { retried = true; },
      stateAction: action,
    });
    await fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(retried).toBe(true);
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeTruthy();
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

  it('supports status filtering and a contextual batch action in the list example', async () => {
    render(PagePatternExample);
    await fireEvent.click(screen.getByRole('tab', { name: /待审核/ }));
    expect(screen.getByRole('table').textContent).toContain('新能源汽车高压电气安全与环境可靠性联合实验室');
    expect(screen.getByRole('table').textContent).not.toContain('材料分析实验室');

    const checkbox = screen.getByRole('checkbox', { name: '选择记录 新能源汽车高压电气安全与环境可靠性联合实验室' });
    await fireEvent.click(checkbox);
    expect(screen.getByText('已选择 1 条记录')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: '标记完成' }));
    expect(screen.queryByText('已选择 1 条记录')).toBeNull();
    expect(screen.getByRole('tab', { name: /已完成/ }).textContent).toContain('2');
  });
});
