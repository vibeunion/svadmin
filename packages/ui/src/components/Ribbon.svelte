<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  export type RibbonPlacement = 'start' | 'end';

  export interface RibbonProps {
    /** Text or content snippet displayed in the ribbon */
    text?: string | Snippet;
    /** Preset color theme or custom CSS color string */
    color?: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'purple' | 'pink' | string;
    /** Placement position of ribbon on container */
    placement?: RibbonPlacement;
    /** Additional CSS classes for root container */
    class?: string;
    /** Additional CSS classes for ribbon badge */
    ribbonClass?: string;
    /** Wrapped child element or card */
    children?: Snippet;
  }

  let {
    text,
    color = 'primary',
    placement = 'end',
    class: className = '',
    ribbonClass = '',
    children,
  }: RibbonProps = $props();

  const isPresetColor = $derived(
    ['primary', 'success', 'warning', 'destructive', 'info', 'purple', 'pink'].includes(color),
  );

  const presetBgClasses: Record<string, string> = {
    primary: 'bg-primary text-primary-foreground',
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-500 text-white',
    destructive: 'bg-destructive text-destructive-foreground',
    info: 'bg-sky-500 text-white',
    purple: 'bg-violet-600 text-white',
    pink: 'bg-rose-500 text-white',
  };

  const presetCornerClasses: Record<string, string> = {
    primary: 'border-t-primary/80',
    success: 'border-t-emerald-800',
    warning: 'border-t-amber-700',
    destructive: 'border-t-destructive/80',
    info: 'border-t-sky-700',
    purple: 'border-t-violet-800',
    pink: 'border-t-rose-800',
  };
</script>

<div
  data-svadmin-component="Ribbon"
  class={cn('relative inline-block w-full', className)}
>
  {#if children}
    {@render children()}
  {/if}

  {#if text}
    <div
      data-placement={placement}
      class={cn(
        'absolute top-2 z-10 flex h-[22px] items-center px-2 text-[11px] font-semibold tracking-wide shadow-xs select-none',
        placement === 'end' ? '-right-2 rounded-l-[3px]' : '-left-2 rounded-r-[3px]',
        isPresetColor ? presetBgClasses[color] : 'text-white',
        ribbonClass,
      )}
      style={!isPresetColor ? `background-color: ${color};` : undefined}
    >
      {#if typeof text === 'string'}
        <span>{text}</span>
      {:else}
        {@render text()}
      {/if}

      <!-- Corner Fold Shadow Effect -->
      <span
        aria-hidden="true"
        class={cn(
          'absolute top-full border-[4px] border-transparent',
          placement === 'end'
            ? 'right-0 border-t-[4px] border-l-[4px] border-l-transparent'
            : 'left-0 border-t-[4px] border-r-[4px] border-r-transparent',
          isPresetColor ? presetCornerClasses[color] : '',
        )}
        style={!isPresetColor
          ? `border-top-color: color-mix(in srgb, ${color} 70%, black);`
          : undefined}
      ></span>
    </div>
  {/if}
</div>
