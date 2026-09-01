<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export type ModelSelectorContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'title'> & {
    title?: string;
    class?: string;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { X } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useModelSelectorContext } from './context.svelte.js';

  let { title = 'Model Selector', class: className = '', children, ...rest }: ModelSelectorContentProps = $props();
  const context = useModelSelectorContext('ModelSelectorContent');
  let element = $state<HTMLDivElement | null>(null);

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      context.setOpen(false);
      return;
    }
    if (event.key !== 'Tab' || !element) return;

    const focusable = [...element.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')];
    if (focusable.length === 0) {
      event.preventDefault();
      element.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  $effect(() => {
    context.setContentElement(element);
    return () => context.setContentElement(null);
  });
</script>

{#if context.open}
  <div class="svadmin-ai-model-selector-backdrop" data-slot="model-selector-backdrop" role="presentation" onpointerdown={(event) => { if (event.target === event.currentTarget) context.setOpen(false); }}>
    <div
      bind:this={element}
      {...rest}
      id={context.contentId}
      class={cn('svadmin-ai-model-selector-content', className)}
      data-slot="model-selector-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby={context.titleId}
      tabindex="-1"
      onkeydown={handleKeydown}
    >
      <h2 id={context.titleId} class="svadmin-ai__sr-only">{title}</h2>
      <button class="svadmin-ai-model-selector-content__close" type="button" aria-label="Close model selector" onclick={() => context.setOpen(false)}><X aria-hidden="true" /></button>
      {@render children?.()}
    </div>
  </div>
{/if}

<style>
  .svadmin-ai-model-selector-backdrop { position: fixed; z-index: 70; inset: 0; display: grid; place-items: center; padding: 1rem; background: color-mix(in oklch, var(--background, transparent) 62%, transparent); }
  .svadmin-ai-model-selector-content { position: relative; display: grid; width: min(32rem, 100%); max-height: min(34rem, calc(100vh - 2rem)); gap: .5rem; padding: .75rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--popover, var(--card, var(--background, transparent))); color: var(--popover-foreground, var(--foreground, currentColor)); box-shadow: 0 1rem 3rem color-mix(in oklch, var(--foreground, currentColor) 18%, transparent); }
  .svadmin-ai-model-selector-content__close { position: absolute; z-index: 1; top: .5rem; right: .5rem; display: inline-flex; width: 2rem; height: 2rem; align-items: center; justify-content: center; border: 0; border-radius: min(var(--radius, .5rem), .375rem); background: transparent; color: var(--muted-foreground, currentColor); cursor: pointer; }
  .svadmin-ai-model-selector-content__close:hover { background: var(--muted, transparent); color: var(--foreground, currentColor); }
  .svadmin-ai-model-selector-content__close:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-model-selector-content__close :global(svg) { width: 1rem; height: 1rem; }
</style>
