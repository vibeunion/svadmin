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
    success: 'bg-primary text-primary-foreground',
    warning: 'bg-accent text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    info: 'bg-secondary text-secondary-foreground',
    purple: 'bg-chart-4 text-primary-foreground',
    pink: 'bg-chart-5 text-primary-foreground',
  };

  const presetCornerClasses: Record<string, string> = {
    primary: 'border-t-primary/80',
    success: 'border-t-primary/70',
    warning: 'border-t-accent/80',
    destructive: 'border-t-destructive/80',
    info: 'border-t-secondary/80',
    purple: 'border-t-chart-4/80',
    pink: 'border-t-chart-5/80',
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
