<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export type ConfirmationActionProps = Omit<HTMLButtonAttributes, 'children' | 'class'> & {
    class?: string;
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

  let { class: className = '', variant = 'default', type = 'button', children, ...rest }: ConfirmationActionProps = $props();
</script>

<button {...rest} {type} class={cn('svadmin-ai-confirmation-action', className)} data-slot="confirmation-action" data-variant={variant}>
  {@render children?.()}
</button>

<style>
  .svadmin-ai-confirmation-action { display: inline-flex; min-height: 2rem; align-items: center; justify-content: center; gap: 0.375rem; border: 1px solid transparent; border-radius: min(var(--radius, 0.5rem), 0.375rem); padding: 0.375rem 0.75rem; background: var(--primary, currentColor); color: var(--primary-foreground, Canvas); font: inherit; font-size: 0.8125rem; cursor: pointer; }
  .svadmin-ai-confirmation-action[data-variant='outline'] { border-color: var(--border, currentColor); background: transparent; color: var(--foreground, currentColor); }
  .svadmin-ai-confirmation-action[data-variant='ghost'] { background: transparent; color: var(--foreground, currentColor); }
  .svadmin-ai-confirmation-action[data-variant='destructive'] { background: var(--destructive, currentColor); color: var(--destructive-foreground, Canvas); }
  .svadmin-ai-confirmation-action:hover:not(:disabled) { opacity: 0.88; }
  .svadmin-ai-confirmation-action:disabled { cursor: not-allowed; opacity: 0.5; }
  .svadmin-ai-confirmation-action:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
