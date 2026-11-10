<script lang="ts">
  let { onselect, onclose }: {
    onselect: (color: string) => void;
    onclose?: () => void;
  } = $props();

  const colors = [
    // Row 1: Reds
    '#000000', '#434343', '#666666', '#999999',
    '#b7b7b7', '#cccccc', '#d9d9d9', '#ffffff',
    // Row 2: Saturated
    '#e06666', '#f6b26b', '#ffd966', '#93c47d',
    '#76a5af', '#6fa8dc', '#8e7cc3', '#c27ba0',
    // Row 3: Deep
    '#cc0000', '#e69138', '#f1c232', '#6aa84f',
    '#45818e', '#3d85c6', '#674ea7', '#a64d79',
    // Row 4: Vivid
    '#ff0000', '#ff9900', '#ffff00', '#00ff00',
    '#00ffff', '#0000ff', '#9900ff', '#ff00ff',
    // Row 5: Dark
    '#7f0000', '#783f04', '#7f6000', '#274e13',
    '#0c343d', '#073763', '#20124d', '#4c1130',
  ];

  let popover: HTMLDivElement | undefined = $state();

  function handleClickOutside(e: MouseEvent) {
    if (popover && !popover.contains(e.target as Node)) {
      onclose?.();
    }
  }

  $effect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

<div class="svadmin-color-picker" bind:this={popover}>
  <div class="svadmin-color-grid">
    {#each colors as color, _i (_i)}
      <button
        type="button"
        class="svadmin-color-swatch"
        style="background-color: {color}"
        title={color}
        onclick={() => onselect(color)}
        aria-label="Color {color}"
      ></button>
    {/each}
  </div>
  <div style="margin-top: 6px; display: flex; gap: 4px; align-items: center;">
    <input
      type="color"
      style="width: 28px; height: 28px; border: none; padding: 0; cursor: pointer; border-radius: 4px;"
      oninput={(e) => onselect((e.target as HTMLInputElement).value)}
      aria-label="Custom color"
    />
    <button
      type="button"
      class="svadmin-toolbar-btn"
      style="font-size: 11px; width: auto; padding: 0 8px;"
      title="Remove color"
      onclick={() => onselect('')}
    >
      Reset
    </button>
  </div>
</div>
