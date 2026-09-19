<script lang="ts">
  import { untrack } from 'svelte';
  import { createI18nScope, provideI18nScope } from '@svadmin/core/i18n';
  import type { FieldDefinition } from '@svadmin/core';
  import FilterBuilder from './FilterBuilder.svelte';
  let { locale, fields }: { locale: string; fields: FieldDefinition[] } = $props();
  provideI18nScope(createI18nScope({ locale: untrack(() => locale) }));
</script>
<FilterBuilder {fields} filters={[]} />
