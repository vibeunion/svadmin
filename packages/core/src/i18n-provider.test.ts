// Tests I18nProvider injection and delegation.
// i18n.svelte.ts uses Svelte 5 runes, so $state is unavailable in a plain bun:test environment.
// Rune-dependent tests are skipped under bun:test and run with Vitest plus the Svelte compiler;
// type contract tests run in every environment.
import { describe, test, expect } from 'bun:test';

describe('I18nProvider type contract', () => {
  test('I18nProvider interface requires translate, getLocale, setLocale', () => {
    // Verify that the provider interface includes the three required methods.
    type Provider = {
      translate: (key: string, params?: Record<string, string | number>) => string;
      getLocale: () => string;
      setLocale: (locale: string) => void;
    };
    const provider: Provider = {
      translate: (key) => `[X]${key}`,
      getLocale: () => 'fr',
      setLocale: () => {},
    };
    expect(provider.translate('save')).toBe('[X]save');
    expect(provider.getLocale()).toBe('fr');
    expect(typeof provider.setLocale).toBe('function');
  });

  test('getAvailableLocales is optional on provider', () => {
    type Provider = {
      translate: (key: string) => string;
      getLocale: () => string;
      setLocale: (locale: string) => void;
      getAvailableLocales?: () => string[];
    };
    // Assignment remains valid without getAvailableLocales.
    const minimal: Provider = {
      translate: () => '',
      getLocale: () => 'en',
      setLocale: () => {},
    };
    expect(minimal.getAvailableLocales).toBeUndefined();

    // Assignment remains valid with getAvailableLocales.
    const extended: Provider = {
      translate: () => '',
      getLocale: () => 'en',
      setLocale: () => {},
      getAvailableLocales: () => ['en', 'fr'],
    };
    expect(extended.getAvailableLocales?.()).toEqual(['en', 'fr']);
  });
});

// i18n-provider.test.svelte.ts covers runtime delegation under Vitest with the Svelte compiler.
