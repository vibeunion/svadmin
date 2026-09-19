<script lang="ts">
  import { setContext, type Snippet } from 'svelte';
  import { SVAR_SURFACE_CONTEXT, type SvarSurfaceContext } from '../svar-context.js';
  let { Grid, Theme, scopeKey = 0, children }: {
    Grid: SvarSurfaceContext['Grid']; Theme: SvarSurfaceContext['Theme']; scopeKey?: string | number; children: Snippet;
  } = $props();
  setContext<SvarSurfaceContext>(SVAR_SURFACE_CONTEXT, {
    get Grid() { return Grid; }, get Theme() { return Theme; }, get scopeKey() { return scopeKey; },
  });
</script>

{@render children()}
