import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ClusterTopologyGraph from './ClusterTopologyGraph.svelte';

describe('ClusterTopologyGraph suite', () => {
  it('renders 3-tier cluster nodes and health status', () => {
    const view = render(ClusterTopologyGraph);
    expect(view.container.textContent).toContain('API Gateway');
    expect(view.container.textContent).toContain('Auth Service');
    expect(view.container.textContent).toContain('PostgreSQL Primary');
    expect(view.container.textContent).toContain('14,200 QPS');
  });

  it('selects node on click and opens inspector', async () => {
    const onNodeSelect = vi.fn();
    const view = render(ClusterTopologyGraph, {
      onNodeSelect,
    });

    const gwNode = Array.from(view.container.querySelectorAll('[role="button"]')).find((el) =>
      el.textContent?.includes('API Gateway'),
    );
    expect(gwNode).toBeTruthy();
    if (gwNode) {
      await fireEvent.click(gwNode);
      expect(onNodeSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'gw' }),
      );
      expect(view.container.textContent).toContain('API Gateway');
    }
  });
});
