import { describe, expect, test } from 'vitest';
import { compactChartLabel } from './widget-data.js';

describe('compactChartLabel', () => {
  test('keeps short labels, abbreviates ISO dates, and truncates long labels', () => {
    expect(compactChartLabel('Stock', 8)).toBe('Stock');
    expect(compactChartLabel('2026-08-11', 8)).toBe('8/11');
    expect(compactChartLabel('Ergonomic Chair', 12)).toBe('Ergonomic C…');
  });
});
