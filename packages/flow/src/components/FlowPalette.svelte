<script lang="ts">
  import { encodeFlowPaletteItem, FLOW_PALETTE_MIME_TYPE } from '../flow-dnd.js';
  import type { FlowPaletteItem } from '../types.js';

  type Props = {
    items: FlowPaletteItem[];
    label?: string;
    class?: string;
    onitemdragstart?: (detail: { template: FlowPaletteItem; event: DragEvent }) => void;
    onitemselect?: (template: FlowPaletteItem) => void;
  };

  let {
    items,
    label = 'Flow node palette',
    class: className = '',
    onitemdragstart,
    onitemselect,
  }: Props = $props();

  function startPaletteDrag(event: DragEvent, paletteTemplate: FlowPaletteItem) {
    if (!event.dataTransfer || paletteTemplate.disabled) return;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(FLOW_PALETTE_MIME_TYPE, encodeFlowPaletteItem(paletteTemplate));
    onitemdragstart?.({ template: paletteTemplate, event });
  }
</script>

<aside class={['svadmin-flow-palette', className]} aria-label={label}>
  {#each items as paletteTemplate (paletteTemplate.id)}
    <button
      type="button"
      class="svadmin-flow-palette__item"
      draggable={!paletteTemplate.disabled}
      disabled={paletteTemplate.disabled}
      data-flow-template={paletteTemplate.id}
      ondragstart={(event) => startPaletteDrag(event, paletteTemplate)}
      onclick={() => onitemselect?.(paletteTemplate)}
    >
      <span class="svadmin-flow-palette__label">{paletteTemplate.label}</span>
      {#if paletteTemplate.description}
        <span class="svadmin-flow-palette__description">{paletteTemplate.description}</span>
      {/if}
    </button>
  {/each}
</aside>
