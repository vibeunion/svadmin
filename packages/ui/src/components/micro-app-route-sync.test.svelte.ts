import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MicroAppRouteSync from './MicroAppRouteSync.svelte';

describe('MicroAppRouteSync component suite', () => {
  it('renders synchronized host url and initial route', () => {
    const { getByText, container } = render(MicroAppRouteSync, {
      initialRoute: '/reports/quarterly-gmv/details',
    });

    expect(getByText('微前端父子应用路由双向无感同步器 (Route Sync)')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="micro-app-route-sync"]')).toBeTruthy();
    expect(container.textContent).toContain('subAppRoute=%2Freports%2Fquarterly-gmv%2Fdetails');
  });

  it('triggers onRouteChange when pushing a new route', async () => {
    const onRoute = vi.fn();
    const { getByText } = render(MicroAppRouteSync, {
      onRouteChange: onRoute,
    });

    const pushBtn = getByText('推送跳转');
    await fireEvent.click(pushBtn);

    expect(onRoute).toHaveBeenCalled();
  });
});
