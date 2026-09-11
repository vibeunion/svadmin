<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  import SystemErrorState from './content/SystemErrorState.svelte';
  import ContentPageShell from './content/ContentPageShell.svelte';
  interface Props { status?: '404' | '500'; title?: string; description?: string; }
  let { status = '404', title, description }: Props = $props();
</script>

<ContentPageShell pageId="system-error" width="narrow"><SystemErrorState {status} {...definedOptions({ "title": title })} {...definedOptions({ "description": description })} /></ContentPageShell>
