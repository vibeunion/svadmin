<script lang="ts">
  // ShowInferencer renders a detail page from the resource definition with no page-specific configuration.
  // The :id parameter is extracted from the URL automatically.
  import ShowPage from './ShowPage.svelte';
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
  <ShowPage {resourceName} id={resolvedId} class={className} />
{/if}
