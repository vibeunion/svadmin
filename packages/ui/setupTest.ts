import '@testing-library/svelte/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';

const storageBacking = new Map<string, string>();

export const testLocalStorage: Storage = {
  get length() { return storageBacking.size; },
  clear: () => storageBacking.clear(),
  getItem: key => storageBacking.get(key) ?? null,
  key: index => Array.from(storageBacking.keys())[index] ?? null,
  removeItem: key => { storageBacking.delete(key); },
  setItem: (key, value) => { storageBacking.set(key, value); },
};

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: testLocalStorage,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: testLocalStorage,
  });
}

beforeEach(() => {
  testLocalStorage.clear();
});

afterEach(() => {
  cleanup();
});
