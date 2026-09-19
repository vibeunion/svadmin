<script lang="ts">
  import { componentView, createResourceRenderers, type CellInput, type FieldInput } from '../../../packages/ui/src/rendering/index.js';
  import { orders } from './resource.js';
  import Status from './Status.svelte';
  let { status = 'paid', onchange }: {
    status?: 'paid' | 'pending';
    onchange: (value: unknown) => void;
  } = $props();
  const ui = createResourceRenderers(orders);
  const cellInput = $derived({ value: 'untrusted cell value', record: { id: 1, status, amount: 2 } });
  const fieldInput = $derived({ field: { key: 'status', label: 'Status', type: 'select' as const }, value: status, onchange });
  const view = $derived(componentView(Status, { status }));
</script>

{#snippet statusCell(input: CellInput)}
  {@const cell = ui.cell('status', input)}
  <output data-testid="cell-status">{cell.value}</output>
{/snippet}
{#snippet statusField(input: FieldInput)}
  {@const field = ui.field('create', 'status', input)}
  {#if field.state.valid}<output data-testid="field-status">{field.state.value}</output>{/if}
  <button type="button" onclick={() => field.onchange('pending')}>Change status</button>
{/snippet}
{@render statusCell(cellInput)}
{@render statusField(fieldInput)}
<view.component {...view.props} />
