<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import {
    forceCenter,
    forceCollide,
    forceLink,
    forceManyBody,
    forceSimulation,
    type SimulationLinkDatum,
    type SimulationNodeDatum,
  } from 'd3-force';
  import type { GraphData, GraphLink, GraphNode } from './graph.js';

  interface Props {
    data: GraphData;
    height?: number;
    width?: number;
    linkDistance?: number;
    charge?: number;
    format?: (value: number) => string;
    class?: string;
    onselect?: (node: GraphNode) => void;
  }

  interface LayoutNode extends GraphNode, SimulationNodeDatum {
    radius: number;
  }

  interface LayoutLink extends SimulationLinkDatum<LayoutNode> {
    source: LayoutNode | string | number;
    target: LayoutNode | string | number;
    value?: number;
  }

  let {
    data,
    height = 300,
    width: initialWidth = 520,
    linkDistance = 90,
    charge = -220,
    format = (value: number) => value.toLocaleString(),
    class: className = '',
    onselect,
  }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let width = $state(untrack(() => initialWidth));
  const palette = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'] as const;

  const layout = $derived.by(() => {
    const nodes: LayoutNode[] = data.nodes.map((node, index) => ({
      ...node,
      radius: 8 + Math.min(10, Math.sqrt(Math.max(0, node.value ?? 1))),
      x: width / 2 + Math.cos((index / Math.max(data.nodes.length, 1)) * Math.PI * 2) * 80,
      y: height / 2 + Math.sin((index / Math.max(data.nodes.length, 1)) * Math.PI * 2) * 80,
    }));
    const links: LayoutLink[] = data.links.map((link: GraphLink) => ({
      ...link,
      source: link.source,
      target: link.target,
    }));

    const simulation = forceSimulation<LayoutNode>(nodes)
      .force('link', forceLink<LayoutNode, LayoutLink>(links).id((node) => node.id).distance(linkDistance).strength(0.8))
      .force('charge', forceManyBody().strength(charge))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<LayoutNode>().radius((node) => node.radius + 6))
      .stop();

    for (let step = 0; step < 160; step += 1) simulation.tick();
    for (const node of nodes) {
      node.x = Math.max(node.radius + 12, Math.min(width - node.radius - 12, node.x ?? width / 2));
      node.y = Math.max(node.radius + 12, Math.min(height - node.radius - 12, node.y ?? height / 2));
    }
    return { nodes, links };
  });

  function groupColor(node: GraphNode, index: number): string {
    if (node.color) return node.color;
    if (!node.group) return palette[index % palette.length] ?? palette[0];
    const groups = [...new Set(data.nodes.map((item) => item.group).filter(Boolean))];
    return palette[groups.indexOf(node.group) % palette.length] ?? palette[0];
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
  {#if layout.nodes.length === 0}
    <p class="svadmin-chart-empty">No data</p>
  {:else}
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Network graph">
      {#each layout.links as link, index (index)}
        {@const source = typeof link.source === 'object' ? link.source : null}
        {@const target = typeof link.target === 'object' ? link.target : null}
        {#if source && target}
          <line
            x1={source.x ?? 0}
            y1={source.y ?? 0}
            x2={target.x ?? 0}
            y2={target.y ?? 0}
            stroke="var(--border)"
            stroke-width={link.value ? Math.min(4, 1 + link.value / 20) : 1.25}
            stroke-opacity="0.75"
          >
            <title>{source.label ?? source.id} → {target.label ?? target.id}{link.value ? `: ${format(link.value)}` : ''}</title>
          </line>
        {/if}
      {/each}
      {#each layout.nodes as node, index (node.id)}
        {@const color = groupColor(node, index)}
        <g
          role="button"
          tabindex="0"
          aria-label={`${node.label ?? node.id}${node.value ? `: ${format(node.value)}` : ''}`}
          style="cursor:pointer"
          onclick={() => onselect?.(node)}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onselect?.(node);
            }
          }}
        >
          <circle cx={node.x ?? 0} cy={node.y ?? 0} r={node.radius} fill={color} fill-opacity="0.85" stroke="var(--background)" stroke-width="2">
            <title>{node.label ?? node.id}{node.value ? `: ${format(node.value)}` : ''}</title>
          </circle>
          <text
            x={node.x ?? 0}
            y={(node.y ?? 0) + node.radius + 12}
            text-anchor="middle"
            fill="var(--foreground)"
            font-size="10"
            pointer-events="none"
          >
            {node.label ?? node.id}
          </text>
        </g>
      {/each}
    </svg>
  {/if}
</div>

<style>
  .svadmin-chart-empty { margin: 0; padding: 3rem 1rem; color: var(--muted-foreground); font-size: 0.875rem; text-align: center; }
</style>
