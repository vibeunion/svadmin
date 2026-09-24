<script lang="ts">
  import type { Snippet } from 'svelte';
  import { definedOptions } from '@svadmin/core/options';
  import SectionHeader from './SectionHeader.svelte';

  let { title, description, actions, children }: {
    title: string;
    description?: string;
    actions?: Snippet;
    children: Snippet;
  } = $props();
  const id = $props.id();
</script>

<section class="svadmin-page-section" aria-labelledby={id} data-svadmin-page-section>
  <SectionHeader {id} {title} {...definedOptions({ description, actions })} />
  {@render children()}
</section>

<style>
  .svadmin-page-section {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
    gap: 1rem;
    min-width: 0;
  }
</style>
