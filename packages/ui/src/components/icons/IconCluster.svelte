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
  data-svadmin-component="IconCluster"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width={dimension}
  height={dimension}
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cn('svadmin-icon svadmin-icon-cluster inline-block shrink-0', spin && 'animate-spin', className)}
  style={style}
  {...restProps}
>
  <rect x="2" y="2" width="8" height="8" rx="2" />
  <rect x="14" y="2" width="8" height="8" rx="2" />
  <rect x="2" y="14" width="8" height="8" rx="2" />
  <rect x="14" y="14" width="8" height="8" rx="2" />
  <line x1="6" y1="10" x2="6" y2="14" />
  <line x1="18" y1="10" x2="18" y2="14" />
  <line x1="10" y1="6" x2="14" y2="6" />
  <line x1="10" y1="18" x2="14" y2="18" />
</svg>
