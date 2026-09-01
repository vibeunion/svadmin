<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { BarChart3, ChevronDown, ChevronUp, CircleAlert } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  interface Props extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'class' | 'title'> {
    used?: number;
    limit?: number;
    usedTokens?: number;
    maxTokens?: number;
    usage?: import('./context-state.svelte.js').ContextUsage;
    modelId?: string;
    inputTokens?: number;
    outputTokens?: number;
    cachedTokens?: number;
    cost?: number;
    currency?: string;
    label?: string;
    open?: boolean;
    defaultOpen?: boolean;
    class?: string;
    children?: Snippet;
    onopenchange?: (open: boolean) => void;
    onOpenChange?: (open: boolean) => void;
  }

  let {
    used = 0,
    limit,
    usedTokens,
    maxTokens,
    usage,
    modelId,
    inputTokens,
    outputTokens,
    cachedTokens,
    cost,
    currency = '$',
    label = 'Context window',
    defaultOpen = false,
    open = $bindable(defaultOpen),
    class: className = '',
    children,
    onopenchange,
    onOpenChange,
    onpointerenter,
    onpointerleave,
    onfocusin,
    onfocusout,
    onkeydown,
    ...rest
  }: Props = $props();

  import { provideContextContext } from './context-state.svelte.js';

  const componentId = $props.id();
  const resolvedUsed = $derived(usedTokens ?? used);
  const resolvedLimit = $derived(maxTokens ?? limit);
  const resolvedInputTokens = $derived(usage?.inputTokens ?? inputTokens);
  const resolvedOutputTokens = $derived(usage?.outputTokens ?? outputTokens);
  const resolvedCachedTokens = $derived(usage?.cachedInputTokens ?? cachedTokens);
  const safeUsed = $derived(Math.max(0, Number.isFinite(resolvedUsed) ? resolvedUsed : 0));
  const safeLimit = $derived(resolvedLimit !== undefined && Number.isFinite(resolvedLimit) && resolvedLimit > 0 ? resolvedLimit : undefined);
  const ratio = $derived(safeLimit ? safeUsed / safeLimit : 0);
  const percent = $derived(Math.min(100, Math.round(ratio * 100)));
  const remaining = $derived(safeLimit ? Math.max(0, safeLimit - safeUsed) : undefined);
  const tone = $derived(percent >= 90 ? 'critical' : percent >= 75 ? 'warning' : 'normal');
  const hasBreakdown = $derived(resolvedInputTokens !== undefined || resolvedOutputTokens !== undefined || resolvedCachedTokens !== undefined || usage?.reasoningTokens !== undefined || cost !== undefined || children);
  let rootElement = $state<HTMLElement>();
  let pointerInside = $state(false);
  let focusInside = $state(false);

  function setOpen(nextOpen: boolean): void {
    if (open === nextOpen) return;
    open = nextOpen;
    onopenchange?.(nextOpen);
    if (onOpenChange !== onopenchange) onOpenChange?.(nextOpen);
  }

  provideContextContext({
    get usedTokens() { return safeUsed; },
    get maxTokens() { return safeLimit ?? 0; },
    get usage() {
      return usage ?? {
        inputTokens: resolvedInputTokens,
        outputTokens: resolvedOutputTokens,
        cachedInputTokens: resolvedCachedTokens,
      };
    },
    get modelId() { return modelId; },
    get cost() { return cost; },
    get currency() { return currency; },
    get open() { return open; },
    setOpen,
  });

  $effect(() => {
    if (!children || !open || typeof document === 'undefined') return;
    const dismiss = (event: PointerEvent) => { if (rootElement && !rootElement.contains(event.target as Node)) { pointerInside = false; focusInside = false; setOpen(false); } };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  });

  function formatTokens(value?: number): string {
    if (value === undefined || !Number.isFinite(value)) return '-';
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }
</script>

<section
  {...rest}
  bind:this={rootElement}
  class={cn('svadmin-ai-context', `svadmin-ai-context--${tone}`, children && 'svadmin-ai-context--compound', className)}
  aria-labelledby={children ? undefined : `${componentId}-title`}
  data-slot="context"
  onpointerenter={(event) => { onpointerenter?.(event); if (children && !event.defaultPrevented) { pointerInside = true; setOpen(true); } }}
  onpointerleave={(event) => { onpointerleave?.(event); if (children && !event.defaultPrevented) { pointerInside = false; if (!focusInside) setOpen(false); } }}
  onfocusin={(event) => { onfocusin?.(event); if (children && !event.defaultPrevented) { focusInside = true; setOpen(true); } }}
  onfocusout={(event) => { onfocusout?.(event); if (children && !event.defaultPrevented && !rootElement?.contains(event.relatedTarget as Node | null)) { focusInside = false; if (!pointerInside) setOpen(false); } }}
  onkeydown={(event) => { onkeydown?.(event); if (children && !event.defaultPrevented && event.key === 'Escape') { pointerInside = false; focusInside = false; setOpen(false); } }}
>
  {#if children}
    {@render children()}
  {:else}
  <header class="svadmin-ai-context__header">
    <div class="svadmin-ai-context__title"><span aria-hidden="true"><BarChart3 size={16} /></span><h3 id={`${componentId}-title`}>{label}</h3></div>
    {#if hasBreakdown}
      <button class="svadmin-ai-context__toggle" type="button" aria-expanded={open} aria-controls={`${componentId}-details`} onclick={() => setOpen(!open)}>
        {open ? 'Hide details' : 'Details'} {#if open}<ChevronUp size={14} aria-hidden="true" />{:else}<ChevronDown size={14} aria-hidden="true" />{/if}
      </button>
    {/if}
  </header>

  <div class="svadmin-ai-context__summary">
    <div class="svadmin-ai-context__numbers"><strong>{formatTokens(safeUsed)}</strong>{#if safeLimit}<span> / {formatTokens(safeLimit)} tokens</span>{:else}<span> tokens used</span>{/if}</div>
    <span class="svadmin-ai-context__percent" aria-label={`${percent}% of context used`}>{percent}%</span>
  </div>
  <div class="svadmin-ai-context__meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} aria-valuetext={`${formatTokens(safeUsed)} of ${safeLimit ? formatTokens(safeLimit) : 'unknown'} tokens used`}>
    <span style={`width: ${percent}%`}></span>
  </div>
  {#if tone === 'critical'}<p class="svadmin-ai-context__warning" role="status"><CircleAlert size={14} aria-hidden="true" /> Context is nearly full.</p>{/if}

  {#if open}
    <div id={`${componentId}-details`} class="svadmin-ai-context__details">
      {#if remaining !== undefined}<div><span>Remaining</span><strong>{formatTokens(remaining)}</strong></div>{/if}
      {#if resolvedInputTokens !== undefined}<div><span>Input</span><strong>{formatTokens(resolvedInputTokens)}</strong></div>{/if}
      {#if resolvedOutputTokens !== undefined}<div><span>Output</span><strong>{formatTokens(resolvedOutputTokens)}</strong></div>{/if}
      {#if usage?.reasoningTokens !== undefined}<div><span>Reasoning</span><strong>{formatTokens(usage.reasoningTokens)}</strong></div>{/if}
      {#if resolvedCachedTokens !== undefined}<div><span>Cached</span><strong>{formatTokens(resolvedCachedTokens)}</strong></div>{/if}
      {#if cost !== undefined}<div><span>Estimated cost</span><strong>{currency}{cost.toFixed(4)}</strong></div>{/if}
    </div>
  {/if}
  {/if}
</section>

<style>
  .svadmin-ai-context { display: grid; gap: .65rem; padding: .85rem 1rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, var(--background, transparent)); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-context__header, .svadmin-ai-context__title, .svadmin-ai-context__summary { display: flex; align-items: center; }
  .svadmin-ai-context__header { justify-content: space-between; gap: .75rem; }
  .svadmin-ai-context__title { gap: .5rem; }
  .svadmin-ai-context__title > span { display: inline-flex; color: var(--primary, currentColor); }
  h3 { margin: 0; font-size: .85rem; font-weight: 650; }
  .svadmin-ai-context__toggle { display: inline-flex; align-items: center; gap: .2rem; border: 0; padding: 0; background: transparent; color: var(--primary, currentColor); font: inherit; font-size: .72rem; cursor: pointer; }
  .svadmin-ai-context__toggle:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-context__summary { justify-content: space-between; gap: .75rem; }
  .svadmin-ai-context__numbers { display: flex; align-items: baseline; gap: .25rem; min-width: 0; }
  .svadmin-ai-context__numbers strong { font-size: 1rem; font-variant-numeric: tabular-nums; }
  .svadmin-ai-context__numbers span { color: var(--muted-foreground, currentColor); font-size: .72rem; }
  .svadmin-ai-context__percent { color: var(--muted-foreground, currentColor); font-size: .75rem; font-variant-numeric: tabular-nums; }
  .svadmin-ai-context__meter { height: .35rem; overflow: hidden; border-radius: 999px; background: var(--muted, color-mix(in oklch, var(--foreground, currentColor) 12%, transparent)); }
  .svadmin-ai-context__meter span { display: block; height: 100%; border-radius: inherit; background: var(--primary, currentColor); transition: width 180ms ease; }
  .svadmin-ai-context--warning .svadmin-ai-context__meter span { background: var(--warning, var(--primary, currentColor)); }
  .svadmin-ai-context--critical .svadmin-ai-context__meter span { background: var(--destructive, currentColor); }
  .svadmin-ai-context__warning { display: flex; align-items: center; gap: .35rem; margin: 0; color: var(--destructive, currentColor); font-size: .74rem; }
  .svadmin-ai-context__details { display: grid; grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr)); gap: .55rem; border-top: 1px solid var(--border, currentColor); padding-top: .65rem; }
  .svadmin-ai-context__details > div:not(.svadmin-ai-context__custom) { display: grid; gap: .1rem; }
  .svadmin-ai-context__details span { color: var(--muted-foreground, currentColor); font-size: .7rem; }
  .svadmin-ai-context__details strong { font-size: .78rem; font-variant-numeric: tabular-nums; }
  .svadmin-ai-context--compound { padding: 0; }
  @media (prefers-reduced-motion: reduce) { .svadmin-ai-context__meter span { transition: none; } }
</style>
