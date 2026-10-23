<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import FileUpload from './FileUpload.svelte';
  import TestI18nScopeHost from '../../test/fixtures/TestI18nScopeHost.svelte';

  let { settings }: { settings: ComponentProps<typeof FileUpload> } = $props();
  let scope: TestI18nScopeHost;
  export async function setLocale(locale: string) {
    await scope.setLocale(locale);
  }
</script>

<TestI18nScopeHost bind:this={scope}>
  <FileUpload {...settings} />
</TestI18nScopeHost>
