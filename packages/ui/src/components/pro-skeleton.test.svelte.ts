import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import ProSkeleton from './ProSkeleton.svelte';
import PageSkeleton from './PageSkeleton.svelte';

describe('ProSkeleton', () => {
  it('renders table skeleton by default with pulse animation', () => {
    const { container } = render(ProSkeleton, {
      type: 'table',
      rows: 4,
      columns: 3,
      statistic: 2,
    });

    const root = container.querySelector('[data-svadmin-component="ProSkeleton"]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('data-type')).toBe('table');
    expect(root?.className).toContain('animate-pulse');

    // Statistic cards
    const statCards = container.querySelectorAll('.grid > div');
    expect(statCards.length).toBeGreaterThanOrEqual(2);
  });

  it('renders form and descriptions skeletons without animation when active is false', () => {
    const { container: formContainer } = render(ProSkeleton, {
      type: 'form',
      active: false,
      rows: 3,
    });

    const formRoot = formContainer.querySelector('[data-svadmin-component="ProSkeleton"]');
    expect(formRoot?.getAttribute('data-type')).toBe('form');
    expect(formRoot?.className).not.toContain('animate-pulse');

    const { container: descContainer } = render(ProSkeleton, {
      type: 'descriptions',
      rows: 2,
      columns: 2,
    });

    const descRoot = descContainer.querySelector('[data-svadmin-component="ProSkeleton"]');
    expect(descRoot?.getAttribute('data-type')).toBe('descriptions');
  });

  it('renders list skeleton with avatar', () => {
    const { container } = render(ProSkeleton, {
      type: 'list',
      avatar: true,
      rows: 3,
    });

    const listRoot = container.querySelector('[data-svadmin-component="ProSkeleton"]');
    expect(listRoot?.getAttribute('data-type')).toBe('list');
    const avatars = container.querySelectorAll('.rounded-full');
    expect(avatars.length).toBe(3);
  });

  it('exposes the same loading-region semantics as PageSkeleton', () => {
    const pro = render(ProSkeleton, {
      ariaLabel: '正在加载列表',
      active: false,
    });
    const page = render(PageSkeleton, {
      ariaLabel: '正在加载页面',
      type: 'list',
    });

    expect(pro.container.querySelector('[aria-busy="true"]')?.getAttribute('aria-live')).toBe('polite');
    expect(pro.container.querySelector('[aria-label="正在加载列表"]')).toBeTruthy();
    expect(page.container.querySelector('[data-svadmin-component="PageSkeleton"]')?.getAttribute('aria-busy')).toBe('true');
    expect(page.container.querySelector('[aria-label="正在加载页面"]')).toBeTruthy();
  });
});
