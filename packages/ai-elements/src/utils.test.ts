import { describe, expect, it } from 'vitest';
import { safeResourceUrl } from './utils.js';

describe('safeResourceUrl', () => {
  it('allows explicit network and object URL protocols', () => {
    expect(safeResourceUrl('https://example.test/file')).toBe('https://example.test/file');
    expect(safeResourceUrl('http://example.test/file')).toBe('http://example.test/file');
    expect(safeResourceUrl('blob:https://example.test/id')).toBe('blob:https://example.test/id');
  });

  it('rejects executable, embedded, relative, and malformed URLs', () => {
    expect(safeResourceUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeResourceUrl('data:text/html,test')).toBeUndefined();
    expect(safeResourceUrl('/relative')).toBeUndefined();
    expect(safeResourceUrl('not a url')).toBeUndefined();
  });
});
