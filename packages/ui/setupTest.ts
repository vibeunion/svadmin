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

afterEach(async () => {
  cleanup();
  // bits-ui 会延迟恢复 body 滚动样式；需在 Happy DOM 销毁前等它完成。
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 30);
  });
});
