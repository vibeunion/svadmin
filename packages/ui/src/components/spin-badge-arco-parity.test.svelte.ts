import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Spin from './Spin.svelte';
import Badge from './ui/badge/badge.svelte';

describe('Spin Arco Parity (dot, size options)', () => {
  it('renders dot indicator when dot=true', () => {
    const { container } = render(Spin, {
      props: { dot: true, loading: true },
    });
    const dots = container.querySelector('.svadmin-spin__dots');
    expect(dots).not.toBeNull();
    const dotItems = container.querySelectorAll('.svadmin-spin__dot-item');
    expect(dotItems.length).toBe(4);
  });

  it('supports size="mini", "small", "default", "large", and numeric sizes', () => {
    const { container, rerender } = render(Spin, {
      props: { size: 'mini' },
    });
    expect(container.querySelector('.svadmin-spin__icon')?.classList.contains('size-3')).toBe(true);

    rerender({ size: 'small' });
    expect(container.querySelector('.svadmin-spin__icon')?.classList.contains('size-3.5')).toBe(true);

    rerender({ size: 'large' });
    expect(container.querySelector('.svadmin-spin__icon')?.classList.contains('size-6')).toBe(true);

    rerender({ size: 28 });
    const icon = container.querySelector('.svadmin-spin__icon');
    expect(icon?.getAttribute('style')).toContain('width: 28px');
    expect(icon?.getAttribute('style')).toContain('height: 28px');
  });
});

describe('Badge Arco Parity (danger, primary, info status and small/mini size)', () => {
  it('maps status="danger" to destructive color class', () => {
    const { container } = render(Badge, {
      props: { status: 'danger', text: '错误警告' },
    });
    const dot = container.querySelector('span.bg-destructive');
    expect(dot).not.toBeNull();
    expect(container.textContent).toContain('错误警告');
  });

  it('maps status="primary" and "info" to primary color class', () => {
    const { container, rerender } = render(Badge, {
      props: { status: 'primary', text: '主要状态' },
    });
    expect(container.querySelector('span.bg-primary')).not.toBeNull();

    rerender({ status: 'info', text: '信息状态' });
    expect(container.querySelector('span.bg-primary')).not.toBeNull();
  });

  it('supports size="small" with compact dimensions', () => {
    const { container } = render(Badge, {
      props: { count: 5, size: 'small' },
    });
    const badgeCount = container.querySelector('[data-slot="badge-standalone"] span');
    expect(badgeCount?.classList.contains('min-w-3.5')).toBe(true);
    expect(badgeCount?.classList.contains('h-3.5')).toBe(true);
  });
});
