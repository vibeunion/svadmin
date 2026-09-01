<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export interface ArtifactCloseProps extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'title'> {
    label?: string;
    size?: 'sm' | 'default' | 'icon' | 'icon-sm' | 'lg';
    variant?: 'default' | 'outline' | 'ghost';
    title?: string;
    class?: string;
    children?: Snippet;
  }
</script>

<script lang="ts">
  import { X } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  let {
    label = 'Close',
    size = 'sm',
    variant = 'ghost',
    title,
    class: className = '',
    children,
    type = 'button',
    ...rest
  }: ArtifactCloseProps = $props();
</script>

<button {...rest} {type} class={cn('svadmin-ai-artifact-part__icon-button', className)} aria-label={label} title={title ?? label} data-slot="artifact-close" data-size={size} data-variant={variant}>
  {#if children}{@render children()}{:else}<X size={16} aria-hidden="true" />{/if}
  <span class="svadmin-ai__sr-only">{label}</span>
</button>

<style>
  .svadmin-ai-artifact-part__icon-button { display: inline-flex; width: 2rem; height: 2rem; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: min(var(--radius, .5rem), .5rem); background: transparent; color: var(--muted-foreground, currentColor); cursor: pointer; }
  .svadmin-ai-artifact-part__icon-button[data-size='lg'] { width: 2.5rem; height: 2.5rem; }
  .svadmin-ai-artifact-part__icon-button[data-size='default'] { width: auto; padding-inline: .625rem; }
  .svadmin-ai-artifact-part__icon-button[data-variant='outline'] { border-color: var(--border, currentColor); }
  .svadmin-ai-artifact-part__icon-button[data-variant='default'] { border-color: var(--primary, currentColor); background: var(--primary, currentColor); color: var(--primary-foreground, Canvas); }
  .svadmin-ai-artifact-part__icon-button:hover:not(:disabled) { border-color: var(--border, currentColor); color: var(--foreground, currentColor); }
  .svadmin-ai-artifact-part__icon-button:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-artifact-part__icon-button:disabled { cursor: not-allowed; opacity: .5; }
</style>
