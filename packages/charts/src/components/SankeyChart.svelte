<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { Chart, Layer } from 'layerchart';
  import { Sankey } from 'layerchart/graph';
  import type { SankeyData, SankeyNode as SankeyNodeInput } from './sankey.js';

  interface Props {
    data: SankeyData;
    height?: number;
    width?: number;
    nodeWidth?: number;
    nodePadding?: number;
    format?: (value: number) => string;
    class?: string;
  }

  let {
    data,
    height = 280,
    width: initialWidth = 480,
    nodeWidth = 8,
    nodePadding = 12,
    format = (value: number) => value.toLocaleString(),
    class: className = '',
  }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let width = $state(untrack(() => initialWidth));

  interface PositionedNode extends SankeyNodeInput {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    value: number;
  }

  interface PositionedLink {
    index: number;
    value: number;
    width: number;
    color?: string;
    source: PositionedNode;
    target: PositionedNode;
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
  <Chart data={data} {width} {height} padding={{ top: 8, right: 8, bottom: 8, left: 8 }} ssr={false}>
    <Layer>
      <Sankey nodeId={(node: SankeyNodeInput) => node.id} {nodeWidth} {nodePadding}>
        {#snippet children({ nodes, links })}
          {#each links as rawLink, linkIndex (linkIndex)}
            {@const link = rawLink as unknown as PositionedLink}
            {@const curve = (link.source.x1 + link.target.x0) / 2}
            <path
              d={`M ${link.source.x1},${link.source.y0 + link.width / 2} C ${curve},${link.source.y0 + link.width / 2} ${curve},${link.target.y0 + link.width / 2} ${link.target.x0},${link.target.y0 + link.width / 2}`}
              fill="none"
              stroke={link.color ?? 'var(--chart-2)'}
              stroke-opacity="0.35"
              stroke-width={Math.max(1, link.width)}
            >
              <title>{link.source.label ?? link.source.id} → {link.target.label ?? link.target.id}: {format(link.value)}</title>
            </path>
          {/each}
          {#each nodes as rawNode, nodeIndex (nodeIndex)}
            {@const node = rawNode as unknown as PositionedNode}
            <g>
              <rect
                x={node.x0}
                y={node.y0}
                width={Math.max(1, node.x1 - node.x0)}
                height={Math.max(1, node.y1 - node.y0)}
                rx="2"
                fill={node.color ?? 'var(--chart-1)'}
              >
                <title>{node.label ?? node.id}: {format(node.value)}</title>
              </rect>
              <text
                x={node.x1 + 6}
                y={(node.y0 + node.y1) / 2}
                dominant-baseline="middle"
                fill="var(--foreground)"
                font-size="11"
              >
                {node.label ?? node.id}
              </text>
            </g>
          {/each}
        {/snippet}
      </Sankey>
    </Layer>
  </Chart>
</div>
