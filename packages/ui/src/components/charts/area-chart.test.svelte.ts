import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import AreaChart from './AreaChart.svelte';

afterEach(() => cleanup());

describe('AreaChart', () => {
  it('renders a filled area line with one point per datum', () => {
    const view = render(AreaChart, {
      data: [
        { label: 'Jan', value: 10 },
        { label: 'Feb', value: 30 },
        { label: 'Mar', value: 20 },
      ],
    });
    const svg = view.container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(view.container.querySelectorAll('.svadmin-area-chart circle')).toHaveLength(3);
    const polyline = view.container.querySelector('polyline');
    expect(polyline?.getAttribute('points')?.split(' ')).toHaveLength(3);
    expect(view.container.querySelector('path')).not.toBeNull();
    expect(view.getByText('Mar')).not.toBeNull();
  });

  it('omits the filled area when disabled', () => {
    const view = render(AreaChart, {
      data: [{ label: 'A', value: 1 }],
      fill: false,
    });
    expect(view.container.querySelector('path')).toBeNull();
    expect(view.container.querySelector('polyline')).not.toBeNull();
  });

  it('handles an empty dataset without throwing', () => {
    const view = render(AreaChart, { data: [] });
    expect(view.container.querySelector('svg')).not.toBeNull();
    expect(view.container.querySelectorAll('circle')).toHaveLength(0);
  });
});