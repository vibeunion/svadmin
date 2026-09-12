<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import Button from '../../src/components/ui/button/button.svelte';

  let { href }: { href?: string } = $props();
  let ref = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
</script>

<Button {...definedOptions({ href })} bind:ref>Reference action</Button>
<output data-testid="bound-button-tag">{ref?.tagName ?? 'none'}</output>
