import { describe, expect, it } from 'vitest';
import {
  MemoryStorageAdapter,
  LocalStorageAdapter,
  useStorageCache,
} from './useStorageCache.svelte.js';

describe('useStorageCache and StorageAdapter suite', () => {
  it('supports MemoryStorageAdapter with get, set, delete and TTL', () => {
    const mem = new MemoryStorageAdapter();
    mem.set('key1', 'value1');
    expect(mem.get('key1')).toBe('value1');
    expect(mem.has('key1')).toBe(true);

    mem.delete('key1');
    expect(mem.get('key1')).toBeNull();
    expect(mem.has('key1')).toBe(false);
  });

  it('evicts expired items when TTL elapses in MemoryStorageAdapter', () => {
    const mem = new MemoryStorageAdapter();
    // 0.001s TTL
    mem.set('expiring', 'foo', -1);
    expect(mem.get('expiring')).toBeNull();
  });

  it('supports LocalStorageAdapter with namespace and JSON serializing', () => {
    localStorage.clear();
    const storage = new LocalStorageAdapter('test-ns');
    storage.set('theme', { mode: 'dark' });

    expect(storage.get('theme')).toEqual({ mode: 'dark' });
    expect(storage.keys()).toContain('theme');

    storage.clear();
    expect(storage.get('theme')).toBeNull();
  });

  it('initializes useStorageCache reactive hook', () => {
    const mem = new MemoryStorageAdapter();
    const cache = useStorageCache('pref_column', 'compact', { adapter: mem });

    expect(cache.value).toBe('compact');
    cache.set('expanded');
    expect(cache.value).toBe('expanded');
    expect(mem.get('pref_column')).toBe('expanded');

    cache.remove();
    expect(cache.value).toBe('compact');
  });
});
