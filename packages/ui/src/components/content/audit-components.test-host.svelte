<script lang="ts">
  import AuditSection from './AuditSection.svelte';
  import ChartContainer from './ChartContainer.svelte';
  import EvidenceCard from './EvidenceCard.svelte';
  import type { AuditDataState } from './audit-state.js';
  import FilterToolbar from './FilterToolbar.svelte';
  let { dataState = 'ready', retry = () => {} }: { dataState?: AuditDataState; retry?: () => void } = $props();
  let query = $state('');
  let filter = $state('pending');
</script>

<AuditSection title="Stock risk" state={dataState} {retry}>
  {#snippet actions()}<button>Open products</button>{/snippet}
  <p>Loaded inventory</p>
</AuditSection>
<ChartContainer title="Inventory chart" state={dataState} {retry}><p>Loaded chart</p></ChartContainer>
<EvidenceCard title="Source" status="Verified" statusTone="success" source="Receipt 123"><p>Evidence body</p></EvidenceCard>
<FilterToolbar bind:query advancedLabel="Inventory filters">
  {#snippet filters()}<label>Status<input bind:value={filter} /></label>{/snippet}
  {#snippet advanced()}<p>Advanced options</p>{/snippet}
</FilterToolbar>
