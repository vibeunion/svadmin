<script lang="ts">
  import { untrack } from 'svelte';
  import { createI18nScope, provideI18nScope, type I18nProvider } from '@svadmin/core/i18n';
  import ErrorComponent from './ErrorComponent.svelte';

  let {
    error,
    title,
    description,
    retry,
    locale = 'zh-CN',
    translations,
  }: {
    error?: Error | null;
    title?: string;
    description?: string;
    retry?: () => void;
    locale?: string;
    /** 宿主的旧词条覆盖表，用于验证 error.title / buttons.retry 等兼容能力。 */
    translations?: Record<string, string>;
  } = $props();

  // 过滤 undefined，避免 exactOptionalPropertyTypes 下把可选属性显式传成 undefined。
  function definedOptions<T extends object>(options: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
    return Object.fromEntries(
      Object.entries(options).filter(([, value]) => value !== undefined),
    ) as { [K in keyof T]?: Exclude<T[K], undefined> };
  }

  const baseScope = createI18nScope({ locale: untrack(() => locale) });
  const overrides = untrack(() => translations);
  const provider: I18nProvider | undefined = overrides
    ? {
        translate: (key, params) => overrides[key] ?? baseScope.translate(key, params),
        getLocale: () => baseScope.locale,
        setLocale: (nextLocale: string) => baseScope.setLocale(nextLocale),
      }
    : undefined;

  provideI18nScope(createI18nScope(definedOptions({
    locale: untrack(() => locale),
    provider: untrack(() => provider),
  })));
</script>

<ErrorComponent {...definedOptions({ error, title, description, retry })} />
