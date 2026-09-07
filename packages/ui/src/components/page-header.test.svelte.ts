import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import PageHeader from './PageHeader.svelte';

describe('PageHeader', () => {
  it('renders title and description cleanly', () => {
    render(PageHeader, {
      title: 'Order Management',
      description: 'Review and approve customer orders',
      showBreadcrumbs: false,
    });

    expect(screen.getByRole('heading', { level: 1 }).textContent?.trim()).toBe('Order Management');
    expect(screen.getByText('Review and approve customer orders')).toBeTruthy();
  });

  it('supports back button and invokes onBack callback', async () => {
    const onBack = vi.fn();
    render(PageHeader, {
      title: 'Order #1024',
      onBack,
      backLabel: 'Back to orders',
      showBreadcrumbs: false,
    });

    const backBtn = screen.getByRole('button', { name: 'Back to orders' });
    expect(backBtn).toBeTruthy();
    await fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });

  it('switches density without depending on utility aliases', async () => {
    const { container, rerender } = render(PageHeader, {
      title: 'Compact View',
      density: 'compact',
      showBreadcrumbs: false,
    });

    const header = container.querySelector('.svadmin-page-header');
    expect(header?.getAttribute('data-density')).toBe('compact');
    expect(container.querySelector('h1')?.className).toBe('svadmin-page-header__title');

    await rerender({ title: 'Comfortable View', density: 'comfortable', showBreadcrumbs: false });
    expect(header?.getAttribute('data-density')).toBe('comfortable');
    expect(screen.getByRole('heading', { level: 1 }).textContent?.trim()).toBe('Comfortable View');
  });

  it('preserves consumer classes and omits unused controls', () => {
    const { container } = render(PageHeader, { title: 'Orders', class: 'host-header', showBreadcrumbs: false });
    expect(container.querySelector('.svadmin-page-header.host-header')).not.toBeNull();
    expect(container.querySelector('.svadmin-page-header__actions')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
