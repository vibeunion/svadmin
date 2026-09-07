<script lang="ts">
  // EditInferencer renders an edit form from the resource definition with no page-specific configuration.
  // The :id parameter is extracted from the URL automatically.
  import EditPage from './EditPage.svelte';
  import { useParsed } from '@svadmin/core';

  interface Props {
    resourceName: string;
    /** Optional explicit id; defaults to the value parsed from the URL. */
    id?: string | number;
    class?: string;
  }

  let { resourceName, id, class: className = '' }: Props = $props();
  const parsed = useParsed();
  const resolvedId = $derived(id ?? parsed.id ?? '');
</script>

{#if resolvedId}
  <EditPage {resourceName} id={resolvedId} class={className} />
{/if}
