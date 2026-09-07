<script lang="ts">
  // ListInferencer renders a list view from the resource definition with no page-specific configuration.
  // It composes ListPage and AutoTable without requiring handwritten page code.
  import ListPage from './ListPage.svelte';

  interface Props {
    resourceName: string;
    class?: string;
  }

  let { resourceName, class: className = '' }: Props = $props();
</script>

<ListPage {resourceName} class={className} />
