<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  export interface DividerProps {
    /** Direction of the divider */
    type?: 'horizontal' | 'vertical';
    /** Direction of the divider (orientation alias) */
    direction?: 'horizontal' | 'vertical';
    /** Alignment of the text title inside the horizontal divider */
    orientation?: 'left' | 'center' | 'right';
    /** Margin between text and closest edge when orientation is left/right */
    orientationMargin?: number | string;
    /** Whether the divider line is dashed */
    dashed?: boolean;
    /** Whether to use plain style text without extra bolding */
    plain?: boolean;
    /** Custom CSS class names */
    class?: string;
    /** Custom inline styles */
    style?: string;
    /** Slot for divider text/content */
    children?: Snippet;
    [key: string]: unknown;
  }

  let {
    type,
    direction,
    orientation = 'center',
    orientationMargin,
    dashed = false,
    plain = true,
    class: className = '',
    style,
    children,
    ...restProps
  }: DividerProps = $props();

  const resolvedType = $derived(type ?? direction ?? 'horizontal');
  const marginStyle = $derived(
    orientationMargin !== undefined
      ? typeof orientationMargin === 'number'
        ? `${orientationMargin}px`
        : String(orientationMargin)
      : undefined
  );
</script>

{#if resolvedType === 'vertical'}
  <span
    role="separator"
    aria-orientation="vertical"
    data-svadmin-component="Divider"
    data-svadmin-type="vertical"
    class={cn(
      'inline-block h-3.5 w-[1px] mx-2 align-middle bg-border',
      dashed && 'border-l border-dashed border-border bg-transparent',
      className
    )}
    {style}
    {...restProps}
  ></span>
{:else if !children}
  <hr
    aria-orientation="horizontal"
    data-svadmin-component="Divider"
    data-svadmin-type="horizontal"
    class={cn(
      'my-4 w-full border-0 border-t border-border',
      dashed && 'border-dashed',
      className
    )}
    {style}
    {...restProps}
  />
{:else}
  <div
    role="separator"
    aria-orientation="horizontal"
    data-svadmin-component="Divider"
    data-svadmin-type="horizontal"
    data-orientation={orientation}
    class={cn(
      'my-4 flex items-center w-full text-xs text-muted-foreground',
      plain ? 'font-normal' : 'font-semibold text-foreground',
      className
    )}
    {style}
    {...restProps}
  >
    <span
      class={cn(
        'border-t border-border',
        dashed && 'border-dashed',
        orientation === 'left' ? (marginStyle ? '' : 'w-6') : 'flex-1'
      )}
      style={orientation === 'left' && marginStyle ? `width: ${marginStyle}` : undefined}
    ></span>
    <span class="px-3 whitespace-nowrap">
      {@render children()}
    </span>
    <span
      class={cn(
        'border-t border-border',
        dashed && 'border-dashed',
        orientation === 'right' ? (marginStyle ? '' : 'w-6') : 'flex-1'
      )}
      style={orientation === 'right' && marginStyle ? `width: ${marginStyle}` : undefined}
    ></span>
  </div>
{/if}
