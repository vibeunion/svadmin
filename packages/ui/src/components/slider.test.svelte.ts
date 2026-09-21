import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Slider from './Slider.svelte';

afterEach(() => cleanup());

describe('Slider', () => {
  it('keeps numeric bounds and emits number values through the range input', async () => {
    const onchange = vi.fn();
    const view = render(Slider, {
      value: 25,
      min: 10,
      max: 50,
      step: 5,
      name: 'priority',
      ariaLabel: 'Priority',
      showValue: true,
      onchange,
    });
    const input = view.getByRole('slider', { name: 'Priority' }) as HTMLInputElement;
    expect(input.value).toBe('25');
    expect(input.min).toBe('10');
    expect(input.max).toBe('50');
    expect(input.step).toBe('5');
    await fireEvent.input(input, { target: { value: '40' } });
    expect(onchange).toHaveBeenCalledWith(40);
  });

  it('clamps an out-of-range bound value and preserves invalid semantics', () => {
    const view = render(Slider, {
      value: 999,
      min: 0,
      max: 10,
      invalid: true,
      ariaLabel: 'Score',
    });
    const input = view.getByRole('slider', { name: 'Score' }) as HTMLInputElement;
    expect(input.value).toBe('10');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});
