import { describe, expect, it } from 'vitest';
import { cn, composeClasses } from './classnames.js';

const declarations = { all: [1, 2, 3, 4], horizontal: [2, 4], narrow: [2, 4], hover: [5], wide: [2, 4] };

describe('native class composition', () => {
  it('accepts conditional objects, nested arrays, and absent values', () => {
    expect(cn('host', [false, null, ['widget']], { visible: true, hidden: false })).toBe('host widget visible');
  });
  it('uses last-owned-class precedence when every earlier declaration is covered', () => {
    expect(composeClasses('narrow wide', declarations)).toBe('wide');
    expect(composeClasses('horizontal all', declarations)).toBe('all');
  });
  it('preserves shorthand effects that are only partially overridden', () => {
    expect(composeClasses('all horizontal', declarations)).toBe('all horizontal');
  });
  it('does not conflate different selectors or conditions', () => {
    expect(composeClasses('narrow hover', declarations)).toBe('narrow hover');
  });
  it('preserves unknown host syntax and rejects inherited metadata', () => {
    expect(composeClasses('host arbitrary:[value] __proto__ constructor', declarations))
      .toBe('host arbitrary:[value] __proto__ constructor');
  });
  it('deduplicates only identical unknown class tokens', () => {
    expect(composeClasses('host first host', declarations)).toBe('first host');
  });
});
