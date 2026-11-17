import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Slider from './Slider.svelte';
import RangeSlider from './RangeSlider.svelte';

describe('Slider and RangeSlider option parity', () => {
  it('Slider supports defaultValue, tooltipVisible, and reverse direction', async () => {
    const onchange = vi.fn();
    const { container, getByRole } = render(Slider, {
      props: {
        defaultValue: 35,
        tooltipVisible: true,
        reverse: true,
        onchange,
      },
    });

    const root = container.querySelector('.svadmin-slider');
    expect(root?.getAttribute('data-reverse')).toBe('true');

    const input = getByRole('slider') as HTMLInputElement;
    expect(input.value).toBe('35');

    const output = container.querySelector('output');
    expect(output?.textContent).toBe('35');

    await fireEvent.input(input, { target: { value: '60' } });
    expect(onchange).toHaveBeenCalledWith(60);
    expect(output?.textContent).toBe('60');
  });

  it('RangeSlider supports defaultValue, tooltipVisible, and reverse direction', async () => {
    const onchange = vi.fn();
    const { container, getAllByRole } = render(RangeSlider, {
      props: {
        defaultValue: { min: 15, max: 85 },
        tooltipVisible: true,
        reverse: true,
        onchange,
      },
    });

    const root = container.querySelector('.svadmin-range-slider');
    expect(root?.getAttribute('data-reverse')).toBe('true');

    const sliders = getAllByRole('slider') as HTMLInputElement[];
    expect(sliders[0]?.value).toBe('15');
    expect(sliders[1]?.value).toBe('85');

    const output = container.querySelector('output');
    expect(output?.textContent).toBe('15 - 85');

    await fireEvent.input(sliders[0]!, { target: { value: '25' } });
    expect(onchange).toHaveBeenCalledWith({ min: 25, max: 85 });
    expect(output?.textContent).toBe('25 - 85');
  });
});
