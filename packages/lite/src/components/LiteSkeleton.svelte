<script lang="ts">
  interface Props {
    lines?: number;
    width?: string;
    height?: string;
    circle?: boolean;
    label?: string;
  }

  let { lines = 3, width = '100%', height = '14px', circle = false, label = 'Loading' }: Props = $props();
</script>

<div class="lite-skeleton" role="status" aria-label={label} aria-busy="true">
  {#if circle}
    <span class="lite-skeleton__circle" aria-hidden="true"></span>
  {:else}
    {#each Array.from({ length: Math.max(1, lines) }, (_, index) => index) as index (index)}
      <span class="lite-skeleton__line" style={`width:${index === lines - 1 && lines > 1 ? '65%' : width};height:${height}`} aria-hidden="true"></span>
    {/each}
  {/if}
  <span class="lite-skeleton__sr">{label}</span>
</div>

<style>
  .lite-skeleton { display: block; }
  .lite-skeleton__line, .lite-skeleton__circle { display: block; background: #F2F3F5; animation: lite-skeleton-pulse 1.4s ease-in-out infinite; }
  .lite-skeleton__line { border-radius: 4px; }
  .lite-skeleton__circle { width: 40px; height: 40px; border-radius: 999px; }
  .lite-skeleton__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  @keyframes lite-skeleton-pulse { 50% { opacity: 0.5; } }

  .lite-skeleton__line + .lite-skeleton__line { margin-top: 8px; }
</style>
