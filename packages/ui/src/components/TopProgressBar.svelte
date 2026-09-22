<script lang="ts">
  import { cn } from '../utils.js';

  interface Props {
    /** 0–100 progress. Leave undefined for an idle/hidden bar. */
    value?: number | null;
    /** Renders an animated unknown-progress bar regardless of `value`. */
    indeterminate?: boolean;
    /** Bar thickness in pixels. */
    height?: number;
    /** Pins the bar to the top edge of the viewport. */
    fixed?: boolean;
    ariaLabel?: string;
    class?: string;
  }

  let {
    value,
    indeterminate = false,
    height = 3,
    fixed = true,
    ariaLabel = 'Loading',
    class: className = '',
  }: Props = $props();

  const visible = $derived(indeterminate || (value !== null && value !== undefined));
  const clamped = $derived(Math.max(0, Math.min(100, value ?? 0)));
</script>

{#if visible}
  <div
    class={cn('svadmin-top-progress', className)}
    data-slot="top-progress"
    data-fixed={fixed ? 'true' : 'false'}
    style={`--svadmin-top-progress-height: ${height}px;`}
    role="progressbar"
    aria-label={ariaLabel}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={indeterminate ? undefined : clamped}
  >
    <span
      class="svadmin-top-progress__bar"
      data-indeterminate={indeterminate ? 'true' : 'false'}
      style={indeterminate ? undefined : `transform: scaleX(${clamped / 100});`}
    ></span>
  </div>
{/if}

<style>
  .svadmin-top-progress {
    position: relative;
    width: 100%;
    height: var(--svadmin-top-progress-height, 3px);
    overflow: hidden;
    background: var(--muted, color-mix(in oklch, var(--foreground, currentColor) 12%, transparent));
  }

  .svadmin-top-progress[data-fixed='true'] {
    position: fixed;
    inset-block-start: 0;
    inset-inline: 0;
    z-index: 9999;
  }

  .svadmin-top-progress__bar {
    display: block;
    width: 100%;
    height: 100%;
    transform-origin: left center;
    background: var(--primary, currentColor);
    transition: transform 240ms ease-out;
  }

  .svadmin-top-progress__bar[data-indeterminate='true'] {
    width: 40%;
    transform: translateX(-100%);
    animation: svadmin-top-progress-indeterminate 1.1s ease-in-out infinite;
  }

  @keyframes svadmin-top-progress-indeterminate {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }

  @media (prefers-reduced-motion: reduce) {
    .svadmin-top-progress__bar { transition: none; }
    .svadmin-top-progress__bar[data-indeterminate='true'] { animation-duration: 2.2s; }
  }
</style>