import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Watermark from './Watermark.svelte';

describe('Watermark Component', () => {
  it('renders watermark wrapper with data attribute', () => {
    const view = render(Watermark, {
      content: 'CONFIDENTIAL TEST',
      opacity: 0.2,
    });
    const wrapper = view.container.querySelector('[data-svadmin-watermark-wrapper]');
    expect(wrapper).not.toBeNull();
  });

  it('accepts array of strings as watermark content', () => {
    const view = render(Watermark, {
      content: ['Admin Corp', 'User #42', '2026-08-29'],
    });
    const wrapper = view.container.querySelector('[data-svadmin-watermark-wrapper]');
    expect(wrapper).not.toBeNull();
  });
});
