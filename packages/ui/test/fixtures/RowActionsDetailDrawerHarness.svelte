<script lang="ts">
  import DetailDrawer from '../../src/components/DetailDrawer.svelte';
  import RowActions, { type RowActionItem } from '../../src/components/RowActions.svelte';

  let lastAction = $state('none');
  let drawerOpen = $state(true);
  let closeCount = $state(0);

  const actions: RowActionItem[] = [
    { label: 'View', onclick: () => { lastAction = 'view'; } },
    { label: 'Docs', href: '/records/42' },
    { label: 'Delete', danger: true, onclick: () => { lastAction = 'delete'; } },
    { label: 'Hidden', hidden: true },
  ];
</script>

<RowActions {actions} maxVisible={1} moreLabel="More actions" data-testid="row-actions" />
<p data-testid="last-action">{lastAction}</p>

<DetailDrawer
  bind:open={drawerOpen}
  title="Record details"
  titleId="record-details-title"
  description="Review the selected record."
  descriptionId="record-details-description"
  closeLabel="Close record details"
  onClose={() => { closeCount += 1; }}
>
  <p>Record content</p>
  {#snippet footer()}
    <button type="button">Save changes</button>
  {/snippet}
</DetailDrawer>
<p data-testid="drawer-state">{drawerOpen ? 'open' : 'closed'}:{closeCount}</p>
