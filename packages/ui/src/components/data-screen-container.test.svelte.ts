import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import DataScreenContainer from './DataScreenContainer.svelte';

describe('DataScreenContainer suite', () => {
  it('renders DataScreenContainer with title and tech borders', () => {
    const view = render(DataScreenContainer, {
      title: '监控展厅指挥中心大屏',
      subtitle: 'Real-time telemetry display',
      width: 1920,
      height: 1080,
    });

    expect(view.container.textContent).toContain('监控展厅指挥中心大屏');
    expect(view.container.textContent).toContain('Real-time telemetry display');
    expect(view.container.querySelector('[data-svadmin-component="DataScreenContainer"]')).toBeTruthy();
  });
});
