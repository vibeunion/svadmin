import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { Badge } from './ui/badge/index.js';

describe('Arco Badge Enhancements', () => {
  it('renders count badge with overflow truncation', () => {
    const { container, rerender } = render(Badge, {
      props: {
        count: 5,
      },
    });

    expect(container.textContent).toContain('5');

    rerender({
      count: 100,
      overflowCount: 99,
    });
    expect(container.textContent).toContain('99+');
  });

  it('renders dot badge and status pulse', () => {
    const { container } = render(Badge, {
      props: {
        dot: true,
      },
    });

    const dotEl = container.querySelector('[data-slot="badge-standalone"]');
    expect(dotEl).not.toBeNull();
  });

  it('renders standalone status indicator with text', () => {
    const { container } = render(Badge, {
      props: {
        status: 'processing',
        text: '实时同步中',
      },
    });

    const statusEl = container.querySelector('[data-slot="badge-status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl?.getAttribute('data-status')).toBe('processing');
    expect(container.textContent).toContain('实时同步中');
  });
});
