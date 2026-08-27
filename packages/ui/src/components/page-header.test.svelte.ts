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

  it('supports compact density mode', () => {
    const { container } = render(PageHeader, {
      title: 'Compact View',
      density: 'compact',
      showBreadcrumbs: false,
    });

    const h1 = container.querySelector('h1');
    expect(h1?.classList.contains('text-lg')).toBe(true);
  });
});
