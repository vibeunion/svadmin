import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import ScatterChart from './ScatterChart.svelte';

afterEach(() => cleanup());

describe('ScatterChart', () => {
  it('plots one labelled point per datum', () => {
    const view = render(ScatterChart, {
      data: [
        { x: 1, y: 2, label: 'alpha' },
        { x: 4, y: 8, label: 'beta' },
      ],
      xLabel: 'Effort',
      yLabel: 'Impact',
    });

    expect(view.container.querySelectorAll('circle')).toHaveLength(2);
    expect(view.container.querySelectorAll('title')).toHaveLength(2);
    expect(view.getByText('Effort')).not.toBeNull();
    expect(view.getByText('Impact')).not.toBeNull();
    expect(view.getByRole('img').getAttribute('aria-label')).toBe('Impact by Effort');
  });

  it('does not divide by zero for a single point', () => {
    const view = render(ScatterChart, { data: [{ x: 5, y: 5 }] });
    const circle = view.container.querySelector('circle');
    expect(circle).not.toBeNull();
    expect(Number.isFinite(Number(circle?.getAttribute('cx')))).toBe(true);
    expect(Number.isFinite(Number(circle?.getAttribute('cy')))).toBe(true);
  });
});