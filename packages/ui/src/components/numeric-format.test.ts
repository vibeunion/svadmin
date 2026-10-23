import { describe, expect, it } from 'vitest';
import {
  NUMERIC_INPUT_LOCALES,
  addNumericStep,
  formatNumericValue,
  isNumericInputLocale,
  parseNumericInput,
} from './numeric-format.js';

describe('numeric locale formatting contract', () => {
  it('keeps the supported locale set explicit', () => {
    expect(NUMERIC_INPUT_LOCALES).toEqual(['en-US', 'de-DE', 'zh-CN']);
    expect(isNumericInputLocale('de-DE')).toBe(true);
    expect(isNumericInputLocale('fr-FR')).toBe(false);
  });

  it.each([
    ['en-US', 1234.5, '1,234.5'],
    ['de-DE', 1234.5, '1.234,5'],
    ['zh-CN', 1234.5, '1,234.5'],
    ['en-US', -1234.5, '-1,234.5'],
    ['de-DE', -1234.5, '-1.234,5'],
    ['de-DE', 0, '0'],
  ] as const)('formats %s %d with grouping and locale decimal separator', (locale, value, expected) => {
    expect(formatNumericValue(locale, value)).toBe(expected);
  });

  it('uses precision for display rounding without changing the stored value', () => {
    expect(formatNumericValue('de-DE', 1234.5, 2)).toBe('1.234,50');
    expect(formatNumericValue('en-US', 1.23456, 2)).toBe('1.23');
    expect(formatNumericValue('zh-CN', 1234, 0)).toBe('1,234');
  });

  it.each([
    ['en-US', '1,234.5', 1234.5],
    ['de-DE', '1.234,5', 1234.5],
    ['zh-CN', '1,234.5', 1234.5],
    ['de-DE', '-1.234,5', -1234.5],
    ['en-US', '0', 0],
    ['de-DE', '0,25', 0.25],
    ['en-US', '.5', 0.5],
    ['de-DE', ',5', 0.5],
  ] as const)('parses %s %s without treating display separators as written values', (locale, text, expected) => {
    expect(parseNumericInput(locale, text)).toEqual({ ok: true, value: expected });
  });

  it('keeps empty input distinct from zero', () => {
    expect(parseNumericInput('en-US', '')).toEqual({ ok: true, value: null });
    expect(parseNumericInput('en-US', '   ')).toEqual({ ok: true, value: null });
  });

  it('steps by the explicit increment without display-precision rounding or overflow', () => {
    expect(addNumericStep(1.23456, 0.001)).toBe(1.23556);
    expect(addNumericStep(1.2, 0.001, -1)).toBe(1.199);
    expect(addNumericStep(1, 1e-7)).toBe(1.0000001);
    expect(Object.is(addNumericStep(0, 0.1, -1), -0)).toBe(false);
    expect(addNumericStep(Number.MAX_VALUE, Number.MAX_VALUE)).toBe(Number.MAX_VALUE);
    expect(addNumericStep(1, Number.POSITIVE_INFINITY)).toBe(1);
    expect(addNumericStep(1, 0)).toBe(1);
  });

  it('keeps explicit steps smaller than 1e-12 instead of clamping display precision', () => {
    expect(addNumericStep(0, 1e-13)).toBe(1e-13);
    expect(addNumericStep(1, 1e-13)).toBe(1.0000000000001);
    expect(addNumericStep(0, 1e-15)).toBe(1e-15);
    expect(addNumericStep(0, 1e-13, -1)).toBe(-1e-13);
    expect(addNumericStep(1e-13, 1e-13, -1)).toBe(0);
    expect(Object.is(addNumericStep(0, 1e-13, -1), -0)).toBe(false);
  });

  it('documents the Number boundary without promising sub-ulp precision', () => {
    expect(addNumericStep(0, 1e-16)).toBe(1e-16);
    expect(addNumericStep(1, 1e-17)).toBe(1);
    const beyondSafeInteger = addNumericStep(Number.MAX_SAFE_INTEGER, 2);
    expect(Number.isFinite(beyondSafeInteger)).toBe(true);
    expect(beyondSafeInteger).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
    expect(Number.isFinite(addNumericStep(Number.MAX_VALUE, Number.MAX_VALUE, -1))).toBe(true);
    expect(Number.isFinite(addNumericStep(-Number.MAX_VALUE, Number.MAX_VALUE, -1))).toBe(true);
  });

  it.each([
    ['en-US', '1.234,5'],
    ['de-DE', '1,234.5'],
    ['en-US', '1 234'],
    ['en-US', '12abc'],
    ['en-US', '1e999'],
    ['de-DE', '--1'],
    ['en-US', '1,23'],
    ['de-DE', '1.23,4'],
    ['en-US', '-'],
    ['en-US', '∞'],
  ] as const)('rejects illegal or mixed %s input %s without exposing a raw error', (locale, text) => {
    expect(parseNumericInput(locale, text)).toEqual({ ok: false });
    expect(JSON.stringify(parseNumericInput(locale, text))).not.toContain(text);
  });
});