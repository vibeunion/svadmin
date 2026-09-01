import '@happy-dom/global-registrator';

const storageValues = new Map<string, string>();
const testStorage: Storage = {
  get length() { return storageValues.size; },
  clear: () => storageValues.clear(),
  getItem: key => storageValues.get(key) ?? null,
  key: index => Array.from(storageValues.keys())[index] ?? null,
  removeItem: key => { storageValues.delete(key); },
  setItem: (key, value) => { storageValues.set(key, value); },
};

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: testStorage,
});
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: testStorage,
});
