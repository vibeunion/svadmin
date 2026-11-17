import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Button, { type ButtonProps } from './button.svelte';

describe('Button Arco Parity Enhancements', () => {
  it('supports loading state with spinner and disabled accessibility', () => {
    const { container } = render(Button, {
      props: {
        loading: true,
      },
    });

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.hasAttribute('disabled')).toBe(true);
    expect(button?.getAttribute('aria-busy')).toBe('true');
    expect(button?.getAttribute('data-loading')).toBe('true');
    expect(container.querySelector('.animate-spin')).not.toBeNull();
  });

  it('maps Arco size options mini, small, and large correctly', () => {
    const { container: miniContainer } = render(Button, { props: { size: 'mini' } });
    expect(miniContainer.querySelector('button')?.getAttribute('data-size')).toBe('xs');

    const { container: smallContainer } = render(Button, { props: { size: 'small' } });
    expect(smallContainer.querySelector('button')?.getAttribute('data-size')).toBe('sm');

    const { container: largeContainer } = render(Button, { props: { size: 'large' } });
    expect(largeContainer.querySelector('button')?.getAttribute('data-size')).toBe('lg');
  });

  it('supports shape round and circle', () => {
    const { container: roundContainer } = render(Button, { props: { shape: 'round' } });
    const roundBtn = roundContainer.querySelector('button');
    expect(roundBtn?.getAttribute('data-shape')).toBe('round');
    expect(roundBtn?.className).toContain('rounded-full');

    const { container: circleContainer } = render(Button, { props: { shape: 'circle' } });
    const circleBtn = circleContainer.querySelector('button');
    expect(circleBtn?.getAttribute('data-shape')).toBe('circle');
    expect(circleBtn?.className).toContain('aspect-square');
  });

  it('supports long/block full width and Arco type alias', () => {
    const { container: longContainer } = render(Button, { props: { long: true, type: 'primary' } as ButtonProps });
    const longBtn = longContainer.querySelector('button');
    expect(longBtn?.className).toContain('w-full');
    expect(longBtn?.getAttribute('type')).toBe('button');
    expect(longBtn?.getAttribute('data-variant')).toBe('default');

    const { container: outlineContainer } = render(Button, { props: { type: 'outline' } as ButtonProps });
    const outlineBtn = outlineContainer.querySelector('button');
    expect(outlineBtn?.getAttribute('data-variant')).toBe('outline');
  });

  it('maps status danger to destructive variant', () => {
    const { container } = render(Button, { props: { status: 'danger' } });
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('data-variant')).toBe('destructive');
    expect(btn?.getAttribute('data-status')).toBe('danger');
  });
});
