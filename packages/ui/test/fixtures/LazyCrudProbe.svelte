<script lang="ts">
  import type { Snippet } from 'svelte';
  let { resourceName = '', id, mode, headerContent, children, onSuccess, profile, preferencesProvider }: {
    resourceName?: string;
    id?: string | number;
    mode?: string;
    headerContent?: Snippet;
    children?: Snippet;
    onSuccess?: () => void;
    profile?: Snippet;
    preferencesProvider?: { description?: string };
  } = $props();
</script>

<p data-testid="crud-props">{resourceName}:{id ?? ''}:{mode ?? ''}</p>
{#if headerContent}{@render headerContent()}{/if}
{#if children}{@render children()}{/if}
{#if profile}{@render profile()}{/if}
{#if preferencesProvider}<p>{preferencesProvider.description}</p>{/if}
{#if onSuccess}<button onclick={onSuccess}>Complete</button>{/if}
