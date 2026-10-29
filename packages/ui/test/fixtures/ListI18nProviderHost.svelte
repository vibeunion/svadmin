<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import { createI18nScope, provideI18nScope, type I18nProvider } from '@svadmin/core/i18n';

  let { provider, children }: { provider: I18nProvider; children: Snippet } = $props();
  provideI18nScope(createI18nScope({ provider: untrack(() => provider) }));
</script>

{@render children()}
