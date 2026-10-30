import { describe, expect, it } from 'vitest';
import {
  areaPath,
  donutSlices,
  funnelRects,
  gaugeArc,
  hasData,
  heatCells,
  labels,
  pieSlices,
  points,
  polyline,
  radarPolygon,
  roseSlices,
  scatterPoints,
  series,
  waterfallBars,
} from './chart-geometry';

const rows: Array<[string, number]> = [
  ['Won', 12],
  ['Lost', 4],
  ['Open', 9],
];

describe('Lite chart geometry', () => {
  it('extracts a numeric series and labels from table rows', () => {
    expect(series(rows)).toEqual([12, 4, 9]);
    expect(labels(rows)).toEqual(['Won', 'Lost', 'Open']);
    expect(series([['A', '7.5'], ['B', 'n/a'], ['C', null as unknown as string]])).toEqual([7.5, 0, 0]);
    expect(hasData([])).toBe(false);
    expect(hasData(rows)).toBe(true);
  });

  it('spreads points across the plot and keeps them inside the basket', () => {
    const basket = { width: 200, height: 100, padding: 10 };
    const plotted = points([1, 2, 3], basket);

    expect(plotted).toHaveLength(3);
    expect(plotted[0]?.x).toBe(10);
    expect(plotted[2]?.x).toBe(190);
    for (const point of plotted) {
      expect(point.y).toBeGreaterThanOrEqual(10);
      expect(point.y).toBeLessThanOrEqual(90);
    }
    expect(polyline([1, 2, 3], basket).split(' ')).toHaveLength(3);

    // A flat series must not divide by zero.
    expect(points([5, 5], basket).every((point) => Number.isFinite(point.y))).toBe(true);
    expect(points([], basket)).toEqual([]);
  });

  it('closes the area path onto the baseline', () => {
    const path = areaPath([1, 4, 2], { width: 120, height: 80, padding: 8 });

    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect(path).toContain('L112 72');
    expect(areaPath([])).toBe('');
  });

  it('splits pies, donuts and roses into one shape per value', () => {
    for (const slices of [pieSlices([1, 1, 2]), donutSlices([1, 1, 2]), roseSlices([1, 1, 2])]) {
      expect(slices).toHaveLength(3);
      expect(slices.every((slice) => slice.path.startsWith('M'))).toBe(true);
    }
    expect(pieSlices([0, 0])).toEqual([]);
  });

  it('builds a radar polygon and one axis per value', () => {
    const radar = radarPolygon([3, 5, 1, 4]);

    expect(radar.axes).toHaveLength(4);
    expect(radar.polygon.split(' ')).toHaveLength(4);
    expect(radarPolygon([]).polygon.split(' ').filter(Boolean)).toHaveLength(3);
  });

  it('clamps gauge ratios and reports the percentage', () => {
    const half = gaugeArc(50, 100);
    expect(half.percent).toBe(50);
    expect(half.track).toContain('A');
    expect(gaugeArc(500, 100).percent).toBe(100);
    expect(gaugeArc(-20, 100).percent).toBe(0);
    expect(gaugeArc(10, 0).percent).toBe(10);
  });

  it('centers funnel bars and shrinks them with the value', () => {
    const rects = funnelRects([10, 6, 2], { width: 100, height: 90, padding: 5 });

    expect(rects).toHaveLength(3);
    expect(rects[0]?.width).toBeGreaterThan(rects[2]?.width ?? 0);
    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(5);
      expect(rect.x + rect.width).toBeLessThanOrEqual(95);
      expect(rect.height).toBeGreaterThan(0);
    }
  });

  it('accumulates waterfall steps and flags their direction', () => {
    const bars = waterfallBars([10, -4, 6]);

    expect(bars).toHaveLength(3);
    expect(bars.map((bar) => bar.positive)).toEqual([true, false, true]);
    expect(bars.every((bar) => bar.height > 0)).toBe(true);
    expect(bars.every((bar) => bar.x >= 0 && bar.width > 0)).toBe(true);
  });

  it('encodes heat intensity in a bounded opacity grid', () => {
    const cells = heatCells([1, 5, 10, 2], { width: 80, height: 80, padding: 4 }, 2);

    expect(cells).toHaveLength(4);
    for (const cell of cells) {
      expect(cell.opacity).toBeGreaterThanOrEqual(0.12);
      expect(cell.opacity).toBeLessThanOrEqual(1);
      expect(cell.x).toBeGreaterThanOrEqual(4);
    }
    expect(new Set(cells.map((cell) => cell.y)).size).toBe(2);
  });

  it('reuses the cartesian scale for scatter points', () => {
    expect(scatterPoints([2, 8], { width: 60, height: 40, padding: 5 })).toEqual(
      points([2, 8], { width: 60, height: 40, padding: 5 }),
    );
  });
});