/**
 * Refine I18nProvider → svadmin I18nProvider.
 *
 * Refine's provider is imperative and may return non-string translations.
 * svadmin keeps translation returns strictly string-shaped at the boundary.
 */
import type { I18nProvider } from '@svadmin/core';

type RefineI18nSource = {
  translate?: (key: string, options?: unknown, defaultMessage?: string) => unknown;
  changeLocale?: (locale: string, options?: unknown) => unknown;
  getLocale?: () => unknown;
};

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

export function createRefineI18nAdapter(source: unknown): I18nProvider {
  if (!isObject(source)) {
    throw new TypeError('[svadmin] createRefineI18nAdapter: expected a Refine I18nProvider object');
  }
  const i18n = source as RefineI18nSource;
  if (typeof i18n.translate !== 'function'
    || typeof i18n.changeLocale !== 'function'
    || typeof i18n.getLocale !== 'function') {
    throw new TypeError('createRefineI18nAdapter: expected translate, changeLocale and getLocale');
  }

  return {
    translate(key, params) {
      const value = i18n.translate?.(key, params, key);
      if (typeof value !== 'string') throw new TypeError('Refine I18nProvider translate() must return a string');
      return value;
    },
    getLocale() {
      const value = i18n.getLocale?.();
      if (typeof value !== 'string') throw new TypeError('Refine I18nProvider getLocale() must return a string');
      return value;
    },
    setLocale(locale) {
      void i18n.changeLocale?.(locale);
    },
  };
}
