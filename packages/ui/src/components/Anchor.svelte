<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { cn } from '../utils.js';

  export interface AnchorItem {
    id: string;
    label: string;
    level?: number;
  }

  interface Props {
    items: AnchorItem[];
    offset?: number;
    label?: string;
    class?: string;
  }

  let { items, offset = 96, label = 'On this page', class: className = '' }: Props = $props();
  let active = $state(untrack(() => items[0]?.id ?? ''));
  let observer: IntersectionObserver | undefined;

  onMount(() => {
    const elements = items.map((item) => document.getElementById(item.id)).filter((value): value is HTMLElement => Boolean(value));
    if (elements.length === 0) return;
    observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]?.target.id) active = visible[0].target.id;
    }, { rootMargin: `-${offset}px 0px -65% 0px`, threshold: [0, 1] });
    for (const element of elements) observer.observe(element);
    return () => observer?.disconnect();
  });

  function jump(id: string): void {
    const target = document.getElementById(id);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
    active = id;
  }
</script>

<nav class={cn('svadmin-anchor', className)} aria-label={label}>
  <p class="svadmin-anchor__title">{label}</p>
  <ul>
    {#each items as item (item.id)}
      <li style:padding-inline-start={`${Math.max(0, (item.level ?? 1) - 1) * 0.75}rem`}>
        <button type="button" class:is-active={active === item.id} aria-current={active === item.id ? 'location' : undefined} onclick={() => jump(item.id)}>{item.label}</button>
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