<script lang="ts">
  import { GitFork } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';

  export interface SankeyNode {
    id: string;
    label: string;
    value?: number | undefined;
  }

  export interface SankeyLink {
    source: string;
    target: string;
    value: number;
    color?: string | undefined;
  }

  export interface SankeyChartProps {
    nodes: SankeyNode[];
    links: SankeyLink[];
    title?: string | undefined;
    height?: number | undefined;
    class?: string | undefined;
    onSelectNode?: ((node: SankeyNode) => void) | undefined;
  }

  let {
    nodes = [],
    links = [],
    title,
    height = 300,
    class: className = '',
    onSelectNode,
  }: SankeyChartProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  const resolvedTitle = $derived(title ?? (chinese ? '业务路径流量桑基图' : 'Path Flow Sankey'));
</script>

<div
  data-svadmin-component="SankeyChart"
  class={cn(
    'w-full rounded-2xl border border-border bg-card text-card-foreground shadow-xs p-6 space-y-4',
    className,
  )}
>
  <div class="flex items-center justify-between border-b border-border/60 pb-3">
    <div class="flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info border border-info/20">
        <GitFork class="h-4 w-4" />
      </div>
      <div>
        <h3 class="text-sm font-semibold text-foreground">{resolvedTitle}</h3>
        <p class="text-xs text-muted-foreground">{chinese ? '多节点间流量来源与流向权重分布' : 'Flow distribution across nodes'}</p>
      </div>
    </div>
  </div>

  <!-- SVG Flow Diagram -->
  <div class="relative w-full overflow-x-auto" style="min-height: {height}px;">
    <div class="grid grid-cols-3 gap-6 h-full items-center py-4">
      <!-- Source Column -->
      <div class="space-y-3">
        <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{chinese ? '来源节点' : 'Sources'}</div>
        {#each nodes.slice(0, 3) as node (node.id)}
          <div
            role="button"
            tabindex="0"
            onclick={() => onSelectNode?.(node)}
            onkeydown={(e) => e.key === 'Enter' && onSelectNode?.(node)}
            class="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2.5 text-xs font-semibold hover:border-primary transition-colors cursor-pointer"
          >
            <span>{node.label}</span>
            <span class="font-mono text-muted-foreground">{node.value ?? ''}</span>
          </div>
        {/each}
      </div>

      <!-- Links Middle Indicator -->
      <div class="flex flex-col items-center justify-center space-y-2 text-xs text-muted-foreground">
        {#each links.slice(0, 4) as link (link.source + link.target)}
          <div class="w-full flex items-center justify-between bg-muted/20 border border-border/50 px-3 py-1.5 rounded text-[11px]">
            <span class="truncate max-w-20">{link.source}</span>
            <span class="font-mono text-primary font-bold">→ {link.value} →</span>
            <span class="truncate max-w-20">{link.target}</span>
          </div>
        {/each}
      </div>

      <!-- Target Column -->
      <div class="space-y-3">
        <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{chinese ? '目标节点' : 'Targets'}</div>
        {#each nodes.slice(3) as node (node.id)}
          <div
            role="button"
            tabindex="0"
            onclick={() => onSelectNode?.(node)}
            onkeydown={(e) => e.key === 'Enter' && onSelectNode?.(node)}
            class="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2.5 text-xs font-semibold hover:border-primary transition-colors cursor-pointer"
          >
            <span>{node.label}</span>
            <span class="font-mono text-muted-foreground">{node.value ?? ''}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
