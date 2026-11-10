import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FloatButtonGroup from './FloatButtonGroup.svelte';

describe('FloatButtonGroup', () => {
  it('renders root element with position and trigger button', () => {
    const { container } = render(FloatButtonGroup, {
      position: 'bottom-right',
      ariaLabel: 'Quick Actions',
    });

    const root = container.querySelector('[data-svadmin-component="FloatButtonGroup"]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('data-position')).toBe('bottom-right');
    expect(screen.getByRole('button', { name: 'Quick Actions' })).toBeTruthy();
  });

  it('toggles open state on click and triggers callback', async () => {
    const onopenchange = vi.fn();
    render(FloatButtonGroup, {
      onopenchange,
    });

    const triggerBtn = screen.getByRole('button', { name: 'Floating Action Menu' });
    expect(triggerBtn.getAttribute('aria-expanded')).toBe('false');

    await fireEvent.click(triggerBtn);
    expect(triggerBtn.getAttribute('aria-expanded')).toBe('true');
    expect(onopenchange).toHaveBeenCalledWith(true);

    await fireEvent.click(triggerBtn);
    expect(triggerBtn.getAttribute('aria-expanded')).toBe('false');
    expect(onopenchange).toHaveBeenCalledWith(false);
  });
});
