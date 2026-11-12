<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  export interface InputGroupProps {
    /** Leading addon rendered before the control (Arco `addBefore`). */
    addBefore?: string | Snippet | undefined;
    /** Trailing addon rendered after the control (Arco `addAfter`). */
    addAfter?: string | Snippet | undefined;
    size?: 'default' | 'compact' | undefined;
    invalid?: boolean | undefined;
    disabled?: boolean | undefined;
    class?: string | undefined;
    label?: string | undefined;
    children: Snippet;
  }

  let {
    addBefore,
    addAfter,
    size = 'default',
    invalid = false,
    disabled = false,
    class: className = '',
    label,
    children,
  }: InputGroupProps = $props();

  const hasBefore = $derived(addBefore !== undefined);
  const hasAfter = $derived(addAfter !== undefined);
</script>

<div
  class={cn('svadmin-input-group', className)}
  data-size={size}
  data-invalid={invalid ? 'true' : undefined}
  data-disabled={disabled ? 'true' : undefined}
  data-has-before={hasBefore ? 'true' : undefined}
  data-has-after={hasAfter ? 'true' : undefined}
  role="group"
  aria-label={label}
>
  {#if hasBefore}
    <span class="svadmin-input-group__addon svadmin-input-group__addon--before" aria-hidden="true">
      {#if typeof addBefore === 'string'}{addBefore}{:else}{@render addBefore()}{/if}
    </span>
  {/if}
  <span class="svadmin-input-group__control">
    {@render children()}
  </span>
  {#if hasAfter}
    <span class="svadmin-input-group__addon svadmin-input-group__addon--after" aria-hidden="true">
      {#if typeof addAfter === 'string'}{addAfter}{:else}{@render addAfter()}{/if}
    </span>
  {/if}
</div>

<style>
  .svadmin-input-group {
    display: flex;
    width: 100%;
    min-width: 0;
    align-items: stretch;
  }

  .svadmin-input-group__control {
    display: flex;
    flex: 1 1 auto;
    min-width: 0;
    align-items: center;
  }

  .svadmin-input-group__control :global(.svadmin-input) {
    width: 100%;
  }

  .svadmin-input-group__addon {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    padding: 0 0.75rem;
    border: 1px solid var(--border);
    background: var(--muted);
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-label, 0.8125rem);
    line-height: 1;
    white-space: nowrap;
    transition: border-color var(--svadmin-motion-fast, 120ms)
      var(--svadmin-motion-easing, cubic-bezier(0.4, 0, 0.2, 1));
  }

  .svadmin-input-group[data-size='compact'] .svadmin-input-group__addon {
    padding: 0 0.5rem;
    font-size: var(--svadmin-text-caption, 0.75rem);
  }

  .svadmin-input-group__addon--before {
    border-inline-end: 0;
    border-start-start-radius: var(--radius-sm, 0.25rem);
    border-end-start-radius: var(--radius-sm, 0.25rem);
  }

  .svadmin-input-group__addon--after {
    border-inline-start: 0;
    border-start-end-radius: var(--radius-sm, 0.25rem);
    border-end-end-radius: var(--radius-sm, 0.25rem);
  }

  .svadmin-input-group[data-has-before='true'] .svadmin-input-group__control :global(.svadmin-input) {
    border-start-start-radius: 0;
    border-end-start-radius: 0;
  }

  .svadmin-input-group[data-has-after='true'] .svadmin-input-group__control :global(.svadmin-input) {
    border-start-end-radius: 0;
    border-end-end-radius: 0;
  }

  .svadmin-input-group:focus-within .svadmin-input-group__addon {
    border-color: var(--ring);
    color: var(--foreground);
  }

  .svadmin-input-group[data-invalid='true'] .svadmin-input-group__addon {
    border-color: var(--destructive);
    color: var(--destructive);
  }

  .svadmin-input-group[data-disabled='true'] {
    opacity: 0.6;
  }
</style>