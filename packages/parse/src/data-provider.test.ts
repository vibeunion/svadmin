import { describe, expect, test } from 'bun:test';
import { resolveInitializer } from './data-provider';

describe('Parse provider resolution', () => {
  test('accepts the documented export shapes', () => {
    const init = () => ({});
    for (const key of ['createDataProvider', 'default', 'dataProvider', 'DataProvider']) {
      expect(resolveInitializer({ [key]: init })).toBe(init);
    }
  });

  test('rejects modules without a provider initializer', () => {
    expect(() => resolveInitializer({})).toThrow('@refinedev/parse');
  });
});
