<script lang="ts">
  import type { SurfaceWidgetRendererProps } from '@svadmin/surface/svelte';
  let { props }: SurfaceWidgetRendererProps = $props();
  let note = $state('');
</script>
<label>{String(props['label'])}<input bind:value={note} aria-label={String(props['label'])} placeholder="This local draft must survive a title edit" /></label>
<style>
  label { display: grid; gap: 0.5rem; font-weight: 500; }
  input { border: 1px solid var(--border); border-radius: 0.375rem; padding: 0.75rem; color: var(--foreground); background: var(--background); width: 100%; min-width: 0; box-sizing: border-box; }
</style>
