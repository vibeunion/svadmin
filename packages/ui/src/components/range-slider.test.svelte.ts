import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RangeSlider from './RangeSlider.svelte';

afterEach(() => cleanup());

describe('RangeSlider', () => {
  it('keeps endpoints ordered and serializes both values', async () => {
    const onchange = vi.fn();
    const view = render(RangeSlider, {
      value: { min: 20, max: 80 },
      min: 0,
      max: 100,
      minName: 'price_min',
      maxName: 'price_max',
      ariaLabel: 'Price',
      onchange,
    });
    const sliders = view.getAllByRole('slider') as HTMLInputElement[];
    await fireEvent.input(sliders[0], { target: { value: '90' } });
    expect(onchange).toHaveBeenLastCalledWith({ min: 80, max: 80 });
    expect([...view.container.querySelectorAll('input[type="hidden"]')].map(input => (input as HTMLInputElement).value))
      .toEqual(['80', '80']);
  });

  it('clamps invalid initial endpoints to the configured bounds', () => {
    const view = render(RangeSlider, {
      value: { min: -10, max: 500 },
      min: 0,
      max: 100,
      ariaLabel: 'Score',
    });
    const sliders = view.getAllByRole('slider') as HTMLInputElement[];
    expect(sliders.map(slider => slider.value)).toEqual(['0', '100']);
  });
});
