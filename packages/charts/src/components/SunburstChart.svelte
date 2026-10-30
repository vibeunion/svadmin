<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { hierarchy, partition, type HierarchyRectangularNode } from 'd3-hierarchy';
  import type { SunburstNode } from './sunburst.js';

  interface Props {
    data: SunburstNode;
    height?: number;
    width?: number;
    maxDepth?: number;
    format?: (value: number) => string;
    class?: string;
    onselect?: (node: SunburstNode) => void;
  }

  let {
    data,
    height = 280,
    width: initialWidth = 480,
    maxDepth = 3,
    format = (value: number) => value.toLocaleString(),
    class: className = '',
    onselect,
  }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let width = $state(untrack(() => initialWidth));
  const size = $derived(Math.min(width, height));
  const radius = $derived(size / 2 - 8);
  const palette = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

  const root = $derived.by(() => {
    const next = hierarchy<SunburstNode>(data)
      .sum((node) => node.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return partition<SunburstNode>().size([Math.PI * 2, radius])(next);
  });

  const nodes = $derived(
    root.descendants().filter((node) => node.depth > 0 && node.depth <= maxDepth && node.y1 - node.y0 > 0.5),
  );

  function polar(angle: number, length: number) {
    const normalized = angle - Math.PI / 2;
    return { x: size / 2 + Math.cos(normalized) * length, y: size / 2 + Math.sin(normalized) * length };
  }

  function arc(node: HierarchyRectangularNode<SunburstNode>): string {
    const start = node.x0;
    const end = node.x1;
    const inner = node.y0;
    const outer = node.y1;
    const p1 = polar(start, inner);
    const p2 = polar(start, outer);
    const p3 = polar(end, outer);
    const p4 = polar(end, inner);
    const large = end - start > Math.PI ? 1 : 0;
    return [
      `M ${p1.x} ${p1.y}`,
      `L ${p2.x} ${p2.y}`,
      `A ${outer} ${outer} 0 ${large} 1 ${p3.x} ${p3.y}`,
      `L ${p4.x} ${p4.y}`,
      `A ${inner} ${inner} 0 ${large} 0 ${p1.x} ${p1.y}`,
      'Z',
    ].join(' ');
  }

  function colorOf(node: HierarchyRectangularNode<SunburstNode>): string {
    let current: HierarchyRectangularNode<SunburstNode> | null = node;
    while (current.parent && current.parent.depth > 0) current = current.parent as HierarchyRectangularNode<SunburstNode>;
    const index = current.parent?.children?.indexOf(current) ?? 0;
    return node.data.color ?? palette[Math.max(0, index) % palette.length] ?? palette[0]!;
  }

  function activate(node: SunburstNode) {
    onselect?.(node);
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
  {#if root.value === 0}
    <p class="svadmin-chart-empty">No data</p>
  {:else}
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height={height} role="img" aria-label="Sunburst chart">
      {#each nodes as node (node.data.name + node.depth)}
        {@const mid = (node.x0 + node.x1) / 2}
        {@const labelPoint = polar(mid, (node.y0 + node.y1) / 2)}
        <path
          d={arc(node)}
          fill={colorOf(node)}
          fill-opacity={0.85 - node.depth * 0.08}
          stroke="var(--background)"
          stroke-width="1"
          role="button"
          tabindex="0"
          aria-label={`${node.data.name}: ${format(node.value ?? 0)}`}
          style="cursor:pointer"
          onclick={() => activate(node.data)}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              activate(node.data);
            }
          }}
        >
          <title>{node.data.name}: {format(node.value ?? 0)}</title>
        </path>
        {#if node.x1 - node.x0 > 0.22 && node.y1 - node.y0 > 22}
          <text
            x={labelPoint.x}
            y={labelPoint.y}
            text-anchor="middle"
            dominant-baseline="middle"
            fill="var(--background)"
            font-size={node.depth === 1 ? 11 : 9}
            font-weight="600"
            pointer-events="none"
          >
            {node.data.name}
          </text>
        {/if}
      {/each}
      <text x={size / 2} y={size / 2 - 4} text-anchor="middle" fill="var(--foreground)" font-size="14" font-weight="700">
        {root.data.name}
      </text>
      <text x={size / 2} y={size / 2 + 12} text-anchor="middle" fill="var(--muted-foreground)" font-size="10">
        {format(root.value ?? 0)}
      </text>
    </svg>
  {/if}
</div>

<style>
  .svadmin-chart-empty { margin: 0; padding: 3rem 1rem; color: var(--muted-foreground); font-size: 0.875rem; text-align: center; }
</style>
