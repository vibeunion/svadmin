<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { hierarchy, type HierarchyRectangularNode } from 'd3-hierarchy';
  import { Chart, Layer } from 'layerchart';
  import { Treemap } from 'layerchart/hierarchy';
  import type { TreemapNode } from './treemap.js';

  interface Props {
    data: TreemapNode;
    height?: number;
    width?: number;
    padding?: number;
    colors?: string[];
    format?: (value: number) => string;
    class?: string;
    onselect?: (node: TreemapNode) => void;
  }

  let {
    data,
    height = 280,
    width: initialWidth = 480,
    padding = 2,
    colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],
    format = (value: number) => value.toLocaleString(),
    class: className = '',
    onselect,
  }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let width = $state(untrack(() => initialWidth));

  const root = $derived(
    hierarchy<TreemapNode>(data)
      .sum((node) => node.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
  );

  function colorOf(node: HierarchyRectangularNode<TreemapNode>, index: number): string {
    return node.data.color ?? colors[index % colors.length] ?? 'var(--chart-1)';
  }

  onMount(() => {
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) width = entry.contentRect.width;
    });
    observer.observe(host);
    return () => observer.disconnect();
  });
</script>

<div bind:this={host} class={className} style={`width:100%;height:${height}px`}>
  <Chart {width} {height} padding={0} ssr={false}>
    <Layer>
      <Treemap hierarchy={root} {padding}>
        {#snippet children({ nodes })}
          {#each nodes as node, index (node.data.name)}
            {@const leaf = !node.children}
            {@const boxWidth = node.x1 - node.x0}
            {@const boxHeight = node.y1 - node.y0}
            {#if leaf && boxWidth > 1 && boxHeight > 1}
              <g
                role="button"
                tabindex="0"
                aria-label={`${node.data.name}: ${format(node.value ?? 0)}`}
                style="cursor:pointer"
                onclick={() => onselect?.(node.data)}
                onkeydown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onselect?.(node.data);
                  }
                }}
              >
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={Math.max(0, boxWidth)}
                  height={Math.max(0, boxHeight)}
                  rx="2"
                  fill={colorOf(node, index)}
                  fill-opacity="0.82"
                  stroke="var(--background)"
                  stroke-width="2"
                >
                  <title>{node.data.name}: {format(node.value ?? 0)}</title>
                </rect>
                {#if boxWidth > 64 && boxHeight > 28}
                  <text
                    x={node.x0 + 6}
                    y={node.y0 + 16}
                    fill="var(--primary-foreground)"
                    font-size="11"
                    font-weight="600"
                    pointer-events="none"
                  >
                    {node.data.name}
                  </text>
                  {#if boxHeight > 42}
                    <text
                      x={node.x0 + 6}
                      y={node.y0 + 30}
                      fill="var(--primary-foreground)"
                      fill-opacity="0.8"
                      font-size="10"
                      pointer-events="none"
                    >
                      {format(node.value ?? 0)}
                    </text>
                  {/if}
                {/if}
              </g>
            {/if}
          {/each}
        {/snippet}
      </Treemap>
    </Layer>
  </Chart>
</div>
