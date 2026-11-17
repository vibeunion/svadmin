import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Timeline from './Timeline.svelte';
import BackTop from './BackTop.svelte';

describe('Timeline direction alias and pending state', () => {
  it('maps direction="horizontal" to data-mode="horizontal"', () => {
    const { container } = render(Timeline, {
      props: {
        direction: 'horizontal',
        items: [
          { id: '1', title: 'Start' },
          { id: '2', title: 'End' },
        ],
      },
    });
    const ol = container.querySelector('.svadmin-timeline');
    expect(ol?.getAttribute('data-mode')).toBe('horizontal');
  });

  it('renders pending item when pending is passed', () => {
    const { container } = render(Timeline, {
      props: {
        pending: 'Syncing remote nodes...',
        items: [
          { id: '1', title: 'Step 1' },
        ],
      },
    });
    const pendingItem = container.querySelector('[data-pending="true"]');
    expect(pendingItem).not.toBeNull();
    expect(pendingItem?.textContent).toContain('Syncing remote nodes...');
    expect(pendingItem?.querySelector('.animate-spin')).not.toBeNull();
  });
});

describe('BackTop visibleHeight option', () => {
  it('renders without error with visibleHeight set', () => {
    const { container } = render(BackTop, {
      props: {
        visibleHeight: 300,
      },
    });
    expect(container).not.toBeNull();
  });
});
