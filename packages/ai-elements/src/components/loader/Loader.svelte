<script module lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  export type LoaderProps = Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> & {
    size?: number;
    label?: string;
    class?: string;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import LoaderIcon from './LoaderIcon.svelte';

  let { size = 16, label = 'Loading', class: className = '', ...rest }: LoaderProps = $props();
</script>

<div {...rest} class={cn('svadmin-ai-loader', className)} role="status" aria-label={label} aria-live="polite" data-slot="loader">
  <LoaderIcon {size} />
</div>

<style>
  .svadmin-ai-loader { display: inline-flex; align-items: center; justify-content: center; animation: svadmin-ai-loader-spin 800ms linear infinite; }
  @keyframes svadmin-ai-loader-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .svadmin-ai-loader { animation-duration: 1600ms; } }
</style>
