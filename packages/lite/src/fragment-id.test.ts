import { describe, expect, test } from 'bun:test';
import { liteFragmentId } from './fragment-id';

describe('liteFragmentId', () => {
  test('keeps token boundaries and escaped values collision-free', () => {
    expect(liteFragmentId('delete', 'posts', '/'))
      .not.toBe(liteFragmentId('delete', 'posts', '-2F'));
    expect(liteFragmentId('delete', 'posts', 'a', 'b'))
      .not.toBe(liteFragmentId('delete', 'posts', 'a-b'));
  });

  test('is deterministic and emits selector-safe identifiers', () => {
    const first = liteFragmentId('confirm', '草稿 / draft');
    const second = liteFragmentId('confirm', '草稿 / draft');

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-z0-9_-]+$/u);
  });
});
