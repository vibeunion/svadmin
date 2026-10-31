<script lang="ts">
  interface Props {
    lines?: number;
    width?: string;
    height?: string;
    circle?: boolean;
    label?: string;
    /**
     * Page-level skeleton layout, mirroring the reference PageSkeleton: header,
     * then `rows` blocks of the requested shape. `text` keeps the plain lines.
     */
    variant?: 'text' | 'list' | 'show' | 'form';
    /** Number of body rows/blocks for the page variants. */
    rows?: number;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let {
    lines = 3,
    width = '100%',
    height = '14px',
    circle = false,
    label = 'Loading',
    variant = 'text',
    rows = 5,
    class: className = '',
  }: Props = $props();

  const blockCount = $derived(Math.max(1, rows));
</script>

<div
  class={`lite-skeleton lite-skeleton--${variant} ${className}`.trim()}
  role="status"
  aria-label={label}
  aria-busy="true"
  data-variant={variant}
>
  {#if variant !== 'text'}
    <!-- Page-level skeleton: same structure as the reference, generated from props. -->
    <div class="lite-skeleton__header" aria-hidden="true">
      <span class="lite-skeleton__line" style="width:200px;height:32px"></span>
      <span class="lite-skeleton__line" style="width:300px"></span>
      {#if variant === 'list'}<span class="lite-skeleton__line" style="width:120px;height:40px"></span>{/if}
    </div>
    <div class="lite-skeleton__panel" aria-hidden="true">
      {#each Array.from({ length: blockCount }, (_, index) => index) as index (index)}
        <div class="lite-skeleton__block" data-shape={variant}>
          {#if variant === 'list'}
            <span class="lite-skeleton__line" style="flex:1;height:24px"></span>
            <span class="lite-skeleton__line" style="flex:1;height:24px"></span>
            <span class="lite-skeleton__line" style="flex:1;height:24px"></span>
            <span class="lite-skeleton__line" style="flex:1;height:24px"></span>
          {:else if variant === 'show'}
            <span class="lite-skeleton__line" style="width:100px"></span>
            <span class="lite-skeleton__line" style="width:250px;height:24px"></span>
          {:else}
            <span class="lite-skeleton__line" style="width:100px"></span>
            <span class="lite-skeleton__line" style="width:100%;max-width:420px;height:40px"></span>
          {/if}
        </div>
      {/each}
      {#if variant === 'form'}
        <div class="lite-skeleton__block" data-shape="actions">
          <span class="lite-skeleton__line" style="width:100px;height:40px"></span>
          <span class="lite-skeleton__line" style="width:100px;height:40px"></span>
        </div>
      {/if}
    </div>
  {:else if circle}
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

  .lite-skeleton__header { display: flex; flex-wrap: wrap; }
  .lite-skeleton__header > * + * { margin-left: 8px; }
  .lite-skeleton__header > :first-child { flex: 0 0 auto; }
  .lite-skeleton__panel { margin-top: 24px; padding: 16px; border: 1px solid #E5E6EB; border-radius: 6px; }
  .lite-skeleton__block + .lite-skeleton__block { margin-top: 16px; }
  .lite-skeleton__block[data-shape='list'] { display: flex; }
  .lite-skeleton__block[data-shape='list'] > * + * { margin-left: 16px; }
  .lite-skeleton__block[data-shape='actions'] { display: flex; }
  .lite-skeleton__block[data-shape='actions'] > * + * { margin-left: 8px; }
</style>
