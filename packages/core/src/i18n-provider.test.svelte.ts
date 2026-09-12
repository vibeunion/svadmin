// I18nProvider runtime delegation tests require Vitest and the Svelte 5 compiler.
// Run with: cd packages/core && bunx vitest run src/i18n-provider.test.svelte.ts
import { describe, it, expect } from 'vitest';
import {
  setI18nProvider,
  getI18nProvider,
  t,
  getLocale,
  getAvailableLocales,
  resetI18n,
} from './i18n.svelte';

describe('I18nProvider runtime delegation', () => {
  it('returns undefined by default', () => {
    resetI18n();
    expect(getI18nProvider()).toBeUndefined();
  });

  it('t() delegates to provider.translate', () => {
    resetI18n();
    setI18nProvider({
      translate: (key: string) => `[CUSTOM]${key}`,
      getLocale: () => 'fr',
      setLocale: () => {},
    });
    expect(t('common.save')).toBe('[CUSTOM]common.save');
    resetI18n();
  });

  it('getLocale() delegates to provider.getLocale', () => {
    resetI18n();
    setI18nProvider({
      translate: (key: string) => key,
      getLocale: () => 'de',
      setLocale: () => {},
    });
    expect(getLocale()).toBe('de');
    resetI18n();
  });

  it('getAvailableLocales() delegates to provider.getAvailableLocales when present', () => {
    resetI18n();
    setI18nProvider({
      translate: (key: string) => key,
      getLocale: () => 'de',
      setLocale: () => {},
      getAvailableLocales: () => ['de', 'en'],
    });
    expect(getAvailableLocales()).toEqual(['de', 'en']);
    resetI18n();
  });

  it('resetI18n clears provider', () => {
    resetI18n();
    setI18nProvider({
      translate: (key: string) => `[X]${key}`,
      getLocale: () => 'fr',
      setLocale: () => {},
    });
    expect(getI18nProvider()).toBeDefined();
    resetI18n();
    expect(getI18nProvider()).toBeUndefined();
  });

  it('built-in translation works without provider', () => {
    resetI18n();
    expect(t('common.save')).not.toBe('[X]common.save');
    resetI18n();
  });
});
