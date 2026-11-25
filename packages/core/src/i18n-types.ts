/**
 * I18nProvider — pluggable translation boundary.
 * When set, all t/getLocale/getAvailableLocales delegates to it first,
 * falling back to the built-in locale tables. This lets apps integrate
 * existing i18n systems (svelte-i18n, paraglide, etc.) without rewriting callsites.
 */
export interface I18nProvider {
  translate: (key: string, params?: Record<string, string | number>) => string;
  getLocale: () => string;
  setLocale: (locale: string) => void;
  getAvailableLocales?: () => string[];
}

/** Owner-controlled values for one component-tree i18n scope. */
export interface I18nScopeOptions {
  locale?: string;
  provider?: I18nProvider;
  onLocaleChange?: (locale: string) => void;
}

/**
 * Tree-local i18n state. `updateOwner` synchronizes props without emitting a
 * change event, while `setLocale` represents a change requested inside the tree.
 */
export interface I18nScope {
  readonly locale: string;
  readonly provider: I18nProvider | undefined;
  translate: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: string) => void;
  setProvider: (provider: I18nProvider | undefined) => void;
  getAvailableLocales: () => string[];
  updateOwner: (options: I18nScopeOptions) => void;
}
