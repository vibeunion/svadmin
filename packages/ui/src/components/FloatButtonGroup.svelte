<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { Plus, X } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type FloatButtonPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  export type FloatButtonShape = 'circle' | 'square';

  export interface FloatButtonGroupProps {
    /** Trigger mode to open the button group */
    trigger?: 'click' | 'hover';
    /** Two-way bindable open state */
    open?: boolean;
    /** Default open state */
    defaultOpen?: boolean;
    /** Shape of the main button */
    shape?: FloatButtonShape;
    /** Screen corner position */
    position?: FloatButtonPosition;
    /** Primary button style */
    type?: 'default' | 'primary';
    /** Custom main icon snippet */
    icon?: Snippet;
    /** Custom close icon snippet */
    closeIcon?: Snippet;
    /** Tooltip hint */
    tooltip?: string;
    /** Accessible label */
    ariaLabel?: string;
    /** Additional CSS classes */
    class?: string;
    /** Child buttons slot */
    children?: Snippet;
    /** Callback when open state changes */
    onopenchange?: (open: boolean) => void;
  }

  let {
    trigger = 'click',
    defaultOpen = false,
    open = $bindable(defaultOpen),
    shape = 'circle',
    position = 'bottom-right',
    type = 'primary',
    icon,
    closeIcon,
    tooltip,
    ariaLabel = 'Floating Action Menu',
    class: className = '',
    children,
    onopenchange,
  }: FloatButtonGroupProps = $props();

  let containerEl: HTMLElement | null = $state(null);

  function setOpen(next: boolean) {
    if (open === next) return;
    open = next;
    onopenchange?.(next);
  }

  function toggle() {
    setOpen(!open);
  }

  function handleMouseEnter() {
    if (trigger === 'hover') {
      setOpen(true);
    }
  }

  function handleMouseLeave() {
    if (trigger === 'hover') {
      setOpen(false);
    }
  }

  onMount(() => {
    function handleClickOutside(event: MouseEvent) {
      if (trigger === 'click' && open && containerEl && !containerEl.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  });

  const positionClasses: Record<FloatButtonPosition, string> = {
    'bottom-right': 'bottom-6 right-6 flex-col-reverse',
    'bottom-left': 'bottom-6 left-6 flex-col-reverse',
    'top-right': 'top-6 right-6 flex-col',
    'top-left': 'top-6 left-6 flex-col',
  };
</script>

<div
  bind:this={containerEl}
  data-svadmin-component="FloatButtonGroup"
  data-position={position}
  data-open={open}
  class={cn(
    'fixed z-60 inline-flex items-center gap-2.5 transition-all select-none',
    positionClasses[position],
    className,
  )}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  role="region"
  aria-label={ariaLabel}
>
  <!-- Main Trigger Button -->
  <button
    type="button"
    onclick={trigger === 'click' ? toggle : undefined}
    aria-expanded={open}
    aria-label={ariaLabel}
    title={tooltip}
    class={cn(
      'relative flex h-11 w-11 items-center justify-center border shadow-md transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      shape === 'circle' ? 'rounded-full' : 'rounded-lg',
      type === 'primary'
        ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
        : 'border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground',
    )}
  >
    <div
      class={cn(
        'flex items-center justify-center transition-transform duration-200',
        open && 'rotate-90',
      )}
    >
      {#if open}
        {#if closeIcon}
          {@render closeIcon()}
        {:else}
          <X size={20} />
        {/if}
      {:else}
        {#if icon}
          {@render icon()}
        {:else}
          <Plus size={20} />
        {/if}
      {/if}
    </div>
  </button>

  <!-- Child Buttons List -->
  {#if open && children}
    <div
      class={cn(
        'flex items-center gap-2 transition-all animate-in fade-in-0 zoom-in-95 duration-150',
        position.startsWith('bottom') ? 'flex-col-reverse' : 'flex-col',
      )}
    >
      {@render children()}
    </div>
  {/if}
</div>
