import { describe, expect, test } from 'vitest';
import { jsonValueIssue } from './json.js';

describe('JSON value boundary', () => {
  test.each([
    ['Date', new Date('2026-08-11T00:00:00Z')],
    ['File', new File(['surface'], 'surface.txt')],
    ['BigInt', 1n],
    ['function', () => undefined],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('rejects %s values', (_label, value) => {
    expect(jsonValueIssue({ value })).toEqual(expect.objectContaining({ path: ['value'] }));
  });

  test('rejects cyclic values while allowing repeated non-cyclic references', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(jsonValueIssue(cyclic)).toEqual(expect.objectContaining({ path: ['self'] }));

    const shared = { value: 1 };
    expect(jsonValueIssue({ first: shared, second: shared })).toBeNull();
  });

  test('rejects sparse and excessively deep arrays without throwing', () => {
    expect(jsonValueIssue(Array(1))).toEqual({
      path: [0],
      message: 'Sparse arrays are not allowed',
    });

    let deep: unknown = null;
    for (let index = 0; index < 70; index += 1) deep = [deep];
    expect(jsonValueIssue(deep)).toEqual(expect.objectContaining({
      message: 'JSON nesting exceeds the supported depth',
    }));
  });

  test('rejects non-JSON own properties on arrays', () => {
    const hidden: unknown[] = [];
    Object.defineProperty(hidden, 'hidden', { value: () => undefined, enumerable: false });
    expect(jsonValueIssue(hidden)).toEqual(expect.objectContaining({
      path: ['hidden'],
    }));

    const symbolKey = Symbol('surface');
    const symbolProperty: unknown[] & { [symbolKey]?: unknown } = [];
    symbolProperty[symbolKey] = () => undefined;
    expect(jsonValueIssue(symbolProperty)).toEqual(expect.objectContaining({
      message: 'Symbol properties are not allowed',
    }));
  });
});
