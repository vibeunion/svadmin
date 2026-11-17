import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ResizeBox from './ResizeBox.svelte';
import Watermark from './Watermark.svelte';

describe('ResizeBox and Watermark option parity', () => {
  it('ResizeBox supports directions array and min/max tuples', () => {
    const { container } = render(ResizeBox, {
      props: {
        directions: ['right', 'bottom'],
        min: [150, 100],
        max: [600, 400],
      },
    });

    const box = container.querySelector('.svadmin-resize-box');
    expect(box?.getAttribute('data-direction')).toBe('both');
    const handle = container.querySelector('.svadmin-resize-box__handle');
    expect(handle?.getAttribute('aria-valuemin')).toBe('150');
    expect(handle?.getAttribute('aria-valuemax')).toBe('600');
  });

  it('Watermark supports direct fontSize and fontColor props', () => {
    const { container } = render(Watermark, {
      props: {
        content: 'INTERNAL WATERMARK',
        fontSize: 18,
        fontColor: 'rgba(255, 0, 0, 0.3)',
      },
    });

    const wrapper = container.querySelector('[data-svadmin-watermark-wrapper]');
    expect(wrapper).not.toBeNull();
  });
});
