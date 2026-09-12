import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  configureTheme,
  getResolvedTheme,
  getTheme,
  getThemeConfig,
  registerThemeOwner,
  resetTheme,
  setColorTheme,
  setTheme,
  unregisterThemeOwner,
  updateThemeOwner,
  type ColorPreset,
} from './theme.svelte';

const firstPreset: ColorPreset = {
  name: 'owner-first',
  label: 'Owner first',
  color: '#111111',
  light: { '--owner-preset': 'first-light' },
  dark: { '--owner-preset': 'first-dark' },
};

const secondPreset: ColorPreset = {
  name: 'owner-second',
  label: 'Owner second',
  color: '#222222',
  light: { '--owner-preset': 'second-light', '--second-preset-only': 'yes' },
  dark: { '--owner-preset': 'second-dark', '--second-preset-only': 'yes' },
};

function createMemoryStorage(): Storage {
  const values: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(values).length;
    },
    clear() {
      for (const key of Object.keys(values)) Reflect.deleteProperty(values, key);
    },
    getItem(key) {
      return Object.hasOwn(values, key) ? values[key] ?? null : null;
    },
    key(index) {
      return Object.keys(values)[index] ?? null;
    },
    removeItem(key) {
      Reflect.deleteProperty(values, key);
    },
    setItem(key, value) {
      values[key] = String(value);
    },
  };
}

function resetBrowserThemeState(): void {
  const storage = createMemoryStorage();
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  window.localStorage.clear();
  const root = document.documentElement;
  root.className = '';
  root.removeAttribute('style');
  root.removeAttribute('data-theme');
  resetTheme();
}

beforeEach(resetBrowserThemeState);

describe('theme owners', () => {
  it('uses the last explicit owner and supports non-LIFO cleanup', () => {
    const first = registerThemeOwner({
      defaultTheme: 'dark',
      themeConfig: {
        layoutPreset: 'clean-flat',
        colorPreset: firstPreset,
        cssOverrides: { '--owner': 'first' },
      },
    });
    const second = registerThemeOwner({
      defaultTheme: 'light',
      themeConfig: {
        strategy: 'dark-first',
        disableColorScheme: true,
        colorPreset: secondPreset,
        cssOverrides: { '--owner': 'second' },
      },
    });

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(getTheme()).toBe('light');
    expect(document.documentElement.style.getPropertyValue('--owner')).toBe('second');
    expect(document.documentElement.style.getPropertyValue('--owner-preset')).toBe('second-light');
    expect(document.documentElement.classList.contains('layout-clean-flat')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('');

    unregisterThemeOwner(first);

    expect(document.documentElement.style.getPropertyValue('--owner')).toBe('second');
    expect(document.documentElement.style.getPropertyValue('--second-preset-only')).toBe('yes');

    unregisterThemeOwner(second);

    expect(document.documentElement.style.getPropertyValue('--owner')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--owner-preset')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--second-preset-only')).toBe('');
    expect(getThemeConfig()).toEqual({});
  });

  it('restores the previous owner when the top owner unmounts', () => {
    const first = registerThemeOwner({
      defaultTheme: 'dark',
      themeConfig: {
        layoutPreset: 'clean-flat',
        colorPreset: firstPreset,
        cssOverrides: { '--owner': 'first' },
      },
    });
    const second = registerThemeOwner({
      defaultTheme: 'light',
      themeConfig: {
        colorPreset: secondPreset,
        cssOverrides: { '--owner': 'second', '--second-only': 'yes' },
      },
    });

    unregisterThemeOwner(second);

    expect(getTheme()).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('--owner')).toBe('first');
    expect(document.documentElement.style.getPropertyValue('--owner-preset')).toBe('first-dark');
    expect(document.documentElement.style.getPropertyValue('--second-only')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--second-preset-only')).toBe('');
    expect(document.documentElement.classList.contains('layout-clean-flat')).toBe(true);

    unregisterThemeOwner(first);
  });

  it('fully replaces configuration and removes artifacts from the previous config', () => {
    configureTheme({
      strategy: 'dark-first',
      layoutPreset: 'clean-flat',
      disableColorScheme: true,
      colorPreset: firstPreset,
      cssOverrides: { '--old-override': 'old' },
    });

    configureTheme({
      strategy: 'standard',
      cssOverrides: { '--new-override': 'new' },
    });

    expect(getThemeConfig()).toEqual({
      strategy: 'standard',
      cssOverrides: { '--new-override': 'new' },
    });
    expect(document.documentElement.style.getPropertyValue('--old-override')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--owner-preset')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--new-override')).toBe('new');
    expect(document.documentElement.classList.contains('layout-clean-flat')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe(getResolvedTheme());
  });

  it('does not let an owner with omitted values override active configuration', () => {
    configureTheme({ cssOverrides: { '--legacy-owner': 'legacy' } });
    const token = registerThemeOwner({});

    expect(token).toBeDefined();
    expect(getThemeConfig()).toEqual({ cssOverrides: { '--legacy-owner': 'legacy' } });
    expect(document.documentElement.style.getPropertyValue('--legacy-owner')).toBe('legacy');

    updateThemeOwner(token, {
      themeConfig: { cssOverrides: { '--dynamic-owner': 'active' } },
    });
    expect(document.documentElement.style.getPropertyValue('--legacy-owner')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--dynamic-owner')).toBe('active');

    updateThemeOwner(token, {});
    expect(document.documentElement.style.getPropertyValue('--dynamic-owner')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--legacy-owner')).toBe('legacy');

    unregisterThemeOwner(token);
  });

  it('does not register or mutate owner state during SSR', () => {
    configureTheme({ cssOverrides: { '--legacy-owner': 'legacy' } });
    const browserWindow = globalThis.window;
    const browserDocument = globalThis.document;

    try {
      vi.stubGlobal('window', undefined);
      vi.stubGlobal('document', undefined);

      const token = registerThemeOwner({
        defaultTheme: 'dark',
        themeConfig: { cssOverrides: { '--ssr-owner': 'invalid' } },
      });

      expect(token).toBeUndefined();
      expect(getThemeConfig()).toEqual({ cssOverrides: { '--legacy-owner': 'legacy' } });
    } finally {
      vi.stubGlobal('window', browserWindow);
      vi.stubGlobal('document', browserDocument);
    }

    expect(document.documentElement.style.getPropertyValue('--legacy-owner')).toBe('legacy');
    expect(document.documentElement.style.getPropertyValue('--ssr-owner')).toBe('');
  });

  it('uses defaultTheme only when no persisted choice exists', () => {
    window.localStorage.setItem('svadmin-theme', 'dark');
    resetTheme();
    const persistedOwner = registerThemeOwner({ defaultTheme: 'light' });

    expect(getTheme()).toBe('dark');
    unregisterThemeOwner(persistedOwner);

    window.localStorage.clear();
    resetTheme();
    const defaultOwner = registerThemeOwner({ defaultTheme: 'light' });

    expect(getTheme()).toBe('light');
    expect(window.localStorage.getItem('svadmin-theme')).toBeNull();
    unregisterThemeOwner(defaultOwner);
  });

  it('avoids duplicate persistence writes for unchanged selections', () => {
    const setItem = vi.spyOn(window.localStorage, 'setItem');

    setTheme('dark');
    setTheme('dark');
    setColorTheme('green');
    setColorTheme('green');

    expect(setItem.mock.calls.filter(([key]) => key === 'svadmin-theme')).toHaveLength(1);
    expect(setItem.mock.calls.filter(([key]) => key === 'svadmin-color-theme')).toHaveLength(1);
  });
});
