<script lang="ts">
  import { AutoForm, ContentPageShell } from '@svadmin/ui';
  import { getDesign } from '../../design.svelte';
  let { resourceName, mode = 'create', id }: {
    resourceName: string; mode?: 'create' | 'edit' | 'clone'; id?: string | number;
  } = $props();
  const design = $derived(getDesign());
</script>

<ContentPageShell pageId="customer-form" width={design.width} density={design.density}>
  <AutoForm {resourceName} {mode} {...(id === undefined ? {} : { id })}
    columns={design.formColumns} density={design.density} />
</ContentPageShell>
