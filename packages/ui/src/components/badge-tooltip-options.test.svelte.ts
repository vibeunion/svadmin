import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { Badge } from './ui/badge/index.js';
import * as Tooltip from './ui/tooltip/index.js';

const textSnippet = (text: string) =>
  createRawSnippet(() => ({
    render: () => `<span>${text}</span>`,
  }));

describe('Badge and Tooltip options', () => {
  it('renders Badge with countStyle and dotStyle', () => {
    const countView = render(Badge, {
      count: 5,
      countStyle: 'box-shadow: 0 0 0 2px red',
      children: textSnippet('Target'),
    });

    const countEl = countView.container.querySelector('[data-slot="badge-count"]');
    expect(countEl).not.toBeNull();
    expect((countEl as HTMLElement).style.cssText).toContain('box-shadow');

    const dotView = render(Badge, {
      dot: true,
      dotStyle: 'border: 1px solid blue',
      children: textSnippet('Target'),
    });

    const dotEl = dotView.container.querySelector('[data-slot="badge-dot"]');
    expect(dotEl).not.toBeNull();
    expect((dotEl as HTMLElement).style.cssText).toContain('border');
  });

  it('renders Badge in standalone mode with countStyle', () => {
    const view = render(Badge, {
      count: 99,
      countStyle: 'font-weight: 700',
    });

    const span = view.container.querySelector('span[data-slot="badge-standalone"] span');
    expect(span).not.toBeNull();
    expect((span as HTMLElement).style.cssText).toContain('font-weight');
  });
});
