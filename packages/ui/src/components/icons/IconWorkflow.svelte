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
  data-svadmin-component="IconWorkflow"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width={dimension}
  height={dimension}
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cn('svadmin-icon svadmin-icon-workflow inline-block shrink-0', spin && 'animate-spin', className)}
  style={style}
  {...restProps}
>
  <rect x="3" y="3" width="6" height="6" rx="1" />
  <rect x="15" y="3" width="6" height="6" rx="1" />
  <rect x="9" y="15" width="6" height="6" rx="1" />
  <path d="M6 9v3a3 3 0 0 0 3 3h3" />
  <path d="M18 9v3a3 3 0 0 1-3 3" />
</svg>
