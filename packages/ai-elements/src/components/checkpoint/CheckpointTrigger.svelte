<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export type CheckpointTriggerProps = Omit<HTMLButtonAttributes, 'class' | 'children' | 'size'> & {
    class?: string;
    tooltip?: string;
    variant?: 'outline' | 'default' | 'destructive' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

  let {
    class: className = '',
    tooltip,
    variant = 'ghost',
    size = 'sm',
    type = 'button',
    title,
    children,
    ...rest
  }: CheckpointTriggerProps = $props();
</script>

<button
  {...rest}
  {type}
  title={title ?? tooltip}
  class={cn('svadmin-ai svadmin-ai-checkpoint-trigger', className)}
  data-slot="checkpoint-trigger"
  data-variant={variant}
  data-size={size}
>
  {@render children?.()}
</button>

<style>
  .svadmin-ai-checkpoint-trigger {
    display: inline-flex;
    min-height: 2rem;
    flex: none;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: min(var(--radius, 0.5rem), 0.375rem);
    padding: 0.375rem 0.625rem;
    background: transparent;
    color: var(--muted-foreground, currentColor);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .svadmin-ai-checkpoint-trigger[data-variant='outline'] { border-color: var(--border, currentColor); }
  .svadmin-ai-checkpoint-trigger[data-variant='default'] { background: var(--primary, currentColor); color: var(--primary-foreground, Canvas); }
  .svadmin-ai-checkpoint-trigger[data-variant='secondary'] { background: var(--secondary, var(--muted, transparent)); color: var(--secondary-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-checkpoint-trigger[data-variant='destructive'] { background: var(--destructive, currentColor); color: var(--destructive-foreground, Canvas); }
  .svadmin-ai-checkpoint-trigger[data-variant='link'] { color: var(--primary, currentColor); text-decoration: underline; }
  .svadmin-ai-checkpoint-trigger[data-size='lg'] { min-height: 2.5rem; padding-inline: 0.875rem; }
  .svadmin-ai-checkpoint-trigger[data-size='icon'] { width: 2.25rem; padding: 0; }
  .svadmin-ai-checkpoint-trigger:hover:not(:disabled) { background: var(--secondary, var(--muted, transparent)); color: var(--foreground, currentColor); }
  .svadmin-ai-checkpoint-trigger:disabled { cursor: not-allowed; opacity: 0.5; }
  .svadmin-ai-checkpoint-trigger:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
