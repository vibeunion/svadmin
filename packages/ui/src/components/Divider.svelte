<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  export interface DividerProps {
    /** Direction of the divider */
    type?: 'horizontal' | 'vertical';
    /** Alignment of the text title inside the horizontal divider */
    orientation?: 'left' | 'center' | 'right';
    /** Whether the divider line is dashed */
    dashed?: boolean;
    /** Whether to use plain style text without extra bolding */
    plain?: boolean;
    /** Custom CSS class names */
    class?: string;
    /** Slot for divider text/content */
    children?: Snippet;
    [key: string]: unknown;
  }

  let {
    type = 'horizontal',
    orientation = 'center',
    dashed = false,
    plain = true,
    class: className = '',
    children,
    ...restProps
  }: DividerProps = $props();
</script>

{#if type === 'vertical'}
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
    {...restProps}
  >
    <span
      class={cn(
        'border-t border-border',
        dashed && 'border-dashed',
        orientation === 'left' ? 'w-6' : orientation === 'right' ? 'flex-1' : 'flex-1'
      )}
    ></span>
    <span class="px-3 whitespace-nowrap">
      {@render children()}
    </span>
    <span
      class={cn(
        'border-t border-border',
        dashed && 'border-dashed',
        orientation === 'left' ? 'flex-1' : orientation === 'right' ? 'w-6' : 'flex-1'
      )}
    ></span>
  </div>
{/if}
