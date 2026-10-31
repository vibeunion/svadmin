import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { I18nProvider } from '@svadmin/core/i18n';
import AppearanceSettingsI18nScopeHost from '../../test/fixtures/AppearanceSettingsI18nScopeHost.svelte';

vi.mock('@svadmin/core', () => ({
  getTheme: () => 'light',
  setTheme: vi.fn(),
  getColorTheme: () => 'violet',
  setColorTheme: vi.fn(),
  getColorPresets: () => [
    Object.freeze({ name: 'violet', label: 'Violet', color: '#8b5cf6' }),
    Object.freeze({ name: 'neutral', label: 'Tenant neutral', color: '#123456' }),
    Object.freeze({ name: 'custom', label: 'Customer brand', color: '#456789' }),
  ],
}));

afterEach(cleanup);

beforeEach(() => {
  let storage: Record<string, string> = {};
  const localStorageStub: Storage = {
    get length() { return Object.keys(storage).length; },
    clear: () => { storage = {}; },
    getItem: key => storage[key] ?? null,
    key: index => Object.keys(storage)[index] ?? null,
    removeItem: key => {
      storage = Object.fromEntries(
        Object.entries(storage).filter(([storedKey]) => storedKey !== key),
      );
    },
    setItem: (key, value) => { storage[key] = value; },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorageStub,
  });
});

function createProvider(instance: string, initialLocale: string): I18nProvider {
  let locale = initialLocale;

  return {
    translate: key => `${instance}:${locale}:${key}`,
    getLocale: () => locale,
    setLocale: vi.fn((nextLocale: string) => {
      locale = nextLocale;
    }),
    getAvailableLocales: () => ['en', 'zh-CN'],
  };
}

describe('AppearanceSettings locale scope', () => {
  it('localizes color names per tree and preserves custom preset labels', async () => {
    render(AppearanceSettingsI18nScopeHost, {
      instance: 'first', provider: createProvider('first', 'en'),
    });
    render(AppearanceSettingsI18nScopeHost, {
      instance: 'second', provider: createProvider('second', 'zh-CN'),
    });
    const first = within(screen.getByTestId('first-appearance-settings'));
    const second = within(screen.getByTestId('second-appearance-settings'));

    expect(first.getByRole('button', { name: 'first:en:settings.accent.violet' })).not.toBeNull();
    expect(second.getByRole('button', { name: 'second:zh-CN:settings.accent.violet' })).not.toBeNull();
    expect(first.getByRole('button', { name: 'Tenant neutral' })).not.toBeNull();
    expect(first.getByRole('button', { name: 'Customer brand' })).not.toBeNull();
    await fireEvent.change(first.getByRole('combobox'), { target: { value: 'zh-CN' } });
    expect(first.getByRole('button', { name: 'first:zh-CN:settings.accent.violet' })).not.toBeNull();
    expect(second.getByRole('button', { name: 'second:zh-CN:settings.accent.violet' })).not.toBeNull();
    expect(first.getByRole('button', { name: 'Tenant neutral' })).not.toBeNull();
    expect(first.getByRole('button', { name: 'Customer brand' })).not.toBeNull();
  });

  it('keeps the default preset label when the host has no accent translation', () => {
    const provider = createProvider('fallback', 'en');
    provider.translate = key => key;
    const view = render(AppearanceSettingsI18nScopeHost, { instance: 'fallback', provider });

    expect(view.getByRole('button', { name: 'Violet' })).not.toBeNull();
    expect(view.getByRole('button', { name: 'Tenant neutral' })).not.toBeNull();
  });

  it('changes only the component-tree locale that owns the select event', async () => {
    const firstProvider = createProvider('first', 'en');
    const secondProvider = createProvider('second', 'zh-CN');

    render(AppearanceSettingsI18nScopeHost, {
      instance: 'first',
      provider: firstProvider,
    });
    render(AppearanceSettingsI18nScopeHost, {
      instance: 'second',
      provider: secondProvider,
    });

    const firstSelect = within(screen.getByTestId('first-appearance-settings')).getByRole('combobox');
    const secondSelect = within(screen.getByTestId('second-appearance-settings')).getByRole('combobox');
    expect(screen.getByLabelText('first:en:settings.language', { selector: 'select' })).toBe(firstSelect);
    expect(screen.getByLabelText('second:zh-CN:settings.language', { selector: 'select' })).toBe(secondSelect);
    expect(firstSelect.id).not.toBe(secondSelect.id);
    await fireEvent.change(firstSelect, { target: { value: 'zh-CN' } });

    expect(firstProvider.setLocale).toHaveBeenCalledWith('zh-CN');
    expect(secondProvider.setLocale).not.toHaveBeenCalled();
  });

  it('normalizes unsupported stored selections and exposes segmented control state', async () => {
    localStorage.setItem('svadmin-sidebar-density', 'dense');
    localStorage.setItem('svadmin-default-page-size', '20records');
    render(AppearanceSettingsI18nScopeHost, { instance: 'first', provider: createProvider('first', 'en') });

    expect(screen.getByRole('heading', { level: 1, name: 'first:en:settings.appearance' })).toBeTruthy();
    const density = within(screen.getByRole('group', { name: 'first:en:settings.sidebarDensity' }));
    expect(density.getByRole('button', { pressed: true }).textContent).toBe('first:en:settings.standard');
    await fireEvent.click(density.getByRole('button', { name: 'first:en:settings.compact' }));
    expect(density.getByRole('button', { pressed: true }).textContent).toBe('first:en:settings.compact');
    expect(localStorage.getItem('svadmin-sidebar-density')).toBe('compact');

    const pageSize = within(screen.getByRole('group', { name: 'first:en:settings.defaultPageSize' }));
    expect(pageSize.getByRole('button', { pressed: true }).textContent).toBe('10');
    await fireEvent.click(pageSize.getByRole('button', { name: '50' }));
    expect(pageSize.getByRole('button', { pressed: true }).textContent).toBe('50');
    expect(localStorage.getItem('svadmin-default-page-size')).toBe('50');
  });
});
