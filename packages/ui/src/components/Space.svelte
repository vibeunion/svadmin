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
    split?: Snippet;
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
    split,
    class: className = '',
    children,
  }: Props = $props();

  let root = $state<HTMLDivElement | null>(null);
  let splitSource = $state<HTMLSpanElement | null>(null);

  // A snippet is one block, so clone the rendered separator between child elements.
  $effect(() => {
    const host = root;
    const source = split ? splitSource : null;
    if (!host) return;
    for (const node of [...host.querySelectorAll(':scope > .svadmin-space__split')]) node.remove();
    if (!source) return;
    const items = [...host.children].filter((child) => !child.classList.contains('svadmin-space__split'));
    for (let index = items.length - 1; index > 0; index -= 1) {
      const clone = source.cloneNode(true);
      if (!(clone instanceof HTMLElement)) continue;
      clone.hidden = false;
      clone.classList.remove('svadmin-space__split-source');
      clone.classList.add('svadmin-space__split');
      items[index]?.before(clone);
    }
  });

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
  bind:this={root}
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
{#if split}
  <span class="svadmin-space__split-source" hidden bind:this={splitSource}>{@render split()}</span>
{/if}

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
