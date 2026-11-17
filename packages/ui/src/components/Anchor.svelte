<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { cn } from '../utils.js';

  export interface AnchorItem {
    id?: string;
    href?: string;
    title?: string;
    label?: string;
    level?: number;
  }

  function resolveItemId(item: AnchorItem): string {
    return item.id ?? (item.href?.startsWith('#') ? item.href.slice(1) : item.href) ?? '';
  }

  function resolveItemLabel(item: AnchorItem): string {
    return item.title ?? item.label ?? '';
  }

  interface Props {
    items: AnchorItem[];
    offset?: number;
    targetOffset?: number;
    label?: string;
    class?: string;
    onselect?: (id: string) => void;
    onSelect?: (id: string) => void;
    onChange?: (id: string) => void;
  }

  let {
    items,
    offset = 96,
    targetOffset,
    label = 'On this page',
    class: className = '',
    onselect,
    onSelect,
    onChange,
  }: Props = $props();
  const effectiveOffset = $derived(targetOffset ?? offset);
  let active = $state(untrack(() => items[0] ? resolveItemId(items[0]) : ''));
  let observer: IntersectionObserver | undefined;

  onMount(() => {
    const elements = items.map((item) => document.getElementById(resolveItemId(item))).filter((value): value is HTMLElement => Boolean(value));
    if (elements.length === 0) return;
    observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]?.target.id) active = visible[0].target.id;
    }, { rootMargin: `-${effectiveOffset}px 0px -65% 0px`, threshold: [0, 1] });
    for (const element of elements) observer.observe(element);
    return () => observer?.disconnect();
  });

  function jump(id: string): void {
    const target = document.getElementById(id);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - effectiveOffset;
    window.scrollTo({ top, behavior: 'smooth' });
    active = id;
    onselect?.(id);
    onSelect?.(id);
    onChange?.(id);
  }
</script>

<nav class={cn('svadmin-anchor', className)} aria-label={label}>
  <p class="svadmin-anchor__title">{label}</p>
  <ul>
    {#each items as item (resolveItemId(item))}
      {@const itemId = resolveItemId(item)}
      {@const itemLabel = resolveItemLabel(item)}
      <li style:padding-inline-start={`${Math.max(0, (item.level ?? 1) - 1) * 0.75}rem`}>
        <button type="button" class:is-active={active === itemId} aria-current={active === itemId ? 'location' : undefined} onclick={() => jump(itemId)}>{itemLabel}</button>
      </li>
    {/each}
  </ul>
</nav>

<style>
  .svadmin-anchor { display: grid; gap: var(--svadmin-space-2); min-width: 0; }
  .svadmin-anchor__title { margin: 0; color: var(--muted-foreground); font-size: var(--svadmin-text-caption); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .svadmin-anchor ul { display: grid; gap: var(--svadmin-space-1); margin: 0; padding: 0; list-style: none; }
  .svadmin-anchor button { width: 100%; padding: var(--svadmin-space-1) var(--svadmin-space-2); border: 0; border-inline-start: 2px solid transparent; background: transparent; color: var(--muted-foreground); font-size: var(--svadmin-text-label); text-align: start; cursor: pointer; }
  .svadmin-anchor button:hover, .svadmin-anchor button:focus-visible { color: var(--foreground); background: var(--accent); outline: none; }
  .svadmin-anchor button.is-active { border-inline-start-color: var(--primary); color: var(--primary); font-weight: 600; }
</style>
