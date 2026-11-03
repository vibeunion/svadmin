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
  data-svadmin-component="IconReject"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width={dimension}
  height={dimension}
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cn('svadmin-icon svadmin-icon-reject inline-block shrink-0', spin && 'animate-spin', className)}
  style={style}
  {...restProps}
>
  <circle cx="12" cy="12" r="10" />
  <line x1="15" y1="9" x2="9" y2="15" />
  <line x1="9" y1="9" x2="15" y2="15" />
</svg>
