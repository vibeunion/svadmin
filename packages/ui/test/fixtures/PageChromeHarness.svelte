<script lang="ts">
  import { Download, Plus } from '@lucide/svelte';
  import PageHeader from '../../src/components/PageHeader.svelte';
  import FilterToolbar from '../../src/components/content/FilterToolbar.svelte';
  import { Button } from '../../src/components/ui/button/index.js';

  let { density = 'compact' }: { density?: 'compact' | 'comfortable' } = $props();
  let query = $state('orders');
  let advancedOpen = $state(false);
  let backCount = $state(0);
</script>

<PageHeader
  title="OrderManagementInternationalFulfilmentReviewQueue2026"
  description="Review orders and filter pending approvals."
  {density}
  showBreadcrumbs={false}
  onBack={() => backCount++}
>
  {#snippet actions()}
    <Button variant="outline" size="sm"><Download />Export</Button>
    <Button size="sm"><Plus />New order</Button>
  {/snippet}
</PageHeader>
<FilterToolbar bind:query bind:advancedOpen {density} placeholder="Search orders" advancedLabel="Advanced filters" activeFilterCount={2}>
  {#snippet filters()}
    <label>Status <select aria-label="Order status"><option>All</option><option>Pending</option></select></label>
  {/snippet}
  {#snippet advanced()}
    <label>Owner <input aria-label="Order owner" /></label>
  {/snippet}
  {#snippet actions()}
    <Button variant="outline" size="sm">Saved filters</Button>
  {/snippet}
</FilterToolbar>
<output data-testid="query-state">{query}</output>
<output data-testid="advanced-state">{advancedOpen}</output>
<output data-testid="back-state">{backCount}</output>
