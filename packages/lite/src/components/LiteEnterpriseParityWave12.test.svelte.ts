import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import LiteDashboardGridLayout from './LiteDashboardGridLayout.svelte';
import LiteDashboardLayoutStorage from './LiteDashboardLayoutStorage.svelte';
import LiteChartAnnotationOverlay from './LiteChartAnnotationOverlay.svelte';

describe('Lite Enterprise Parity Wave 12 suite', () => {
  it('renders LiteDashboardGridLayout with widget items', () => {
    const { getByText, container } = render(LiteDashboardGridLayout);

    expect(getByText('智能动态业务大屏 (SSR 静态栅格)')).toBeTruthy();
    expect(getByText('核心营收 (GMV)')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="LiteDashboardGridLayout"]')).toBeTruthy();
  });

  it('renders LiteDashboardLayoutStorage with preset cards', () => {
    const { getByText, container } = render(LiteDashboardLayoutStorage);

    expect(getByText('大屏排版预设方案库 (SSR 静态列表)')).toBeTruthy();
    expect(getByText('高管经营全景大屏')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="LiteDashboardLayoutStorage"]')).toBeTruthy();
  });

  it('renders LiteChartAnnotationOverlay with timeline events', () => {
    const { getByText, container } = render(LiteChartAnnotationOverlay);

    expect(getByText('业务大事件与异常指标标记层 (SSR 静态列表)')).toBeTruthy();
    expect(getByText('v2.4.0 核心版本全量发布')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="LiteChartAnnotationOverlay"]')).toBeTruthy();
  });
});
