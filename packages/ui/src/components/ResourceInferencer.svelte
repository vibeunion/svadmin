<script lang="ts">
  // ResourceInferencer provides a zero-configuration CRUD renderer.
  // It dispatches to the matching Inferencer component from the URL action: list, create, edit, or show.
  // Usage: <ResourceInferencer resourceName="posts" />
  import { useParsed } from '@svadmin/core';
  import ListInferencer from './ListInferencer.svelte';
  import CreateInferencer from './CreateInferencer.svelte';
  import EditInferencer from './EditInferencer.svelte';
  import ShowInferencer from './ShowInferencer.svelte';

  interface Props {
    resourceName: string;
    class?: string;
  }

  let { resourceName, class: className = '' }: Props = $props();
  const parsed = useParsed();
</script>

{#if parsed.action === 'create'}
  <CreateInferencer {resourceName} class={className} />
{:else if parsed.action === 'edit'}
  <EditInferencer {resourceName} class={className} />
{:else if parsed.action === 'show'}
  <ShowInferencer {resourceName} class={className} />
{:else}
  <ListInferencer {resourceName} class={className} />
{/if}
