<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import ErrorSummary from './ErrorSummary.svelte';
  import TestI18nScopeHost from '../../test/fixtures/TestI18nScopeHost.svelte';

  let { title }: { title?: string | undefined } = $props();
  let scope: TestI18nScopeHost;

  export async function setLocale(locale: string) {
    await scope.setLocale(locale);
  }
</script>

<TestI18nScopeHost bind:this={scope}>
  <ErrorSummary {...definedOptions({ title })} errors={[{ fieldKey: 'name', label: 'Name', message: 'Required' }]} />
</TestI18nScopeHost>
