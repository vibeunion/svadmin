<script lang="ts">
  import { tick, untrack, type Snippet } from 'svelte';
  import { createI18nScope, provideI18nScope, useTranslation } from '@svadmin/core/i18n';

  let { locale = 'en', children }: { locale?: string; children: Snippet } = $props();
  const scope = createI18nScope({ locale: untrack(() => locale) });
  provideI18nScope(scope);
  const i18n = useTranslation();

  export async function setLocale(locale: string): Promise<void> {
    i18n.setLocale(locale);
    await tick();
  }
</script>

{@render children()}
