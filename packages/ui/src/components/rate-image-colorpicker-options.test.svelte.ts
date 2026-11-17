import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import Rate from './Rate.svelte';
import Image from './Image.svelte';
import ColorPicker from './ColorPicker.svelte';

describe('Rate, Image, and ColorPicker option parity', () => {
  it('renders Rate with defaultValue and custom character snippet', () => {
    const charSnippet = createRawSnippet(() => ({
      render: () => '<span class="custom-heart">♥</span>',
    }));

    const view = render(Rate, {
      defaultValue: 3,
      character: charSnippet,
    });

    const hearts = view.container.querySelectorAll('.custom-heart');
    expect(hearts.length).toBe(5);
    const checkedRadios = view.container.querySelectorAll('button[aria-checked="true"]');
    expect(checkedRadios.length).toBe(3);
  });

  it('renders Rate with tooltips and grading mode', () => {
    const view = render(Rate, {
      value: 2,
      tooltips: ['差评', '不满意', '一般', '满意', '非常满意'],
      grading: true,
    });

    const root = view.container.querySelector('[data-grading="true"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('data-grade')).toBe('low');

    const firstStar = view.container.querySelector('button[title="差评"]');
    expect(firstStar).not.toBeNull();
    expect(firstStar?.getAttribute('aria-label')).toBe('差评');
  });

  it('renders Image with custom error snippet', () => {
    const errorSnippet = createRawSnippet(() => ({
      render: () => '<div class="custom-image-error">加载失败</div>',
    }));

    const view = render(Image, {
      src: '',
      error: errorSnippet,
    });

    expect(view.container.querySelector('.custom-image-error')).not.toBeNull();
    expect(view.container.textContent).toContain('加载失败');
  });

  it('renders ColorPicker with defaultValue and presetColors swatches', async () => {
    const view = render(ColorPicker, {
      defaultValue: '#165dff',
      presetColors: ['#165dff', '#00b42a'],
    });

    const input = view.container.querySelector('input[type="color"]') as HTMLInputElement;
    expect(input.value).toBe('#165dff');

    const presets = view.container.querySelectorAll('[data-slot="color-picker-presets"] button');
    expect(presets.length).toBe(2);

    const secondPreset = presets[1];
    if (secondPreset === undefined) throw new Error('expected a second preset');
    await fireEvent.click(secondPreset);
    expect(input.value).toBe('#00b42a');
  });
});
