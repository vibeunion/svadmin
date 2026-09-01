<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { provideInlineCitationCarousel } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; index?: number; onindexchange?: (index: number) => void; }
  let { class: className = '', children, index = $bindable(0), onindexchange, onkeydown, ...rest }: Props = $props(); let ids = $state<string[]>([]);
  function goTo(next: number): void { const clamped = Math.min(Math.max(0, next), Math.max(0, ids.length - 1)); if (index === clamped) return; index = clamped; onindexchange?.(clamped); }
  function register(id: string): () => void { if (!ids.includes(id)) ids = [...ids, id]; return () => { const removedIndex = ids.indexOf(id); ids = ids.filter((item) => item !== id); if (index >= ids.length) goTo(Math.max(0, ids.length - 1)); else if (removedIndex >= 0 && removedIndex < index) goTo(index - 1); }; }
  provideInlineCitationCarousel({ get current() { return index; }, get count() { return ids.length; }, get canPrevious() { return index > 0; }, get canNext() { return index < ids.length - 1; }, register, indexOf: (id) => ids.indexOf(id), previous: () => goTo(index - 1), next: () => goTo(index + 1), goTo });
  function keydown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }): void { onkeydown?.(event); if (event.defaultPrevented) return; if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(index - 1); } else if (event.key === 'ArrowRight') { event.preventDefault(); goTo(index + 1); } }
</script>
<div {...rest} class={cn('w-full', className)} role="region" aria-roledescription="carousel" aria-label={rest['aria-label'] ?? 'Citation sources'} data-slot="inline-citation-carousel" onkeydown={keydown}>{@render children?.()}</div>
