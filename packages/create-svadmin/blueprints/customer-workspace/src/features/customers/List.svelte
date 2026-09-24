<script lang="ts">
  import { AutoTable, ContentPageShell } from '@svadmin/ui';
  import { getDesign } from '../../design.svelte';
  let { resourceName }: { resourceName: string } = $props();
  const design = $derived(getDesign());
</script>

<ContentPageShell pageId="customer-list" width={design.width} density={design.density}>
  <AutoTable {resourceName} density={design.density} />
</ContentPageShell>
