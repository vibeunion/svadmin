import { describe, expect, test } from 'vitest';
import { resolveSurfaceMessages } from './localization.js';
import { compactChartLabel, displayTableValue } from './widget-data.js';

describe('compactChartLabel', () => {
  test('keeps short labels, abbreviates ISO dates, and truncates long labels', () => {
    expect(compactChartLabel('Stock', 8)).toBe('Stock');
    expect(compactChartLabel('2026-08-11', 8)).toBe('8/11');
    expect(compactChartLabel('Ergonomic Chair', 12)).toBe('Ergonomic C…');
  });

  test('formats dates with the requested locale', () => {
    expect(compactChartLabel('2026-08-11', 8, 'zh-CN')).toBe('8/11');
  });
});

describe('displayTableValue', () => {
  test('formats numbers, dates, and booleans with the requested locale', () => {
    const messages = resolveSurfaceMessages('zh-CN');
    const format = (value: string | number | boolean, valueFormat: string) => displayTableValue(value, {
      format: valueFormat,
      locale: valueFormat === 'number' ? 'de-DE' : 'zh-CN',
      messages,
    });

    expect(format(1234.5, 'number')).toBe('1.234,5');
    expect(format('2026-08-11', 'date')).toContain('2026');
    expect(format(true, 'boolean')).toBe('是');
    expect(format(false, 'boolean')).toBe('否');
  });
});
