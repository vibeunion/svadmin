<script module lang="ts">
  import type { SVGAttributes } from 'svelte/elements';

  export type ContextIconProps = Omit<SVGAttributes<SVGSVGElement>, 'children'> & {
    size?: number;
  };
</script>

<script lang="ts">
  import { useContextContext } from './context-state.svelte.js';

  let { size = 20, ...rest }: ContextIconProps = $props();
  const context = useContextContext('ContextIcon');
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const ratio = $derived(context.maxTokens > 0
    ? Math.min(1, Math.max(0, context.usedTokens / context.maxTokens))
    : 0);
  const dashOffset = $derived(circumference * (1 - ratio));
</script>

<svg {...rest} width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Model context usage" data-slot="context-icon">
  <circle cx="12" cy="12" r={radius} fill="none" stroke="currentColor" stroke-width="2" opacity="0.25" />
  <circle
    cx="12"
    cy="12"
    r={radius}
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-dasharray={`${circumference} ${circumference}`}
    stroke-dashoffset={dashOffset}
    opacity="0.7"
    style="transform-origin: center; transform: rotate(-90deg)"
  />
</svg>
