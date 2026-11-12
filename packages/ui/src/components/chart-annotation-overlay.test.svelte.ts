import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ChartAnnotationOverlay from './ChartAnnotationOverlay.svelte';

describe('ChartAnnotationOverlay component suite', () => {
  it('renders annotations and default active detail card', () => {
    const { getByText, getAllByText, container } = render(ChartAnnotationOverlay, {
      activeId: 'ann-1',
    });

    expect(getByText('业务大事件与异常指标标记层 (Annotation Overlay)')).toBeTruthy();
    expect(getAllByText('v2.4.0 核心版本全量发布').length).toBeGreaterThan(0);
    expect(container.querySelector('[data-svadmin-component="chart-annotation-overlay"]')).toBeTruthy();
  });

  it('triggers onAnnotationClick when clicking an annotation pin', async () => {
    const onClick = vi.fn();
    const { getByText } = render(ChartAnnotationOverlay, {
      onAnnotationClick: onClick,
    });

    const pin = getByText('华东大区机房瞬态抖动');
    await fireEvent.click(pin);

    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ann-2',
        label: '华东大区机房瞬态抖动',
      })
    );
  });
});
