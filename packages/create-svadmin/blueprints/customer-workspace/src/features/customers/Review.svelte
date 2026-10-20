<script lang="ts">
  import { AutoForm, ContentPageShell, DataState, PageSection, ShowPage } from '@svadmin/ui';
  let { resourceName, id }: { resourceName: string; id?: string | number } = $props();
</script>

<ContentPageShell pageId="approval-review" width="default">
  {#if id !== undefined}
    <ShowPage {resourceName} {id}>
      <PageSection title="审批决定">
        <AutoForm {resourceName} {id} mode="edit" showHeader={false} columns={1} />
      </PageSection>
    </ShowPage>
  {:else}
    <DataState state="error" title="缺少审批编号" />
  {/if}
</ContentPageShell>
