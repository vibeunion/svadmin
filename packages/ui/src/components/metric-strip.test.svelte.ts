import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import MetricStrip, { type MetricStripItem } from './MetricStrip.svelte';
import { Badge } from './ui/badge/index.js';
import { TableCell, TableHead } from './ui/table/index.js';

describe('MetricStrip Component', () => {
  it('renders grouped metric items with labels, values, and badges', () => {
    const items: MetricStripItem[] = [
      { label: '待受理委托', value: 12, tone: 'primary', href: '#/orders' },
      { label: '超期项目', value: 3, tone: 'danger', badge: { text: '超期', tone: 'danger' } },
      { label: '完成率', value: '98.5%', tone: 'success', trend: { value: 4.2, label: '较上周' } },
    ];

    const view = render(MetricStrip, { items, columns: 3, ariaLabel: '委托指标' });

    expect(view.container.textContent).toContain('待受理委托');
    expect(view.container.textContent).toContain('12');
    expect(view.container.textContent).toContain('超期项目');
    expect(view.container.textContent).toContain('3');
    expect(view.container.textContent).toContain('超期');
    expect(view.container.textContent).toContain('完成率');
    expect(view.container.textContent).toContain('98.5%');
    expect(view.container.textContent).toContain('4.2%');
    expect(view.container.textContent).toContain('较上周');
    expect(view.getByRole('region', { name: '委托指标' })).not.toBeNull();

    const link = view.container.querySelector('a[href="#/orders"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('待受理委托');
  });

  it('renders skeleton placeholders when item is loading', () => {
    const items: MetricStripItem[] = [
      { label: '正在加载指标', value: 0, loading: true },
    ];

    const view = render(MetricStrip, { items });
    expect(view.container.textContent).toContain('正在加载指标');
    expect(view.container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });
});

describe('Badge subtle variants', () => {
  it('renders subtle and subtle-pill variants with appropriate styling classes', () => {
    const subtleView = render(Badge, {
      variant: 'subtle',
      children: createRawSnippet(() => ({ render: () => '<span>Subtle</span>' })),
    });
    expect(subtleView.container.textContent).toContain('Subtle');
    expect(subtleView.container.firstElementChild?.className).toContain('bg-primary/10');

    const pillView = render(Badge, {
      variant: 'subtle-pill',
      children: createRawSnippet(() => ({ render: () => '<span>Pill</span>' })),
    });
    expect(pillView.container.textContent).toContain('Pill');
    expect(pillView.container.firstElementChild?.className).toContain('rounded-full');
  });
});

describe('Table sticky action column support', () => {
  it('renders sticky right/left action cells and headers', () => {
    const cellView = render(TableCell, {
      sticky: 'right',
      children: createRawSnippet(() => ({ render: () => '<span>Actions</span>' })),
    });
    const cell = cellView.container.querySelector('[data-slot="table-cell"]');
    expect(cell?.getAttribute('data-sticky')).toBe('right');
    expect(cell?.className).toContain('sticky');
    expect(cell?.className).toContain('right-0');
    expect(cell?.className).toContain('group-data-[state=selected]/row:bg-muted');

    const headView = render(TableHead, {
      sticky: 'right',
      children: createRawSnippet(() => ({ render: () => '<span>Header</span>' })),
    });
    const head = headView.container.querySelector('[data-slot="table-head"]');
    expect(head?.getAttribute('data-sticky')).toBe('right');
    expect(head?.className).toContain('sticky');
    expect(head?.className).toContain('right-0');
  });
});
