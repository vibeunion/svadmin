import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Switch from './switch.svelte';

describe('switch sizes', () => {
  it('defaults to the official size and exposes small plus loading', async () => {
    const onCheckedChange = vi.fn();
    const view = render(Switch, { 'aria-label': 'Enable', onCheckedChange });
    const control = view.getByRole('switch', { name: 'Enable' });
    expect(control.getAttribute('data-size')).toBe('default');
    expect(control.hasAttribute('data-loading')).toBe(false);

    await view.rerender({ 'aria-label': 'Enable', size: 'small', loading: true, onCheckedChange });
    expect(control.getAttribute('data-size')).toBe('small');
    expect(control.getAttribute('data-loading')).toBe('true');
    expect(control.getAttribute('aria-busy')).toBe('true');
    expect(control.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(control);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
