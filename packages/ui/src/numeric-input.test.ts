import { describe, expect, it } from 'vitest';
import { numericInputValue } from './numeric-input';

describe('numeric input values', () => {
  it('preserves numbers and normalizes empty form values', () => {
    expect(numericInputValue(0)).toBe(0);
    expect(numericInputValue(-1.5)).toBe(-1.5);
    for (const empty of [null, undefined, '']) expect(numericInputValue(empty)).toBeNull();
  });

  it('rejects invalid values instead of coercing them into valid input', () => {
    for (const invalid of ['42', 'invalid', NaN, Infinity, -Infinity, {}, [], false]) {
      expect(() => numericInputValue(invalid)).toThrow(TypeError);
    }
  });
});
