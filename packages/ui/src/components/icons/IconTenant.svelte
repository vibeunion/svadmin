<script lang="ts">
  import type { IconProps } from './types.js';
  import { cn } from '../../utils.js';

  let {
    size = 16,
    color = 'currentColor',
    strokeWidth = 2,
    spin = false,
    class: className = '',
    style = '',
    ...restProps
  }: IconProps = $props();

  const dimension = $derived(typeof size === 'number' ? `${size}px` : size);
</script>

<svg
  data-svadmin-component="IconTenant"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width={dimension}
  height={dimension}
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cn('svadmin-icon svadmin-icon-tenant inline-block shrink-0', spin && 'animate-spin', className)}
  style={style}
  {...restProps}
>
  <path d="M3 21h18" />
  <path d="M5 21V7l8-4v18" />
  <path d="M19 21V11l-6-3" />
  <line x1="9" y1="9" x2="9" y2="9.01" />
  <line x1="9" y1="13" x2="9" y2="13.01" />
  <line x1="9" y1="17" x2="9" y2="17.01" />
</svg>
