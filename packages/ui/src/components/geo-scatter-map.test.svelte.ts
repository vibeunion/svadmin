import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import GeoScatterMap from './GeoScatterMap.svelte';

describe('GeoScatterMap component suite', () => {
  const sampleRegions = [
    { id: 'east', name: '华东大区', value: 5000, x: 80, y: 60, status: 'highlight' as const },
    { id: 'north', name: '华北大区', value: 3000, x: 70, y: 35, status: 'normal' as const }
  ];

  it('renders region pins and map titles', () => {
    const { getByText, getAllByText } = render(GeoScatterMap, {
      title: '算力空间分布',
      regions: sampleRegions
    });

    expect(getByText('算力空间分布')).toBeTruthy();
    expect(getAllByText('华东大区').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('华北大区').length).toBeGreaterThanOrEqual(1);
    expect(getByText('各区域综合负载排行')).toBeTruthy();
  });

  it('handles region click and triggers callback', async () => {
    let selected: unknown = null;
    const { getAllByText } = render(GeoScatterMap, {
      regions: sampleRegions,
      onSelectRegion: (reg) => {
        selected = reg;
      }
    });

    const northItems = getAllByText('华北大区');
    const northItem = northItems[0];
    expect(northItem).toBeTruthy();
    if (northItem) await fireEvent.click(northItem);
    expect(selected).toEqual(sampleRegions[1]);
  });
});
