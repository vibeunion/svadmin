<script lang="ts">
  import SystemErrorState from './content/SystemErrorState.svelte';
  import ContentPageShell from './content/ContentPageShell.svelte';
  interface Props { status?: '404' | '500'; title?: string; description?: string; }
  let { status = '404', title, description }: Props = $props();
</script>

<ContentPageShell pageId="system-error" width="narrow"><SystemErrorState {status} {title} {description} /></ContentPageShell>
