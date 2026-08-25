const storage = new Map<string, string>();

const testLocalStorage: Storage = {
  get length() { return storage.size; },
  clear: () => storage.clear(),
  getItem: (key) => storage.get(key) ?? null,
  key: (index) => Array.from(storage.keys())[index] ?? null,
  removeItem: (key) => { storage.delete(key); },
  setItem: (key, value) => { storage.set(key, value); },
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
