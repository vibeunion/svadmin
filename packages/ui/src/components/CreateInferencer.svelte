<script lang="ts">
  // CreateInferencer renders a create form from the resource definition with no page-specific configuration.
  import CreatePage from './CreatePage.svelte';

  interface Props {
    resourceName: string;
    class?: string;
  }

  let { resourceName, class: className = '' }: Props = $props();
</script>

<CreatePage {resourceName} class={className} />
