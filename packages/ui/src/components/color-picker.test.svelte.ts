import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ColorPicker from './ColorPicker.svelte';

afterEach(() => cleanup());

describe('ColorPicker', () => {
  it('uses the native color input contract and emits the selected color', async () => {
    const onchange = vi.fn();
    const view = render(ColorPicker, {
      value: '#336699',
      name: 'accent',
      ariaLabel: 'Accent color',
      onchange,
    });
    const input = view.container.querySelector<HTMLInputElement>('input[type="color"][aria-label="Accent color"]');
    if (!input) throw new Error('color input is missing');
    expect(input.type).toBe('color');
    expect(input.value).toBe('#336699');
    await fireEvent.input(input, { target: { value: '#ff0000' } });
    expect(onchange).toHaveBeenCalledWith('#ff0000');
  });

  it('preserves disabled and invalid form state', () => {
    const view = render(ColorPicker, {
      disabled: true,
      invalid: true,
      ariaLabel: 'Accent color',
    });
    const input = view.container.querySelector<HTMLInputElement>('input[type="color"][aria-label="Accent color"]');
    if (!input) throw new Error('color input is missing');
    expect(input.disabled).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});
