/**
 * Server-side chart geometry.
 *
 * Every helper is pure and DOM-free so the same numbers render inside SSR HTML
 * and inside tests. Inputs are the normalized table rows that the Lite chart
 * widgets already accept: `[label, value]` pairs where the value may be a
 * numeric string.
 */

export interface Basket {
  width: number;
  height: number;
  padding: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Slice {
  path: string;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Cell extends Rect {
  opacity: number;
}

const DEFAULT_BASKET: Basket = { width: 320, height: 160, padding: 12 };

/** Numeric series extracted from table rows; unparsable or non-finite values become 0. */
export function series(rows: ReadonlyArray<ReadonlyArray<string | number>>): number[] {
  return rows.map((row) => {
    const raw = row[1];
    const value = typeof raw === 'number' ? raw : Number.parseFloat(String(raw ?? ''));
    return Number.isFinite(value) ? value : 0;
  });
}

export function labels(rows: ReadonlyArray<ReadonlyArray<string | number>>): string[] {
  return rows.map((row) => String(row[0] ?? ''));
}

function extent(values: readonly number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max: min === max ? min + 1 : max };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Cartesian plot points scaled into the basket, `x` spread across the series. */
export function points(values: readonly number[], basket: Basket = DEFAULT_BASKET): Point[] {
  const { width, height, padding } = basket;
  const { min, max } = extent(values);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const step = values.length > 1 ? innerWidth / (values.length - 1) : 0;
  return values.map((value, index) => ({
    x: round(padding + step * index + (values.length === 1 ? innerWidth / 2 : 0)),
    y: round(padding + innerHeight - ((value - min) / (max - min)) * innerHeight),
  }));
}

export function polyline(values: readonly number[], basket?: Basket): string {
  return points(values, basket)
    .map((point) => `${point.x},${point.y}`)
    .join(' ');
}

/** Closed area path that fills the space between the series and the baseline. */
export function areaPath(values: readonly number[], basket: Basket = DEFAULT_BASKET): string {
  const plotted = points(values, basket);
  if (plotted.length === 0) return '';
  const baseline = basket.height - basket.padding;
  const first = plotted[0];
  const last = plotted[plotted.length - 1];
  if (!first || !last) return '';
  const line = plotted.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
  return `${line} L${last.x} ${baseline} L${first.x} ${baseline} Z`;
}

function circlePoint(cx: number, cy: number, radius: number, angle: number): Point {
  return { x: round(cx + radius * Math.cos(angle)), y: round(cy + radius * Math.sin(angle)) };
}

function ringSegment(
  values: readonly number[],
  cx: number,
  cy: number,
  outer: number,
  inner: number,
): Slice[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total <= 0) return [];
  let start = -Math.PI / 2;
  return values.map((value) => {
    const sweep = (Math.max(0, value) / total) * Math.PI * 2;
    const end = start + sweep;
    const largeArc = sweep > Math.PI ? 1 : 0;
    const outerStart = circlePoint(cx, cy, outer, start);
    const outerEnd = circlePoint(cx, cy, outer, end);
    const innerEnd = circlePoint(cx, cy, inner, end);
    const innerStart = circlePoint(cx, cy, inner, start);
    const path =
      `M${outerStart.x} ${outerStart.y} ` +
      `A${outer} ${outer} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} ` +
      `L${innerEnd.x} ${innerEnd.y} ` +
      `A${inner} ${inner} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
    start = end;
    return { path };
  });
}

export function pieSlices(values: readonly number[], basket: Basket = DEFAULT_BASKET): Slice[] {
  const cx = basket.width / 2;
  const cy = basket.height / 2;
  return ringSegment(values, cx, cy, Math.min(cx, cy) - basket.padding, 0);
}

export function donutSlices(values: readonly number[], basket: Basket = DEFAULT_BASKET): Slice[] {
  const cx = basket.width / 2;
  const cy = basket.height / 2;
  const outer = Math.min(cx, cy) - basket.padding;
  return ringSegment(values, cx, cy, outer, outer * 0.55);
}

/**
 * Rose chart: every value becomes a wedge whose radius encodes magnitude, so
 * proportional area is intentionally not preserved (that is the point of a rose).
 */
export function roseSlices(values: readonly number[], basket: Basket = DEFAULT_BASKET): Slice[] {
  const cx = basket.width / 2;
  const cy = basket.height / 2;
  const outer = Math.min(cx, cy) - basket.padding;
  const { max } = extent(values.map((value) => Math.max(0, value)));
  const count = Math.max(1, values.length);
  const step = (Math.PI * 2) / count;
  const gap = step * 0.08;
  return values.map((value, index) => {
    const radius = Math.max(6, (Math.max(0, value) / max) * outer);
    const start = -Math.PI / 2 + index * step + gap;
    const end = start + step - gap * 2;
    const from = circlePoint(cx, cy, 0, start);
    const to = circlePoint(cx, cy, radius, start);
    const across = circlePoint(cx, cy, radius, end);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return { path: `M${from.x} ${from.y} L${to.x} ${to.y} A${radius} ${radius} 0 ${largeArc} 1 ${across.x} ${across.y} Z` };
  });
}

/** Radar polygon plus its axes, using one axis per data point. */
export function radarPolygon(
  values: readonly number[],
  basket: Basket = DEFAULT_BASKET,
): { polygon: string; axes: string[] } {
  const cx = basket.width / 2;
  const cy = basket.height / 2;
  const radius = Math.min(cx, cy) - basket.padding;
  const { max } = extent(values.map((value) => Math.max(0, value)));
  const count = Math.max(3, values.length);
  const step = (Math.PI * 2) / count;
  const axes: string[] = [];
  const shape: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + index * step;
    const outer = circlePoint(cx, cy, radius, angle);
    axes.push(`${cx},${cy} ${outer.x},${outer.y}`);
    const raw = values[index] ?? 0;
    const scaled = circlePoint(cx, cy, (Math.max(0, raw) / max) * radius, angle);
    shape.push(`${scaled.x},${scaled.y}`);
  }
  return { polygon: shape.join(' '), axes };
}

/** Gauge drawn as a filled arc from 0 to `value / max`. */
export function gaugeArc(
  value: number,
  max = 100,
  basket: Basket = DEFAULT_BASKET,
): { track: string; value: string; percent: number } {
  const cx = basket.width / 2;
  const cy = basket.height - basket.padding;
  const radius = Math.min(cx, cy) - basket.padding;
  const safeMax = max > 0 ? max : 100;
  const ratio = Math.min(1, Math.max(0, value / safeMax));
  const degree = Math.PI * ratio;
  const start = circlePoint(cx, cy, radius, Math.PI);
  const end = circlePoint(cx, cy, radius, Math.PI + degree);
  const full = circlePoint(cx, cy, radius, Math.PI * 2);
  return {
    track: `M${start.x} ${start.y} A${radius} ${radius} 0 0 1 ${full.x} ${full.y}`,
    value: `M${start.x} ${start.y} A${radius} ${radius} 0 ${degree > Math.PI ? 1 : 0} 1 ${end.x} ${end.y}`,
    percent: Math.round(ratio * 100),
  };
}

export function funnelRects(
  values: readonly number[],
  basket: Basket = DEFAULT_BASKET,
): Rect[] {
  const { width, height, padding } = basket;
  const { max } = extent(values.map((value) => Math.max(0, value)));
  const count = Math.max(1, values.length);
  const gap = 4;
  const step = (height - padding * 2 - gap * (count - 1)) / count;
  const innerWidth = width - padding * 2;
  return values.map((value, index) => {
    const ratio = Math.max(0, value) / max;
    const barWidth = Math.max(4, innerWidth * ratio);
    return {
      x: round(padding + (innerWidth - barWidth) / 2),
      y: round(padding + index * (step + gap)),
      width: round(barWidth),
      height: round(step),
    };
  });
}

/** Waterfall bars accumulate deltas and color rising versus falling steps. */
export function waterfallBars(
  values: readonly number[],
  basket: Basket = DEFAULT_BASKET,
): Array<Rect & { positive: boolean }> {
  const { width, height, padding } = basket;
  const count = Math.max(1, values.length);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  let running = 0;
  const cumulative = values.map((value) => {
    const start = running;
    running += value;
    return { start, end: running };
  });
  const extentValues = cumulative.flatMap((step) => [step.start, step.end, 0]);
  const { min, max } = extent(extentValues);
  const gap = 3;
  const barWidth = Math.max(2, (innerWidth - gap * (count - 1)) / count);
  return values.map((value, index) => {
    const step = cumulative[index] ?? { start: 0, end: 0 };
    const top = Math.max(step.start, step.end);
    const bottom = Math.min(step.start, step.end);
    const yTop = padding + innerHeight - ((top - min) / (max - min)) * innerHeight;
    const yBottom = padding + innerHeight - ((bottom - min) / (max - min)) * innerHeight;
    return {
      x: round(padding + index * (barWidth + gap)),
      y: round(yTop),
      width: round(barWidth),
      height: round(Math.max(1, yBottom - yTop)),
      positive: value >= 0,
    };
  });
}

/** Heatmap cells laid out in a grid; opacity encodes magnitude. */
export function heatCells(
  values: readonly number[],
  basket: Basket = DEFAULT_BASKET,
  columns = 0,
): Cell[] {
  const { width, height, padding } = basket;
  const count = Math.max(1, values.length);
  const cols = columns > 0 ? columns : Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const gap = 2;
  const cellWidth = (width - padding * 2 - gap * (cols - 1)) / cols;
  const cellHeight = (height - padding * 2 - gap * (rows - 1)) / rows;
  const { max } = extent(values.map((value) => Math.max(0, value)));
  return values.map((value, index) => ({
    x: round(padding + (index % cols) * (cellWidth + gap)),
    y: round(padding + Math.floor(index / cols) * (cellHeight + gap)),
    width: round(cellWidth),
    height: round(cellHeight),
    opacity: round(Math.max(0.12, Math.max(0, value) / max)),
  }));
}

export function scatterPoints(values: readonly number[], basket?: Basket): Point[] {
  return points(values, basket);
}

/** Every widget shares one empty-data predicate so SSR output stays predictable. */
export function hasData(rows: ReadonlyArray<ReadonlyArray<string | number>>): boolean {
  return rows.length > 0;
}