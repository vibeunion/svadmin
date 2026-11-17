import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Breadcrumbs from './Breadcrumbs.svelte';
import Divider from './Divider.svelte';

describe('Breadcrumbs routes and custom separator', () => {
  it('renders breadcrumbs using routes prop alias', () => {
    const { container } = render(Breadcrumbs, {
      props: {
        routes: [
          { label: '首页', href: '/' },
          { label: '列表', href: '/list' },
          { label: '详情' },
        ],
      },
    });
    expect(container.textContent).toContain('首页');
    expect(container.textContent).toContain('列表');
    expect(container.textContent).toContain('详情');
  });

  it('supports custom string separator', () => {
    const { container } = render(Breadcrumbs, {
      props: {
        separator: '>',
        items: [
          { label: 'A', href: '/a' },
          { label: 'B' },
        ],
      },
    });
    const sep = container.querySelector('.svadmin-breadcrumb-custom');
    expect(sep?.textContent).toBe('>');
  });
});

describe('Divider direction alias', () => {
  it('supports direction="vertical" alias for type="vertical"', () => {
    const { container } = render(Divider, {
      props: { direction: 'vertical' },
    });
    const sep = container.querySelector('[role="separator"]');
    expect(sep?.getAttribute('aria-orientation')).toBe('vertical');
    expect(sep?.getAttribute('data-svadmin-type')).toBe('vertical');
  });
});
