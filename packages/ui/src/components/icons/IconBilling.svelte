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
  data-svadmin-component="IconBilling"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width={dimension}
  height={dimension}
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cn('svadmin-icon svadmin-icon-billing inline-block shrink-0', spin && 'animate-spin', className)}
  style={style}
  {...restProps}
>
  <rect x="2" y="4" width="20" height="16" rx="2" />
  <line x1="2" y1="10" x2="22" y2="10" />
  <line x1="6" y1="15" x2="10" y2="15" />
  <circle cx="17" cy="15" r="1.5" />
</svg>
