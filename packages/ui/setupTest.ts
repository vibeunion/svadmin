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

// Happy DOM 21 aborts repeated requestAnimationFrame callbacks from the same stack, which
// breaks bits-ui open/close transitions in a single test.
const happyDOM = (window as unknown as { happyDOM?: { settings: { timer: { preventTimerLoops: boolean } } } }).happyDOM;
if (happyDOM) happyDOM.settings.timer.preventTimerLoops = false;

// Happy DOM 21 implements getAnimations() without a rendering clock, so bits-ui would wait
// forever for close transitions. Keep the previous fallback used by the component tests.
Object.defineProperty(Element.prototype, 'getAnimations', {
  configurable: true,
  writable: true,
  value: undefined,
});

beforeEach(() => {
  testLocalStorage.clear();
});

afterEach(async () => {
  cleanup();
  // bits-ui restores body scroll styles asynchronously; wait for it before Happy DOM teardown.
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 30);
  });
});
