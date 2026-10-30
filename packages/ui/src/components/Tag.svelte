<script lang="ts">
  import type { Snippet } from 'svelte';
  import X from '@lucide/svelte/icons/x';
  import { cn } from '../utils.js';
  import { badgeVariants, type BadgeVariant } from './ui/badge/index.js';
  import { useComponentConfig } from './ConfigProvider.svelte';

  interface Props {
    variant?: BadgeVariant;
    size?: 'default' | 'compact';
    closable?: boolean;
    checkable?: boolean;
    checked?: boolean;
    disabled?: boolean;
    closeLabel?: string;
    class?: string;
    children?: Snippet;
    onclose?: (event: MouseEvent) => void;
    onchange?: (checked: boolean) => void;
  }

  let {
    variant = 'secondary',
    size: sizeProp,
    closable = false,
    checkable = false,
    checked = false,
    disabled = false,
    closeLabel = 'Remove tag',
    class: className,
    children,
    onclose,
    onchange,
  }: Props = $props();

  const config = useComponentConfig();
  const size = $derived(sizeProp ?? (config.density === 'compact' || config.componentSize === 'sm' ? 'compact' : 'default'));
  const resolvedVariant = $derived(checkable && checked && variant === 'secondary' ? 'default' : variant);

  function handleCheck(): void {
    if (disabled) return;
    onchange?.(!checked);
  }

  function handleClose(event: MouseEvent): void {
    if (disabled) return;
    onclose?.(event);
  }
</script>

<span
  class={cn(badgeVariants({ variant: resolvedVariant }), 'svadmin-tag', className)}
  class:is-disabled={disabled}
  data-slot="tag"
  data-size={size}
  data-checked={checkable ? String(checked) : undefined}
>
  {#if checkable}
    <button
      type="button"
      class="svadmin-tag__control"
      aria-pressed={checked}
      {disabled}
      onclick={handleCheck}
    >
      {@render children?.()}
    </button>
  {:else}
    <span class="svadmin-tag__label">{@render children?.()}</span>
  {/if}
  {#if closable}
    <button
      type="button"
      class="svadmin-tag__close"
      aria-label={closeLabel}
      {disabled}
      onclick={handleClose}
    >
      <X size={12} aria-hidden="true" />
    </button>
  {/if}
</span>

<style>
  .svadmin-tag { gap: 0.25rem; max-width: 100%; }
  .svadmin-tag.is-disabled { opacity: 0.55; }
  .svadmin-tag__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .svadmin-tag__control,
  .svadmin-tag__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: inherit;
    cursor: pointer;
  }
  .svadmin-tag__control {
    min-width: 0;
    padding: 0;
    text-align: start;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .svadmin-tag__control:focus-visible,
  .svadmin-tag__close:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
  .svadmin-tag__control:disabled,
  .svadmin-tag__close:disabled { cursor: not-allowed; }
  .svadmin-tag__close {
    flex: 0 0 auto;
    width: 1rem;
    height: 1rem;
    margin-inline-end: -0.25rem;
    border-radius: var(--radius-sm);
  }
  .svadmin-tag__close:hover:not(:disabled) { background: color-mix(in srgb, currentColor 14%, transparent); }
</style>
