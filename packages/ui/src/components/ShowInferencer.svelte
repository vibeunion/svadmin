<script lang="ts">
  import type { ResourceRendering } from '../rendering/index.js';
  // ShowInferencer renders a detail page from the resource definition with no page-specific configuration.
  // The :id parameter is extracted from the URL automatically.
  import ShowPage from './ShowPage.svelte';
  import { useParsed } from '@svadmin/core';

  interface Props {
    resourceName: string;
    rendering?: ResourceRendering | undefined;
    /** Optional explicit id; defaults to the value parsed from the URL. */
    id?: string | number;
    class?: string;
  }

  let { resourceName, rendering, id, class: className = '' }: Props = $props();
  const parsed = useParsed();
  const resolvedId = $derived(id ?? parsed.id ?? '');
</script>

{#if resolvedId}
  <ShowPage {rendering} {resourceName} id={resolvedId} class={className} />
{/if}
