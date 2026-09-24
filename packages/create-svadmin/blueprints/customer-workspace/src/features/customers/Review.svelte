<script lang="ts">
  import { AutoForm, ContentPageShell, DataState, PageSection, ShowPage } from '@svadmin/ui';
  import { getDesign } from '../../design.svelte';
  let { resourceName, id }: { resourceName: string; id?: string | number } = $props();
  const design = $derived(getDesign());
</script>

<ContentPageShell pageId="approval-review" width="default" density={design.density}>
  {#if id !== undefined}
    <ShowPage {resourceName} {id} density={design.density}>
      <PageSection title="审批决定">
        <AutoForm {resourceName} {id} mode="edit" showHeader={false} columns={1} />
      </PageSection>
    </ShowPage>
  {:else}
    <DataState state="error" title="缺少审批编号" />
  {/if}
</ContentPageShell>
