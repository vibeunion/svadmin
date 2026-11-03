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
  data-svadmin-component="IconSeal"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width={dimension}
  height={dimension}
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cn('svadmin-icon svadmin-icon-seal inline-block shrink-0', spin && 'animate-spin', className)}
  style={style}
  {...restProps}
>
  <circle cx="12" cy="12" r="9" />
  <circle cx="12" cy="12" r="5" stroke-dasharray="2 2" />
  <polygon points="12 9 13 11 15.5 11 13.5 12.5 14.5 15 12 13.5 9.5 15 10.5 12.5 8.5 11 11 11" fill={color} stroke="none" />
</svg>
