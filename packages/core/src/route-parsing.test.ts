import { describe, expect, it } from 'bun:test';
import { parseResourceActionSegments } from './route-parsing';

describe('parseResourceActionSegments', () => {
  const cases = [
    [[], { action: 'list' }],
    [['create'], { action: 'create' }],
    [['edit', '1'], { action: 'edit', id: '1' }],
    [['1', 'edit'], { action: 'edit', id: '1' }],
    [['show', '1'], { action: 'show', id: '1' }],
    [['1'], { action: 'show', id: '1' }],
    [['clone', '1'], { action: 'clone', id: '1' }],
  ] as const;

  for (const [segments, expected] of cases) {
    it(`parses ${segments.join('/') || 'list'}`, () => {
      expect(parseResourceActionSegments([...segments])).toEqual(expected);
    });
  }
});
