import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PivotMatrix from './PivotMatrix.svelte';

describe('PivotMatrix component suite', () => {
  const sampleData = [
    { region: '华东', dept: '企业软件', quarter: 'Q1', revenue: 1200 },
    { region: '华东', dept: '硬件设备', quarter: 'Q1', revenue: 800 },
    { region: '华东', dept: '企业软件', quarter: 'Q2', revenue: 1500 },
    { region: '华南', dept: '企业软件', quarter: 'Q1', revenue: 900 }
  ];

  it('renders cross table headers and dimensions', () => {
    const { getByText } = render(PivotMatrix, {
      data: sampleData,
      title: '多维交叉透视分析'
    });

    expect(getByText('多维交叉透视分析')).toBeTruthy();
    expect(getByText('Q1')).toBeTruthy();
    expect(getByText('Q2')).toBeTruthy();
    expect(getByText('行汇总')).toBeTruthy();
    expect(getByText('列汇总')).toBeTruthy();
  });

  it('aggregates cells and calculates grand total', () => {
    const { getByText } = render(PivotMatrix, {
      data: sampleData,
      measures: [{ id: 'revenue', label: '销售额', field: 'revenue', aggregation: 'sum' }]
    });

    // Grand total: 1200 + 800 + 1500 + 900 = 4400
    expect(getByText('4,400')).toBeTruthy();
  });

  it('triggers onCellClick when a matrix cell is clicked', async () => {
    let clickedParams: unknown = null;
    const { container } = render(PivotMatrix, {
      data: sampleData,
      onCellClick: (params) => {
        clickedParams = params;
      }
    });

    const cells = container.querySelectorAll('tbody td');
    if (cells.length > 1) {
      await fireEvent.click(cells[1]);
      expect(clickedParams).toBeTruthy();
    }
  });
});
