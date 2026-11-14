<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  /**
   * 官方间距：mini / small / medium / large = 4 / 8 / 16 / 24。
   * xs / sm / lg / xl 保留。lg 仍是 16px，不改成官方 large 的 24px。
   * 12px 的 md 已删除。
   */
  type SpaceSize = 'xs' | 'sm' | 'lg' | 'xl' | 'mini' | 'small' | 'medium' | 'large' | number;

  interface Props {
    direction?: 'horizontal' | 'vertical';
    size?: SpaceSize;
    align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    wrap?: boolean;
    inline?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    direction = 'horizontal',
    size = 'sm',
    align = 'center',
    justify = 'start',
    wrap = false,
    inline = false,
    class: className = '',
    children,
  }: Props = $props();

  const spaceStep: Record<Exclude<SpaceSize, number>, string> = {
    xs: '1',
    mini: '1',
    sm: '2',
    small: '2',
    lg: '4',
    medium: '4',
    xl: '5',
    large: '5',
  };
  const gap = $derived(typeof size === 'number' ? `${size}px` : `var(--svadmin-space-${spaceStep[size]})`);
  const alignMap = { start: 'flex-start', center: 'center', end: 'flex-end', baseline: 'baseline', stretch: 'stretch' } as const;
  const justifyMap = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around', evenly: 'space-evenly' } as const;
</script>

<div
  class={cn('svadmin-space', className)}
  data-direction={direction}
  data-size={typeof size === 'number' ? undefined : size}
  data-inline={inline ? 'true' : 'false'}
  style:--svadmin-space-gap={gap}
  style:align-items={alignMap[align]}
  style:justify-content={justifyMap[justify]}
  style:flex-wrap={wrap ? 'wrap' : 'nowrap'}
>
  {@render children?.()}
</div>

<style>
  .svadmin-space {
    display: flex;
    min-width: 0;
    gap: var(--svadmin-space-gap);
  }
  .svadmin-space[data-direction='vertical'] {
    flex-direction: column;
  }
  .svadmin-space[data-inline='true'] {
    display: inline-flex;
  }
</style>
