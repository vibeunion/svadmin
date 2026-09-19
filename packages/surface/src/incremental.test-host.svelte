<script lang="ts">
  import type { SurfaceWidgetRendererProps } from './catalog.js';
  let { props }: SurfaceWidgetRendererProps = $props();
  let draft = $state('');
</script>
<label>{String(props['label'])}<input aria-label={String(props['label'])} bind:value={draft} /></label>
