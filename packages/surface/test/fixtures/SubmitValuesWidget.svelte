<script lang="ts">
  import type { SurfaceWidgetRendererProps } from '../../src/catalog.js';
  let { props, onSubmitValues }: SurfaceWidgetRendererProps = $props();
  const title = $derived(typeof props['title'] === 'string' ? props['title'] : 'Submit');
</script>

<button type="button" onclick={() => onSubmitValues?.({ name: 'Ada', days: 2, meta: { ok: true } })} data-testid="submit-values">{title}</button>
