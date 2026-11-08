<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import { cn } from '../utils.js';

  export interface CheckCardProps {
    /** Whether the card is selected */
    checked?: boolean;
    /** Default checked state for uncontrolled usage */
    defaultChecked?: boolean;
    /** Title of the card */
    title?: string;
    /** Description or secondary text */
    description?: string;
    /** Disabled state */
    disabled?: boolean;
    /** Loading state */
    loading?: boolean;
    /** Card size */
    size?: 'default' | 'small';
    /** Custom icon or avatar snippet */
    avatar?: Snippet;
    /** Extra content in the header */
    extra?: Snippet;
    /** Card body content */
    children?: Snippet;
    /** Callback when checked state changes */
    onchange?: (checked: boolean) => void;
    /** Additional CSS classes */
    class?: string;
    [key: string]: unknown;
  }

  let {
    checked,
    defaultChecked = false,
    title,
    description,
    disabled = false,
    loading = false,
    size = 'default',
    avatar,
    extra,
    children,
    onchange,
    class: className = '',
    ...restProps
  }: CheckCardProps = $props();

  let internalChecked = $state(untrack(() => defaultChecked));
  const isChecked = $derived(checked !== undefined ? checked : internalChecked);

  function handleClick() {
    if (disabled || loading) return;
    const next = !isChecked;
    if (checked === undefined) {
      internalChecked = next;
    }
    onchange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (disabled || loading) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleClick();
    }
  }
</script>

<div
  role="checkbox"
  aria-checked={isChecked}
  aria-disabled={disabled}
  tabindex={disabled ? -1 : 0}
  onclick={handleClick}
  onkeydown={handleKeyDown}
  data-svadmin-component="CheckCard"
  class={cn(
    'svadmin-check-card relative flex flex-col justify-between border transition-all select-none cursor-pointer rounded-[4px] bg-card text-card-foreground',
    size === 'small' ? 'p-3 text-xs min-w-[140px]' : 'p-4 text-sm min-w-[180px]',
    isChecked
      ? 'border-primary bg-primary/5 shadow-sm'
      : 'border-border hover:border-primary/50 hover:bg-muted/30',
    disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-card',
    className
  )}
  {...restProps}
>
  <!-- Active Checkmark Ribbon in Top-Right Corner (Arco style) -->
  {#if isChecked}
    <div
      class="absolute top-0 right-0 w-0 h-0 border-t-[22px] border-l-[22px] border-t-primary border-l-transparent rounded-tr-[3px]"
      aria-hidden="true"
    >
      <svg
        class="absolute -top-[21px] -left-[11px] w-2.5 h-2.5 text-primary-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="3.5"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  {/if}

  <!-- Header: Avatar + Title + Extra -->
  {#if title || avatar || extra}
    <div class="flex items-start justify-between gap-2.5 mb-1.5">
      <div class="flex items-center gap-2.5 min-w-0">
        {#if avatar}
          <div class="shrink-0 flex items-center justify-center">
            {@render avatar()}
          </div>
        {/if}
        {#if title}
          <span class="font-semibold text-foreground truncate leading-snug">
            {title}
          </span>
        {/if}
      </div>
      {#if extra}
        <div class="shrink-0 text-muted-foreground text-xs">
          {@render extra()}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Description -->
  {#if description}
    <p class="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-0.5">
      {description}
    </p>
  {/if}

  <!-- Body Content -->
  {#if children}
    <div class="mt-2 text-xs text-foreground/90">
      {@render children()}
    </div>
  {/if}
</div>
