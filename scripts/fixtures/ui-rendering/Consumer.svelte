<script lang="ts">
  import AutoTable from '../../../packages/ui/src/components/AutoTable.svelte';
  import AutoForm from '../../../packages/ui/src/components/AutoForm.svelte';
  import FieldRenderer from '../../../packages/ui/src/components/FieldRenderer.svelte';
  import { componentView, createResourceRenderers, type CellInput, type FieldInput } from '../../../packages/ui/src/rendering/index.js';
  import { orders } from './resource.js';
  import Status from './Status.svelte';
  const ui = createResourceRenderers(orders);
</script>

{#snippet statusCell(input: CellInput)}
  {@const cell = ui.cell('status', input)}
  {@const view = componentView(Status, { status: cell.value })}
  <view.component {...view.props} />
{/snippet}
{#snippet editField(input: FieldInput)}
  {#if input.field.key === 'status'}
    {@const field = ui.field('edit', 'status', input)}
    <button type="button" onclick={() => field.onchange('paid')}>
      {field.state.valid ? field.state.value ?? 'unset' : 'invalid'}
    </button>
  {:else}
    <FieldRenderer field={input.field} value={input.value} onchange={input.onchange} />
  {/if}
{/snippet}
<AutoTable resourceName={orders.name} columns={ui.columns({ status: statusCell })} />
<AutoForm resourceName={orders.name} mode="edit" id={1} fieldRenderer={editField} />
