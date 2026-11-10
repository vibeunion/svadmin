<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronDown, ChevronRight, User, Building, Users } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface OrgNode {
    id: string | number;
    name: string;
    title?: string | undefined;
    department?: string | undefined;
    avatar?: string | undefined;
    children?: OrgNode[] | undefined;
    collapsed?: boolean | undefined;
    [key: string]: unknown;
  }

  export interface OrgChartProps {
    /** Root organization node or list of root nodes */
    data: OrgNode | OrgNode[];
    /** Orientation: 'vertical' (top-to-bottom) or 'horizontal' (left-to-right) */
    direction?: 'vertical' | 'horizontal' | undefined;
    /** Extra classes */
    class?: string | undefined;
    /** Node click event callback */
    onnodeclick?: ((node: OrgNode) => void) | undefined;
    /** Custom node content slot */
    children?: Snippet<[OrgNode]> | undefined;
  }

  let {
    data,
    direction = 'vertical',
    class: className = '',
    onnodeclick,
    children,
  }: OrgChartProps = $props();

  const roots = $derived(Array.isArray(data) ? data : [data]);

  // 管理折叠节点 ID 集合
  let collapsedIds = $state<Set<string | number>>(new Set());

  function toggleCollapse(id: string | number, e: MouseEvent) {
    e.stopPropagation();
    const next = new Set(collapsedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    collapsedIds = next;
  }
</script>

<div
  data-svadmin-component="OrgChart"
  class={cn('w-full overflow-auto p-6 text-xs font-sans', className)}
>
  <div class="inline-flex justify-center min-w-full">
    {#each roots as root (root.id)}
      {@render renderNode(root)}
    {/each}
  </div>
</div>

{#snippet renderNode(node: OrgNode)}
  {@const hasChildren = Boolean(node.children && node.children.length > 0)}
  {@const isCollapsed = collapsedIds.has(node.id) || Boolean(node.collapsed && !collapsedIds.has(node.id))}
  {@const childCount = node.children?.length ?? 0}

  <div class="flex flex-col items-center">
    <!-- Node Card -->
    <div
      role="button"
      tabindex="0"
      class={cn(
        'group relative flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-all cursor-pointer',
        'hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 select-none min-w-[200px] max-w-[260px]'
      )}
      onclick={() => onnodeclick?.(node)}
      onkeydown={(e) => { if (e.key === 'Enter') onnodeclick?.(node); }}
    >
      {#if children}
        {@render children(node)}
      {:else}
        <!-- Avatar / Icon -->
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 overflow-hidden font-bold">
          {#if node.avatar}
            <img src={node.avatar} alt={node.name} class="h-full w-full object-cover" />
          {:else}
            <User class="h-5 w-5" />
          {/if}
        </div>

        <!-- Info Strip -->
        <div class="flex-1 overflow-hidden space-y-0.5">
          <div class="flex items-center justify-between gap-1">
            <span class="font-semibold text-foreground text-sm truncate">{node.name}</span>
          </div>

          {#if node.title}
            <div class="text-xs text-muted-foreground truncate">{node.title}</div>
          {/if}

          {#if node.department}
            <div class="inline-flex items-center gap-1 rounded bg-muted/60 text-muted-foreground px-1.5 py-0.2 text-[10px] font-medium">
              <Building class="h-2.5 w-2.5" />
              <span class="truncate">{node.department}</span>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Collapse / Expand Badge Trigger -->
      {#if hasChildren}
        <button
          type="button"
          class={cn(
            'absolute -bottom-3 left-1/2 -translate-x-1/2 flex h-5.5 px-1.5 items-center justify-center gap-0.5 rounded-full border border-border bg-background text-[10px] font-medium text-muted-foreground shadow-xs transition-transform hover:scale-105 hover:text-foreground',
            isCollapsed && 'border-primary/40 bg-primary/10 text-primary font-bold'
          )}
          onclick={(e) => toggleCollapse(node.id, e)}
          title={isCollapsed ? `Expand ${childCount} reports` : 'Collapse'}
        >
          {#if isCollapsed}
            <Users class="h-2.5 w-2.5" />
            <span>+{childCount}</span>
          {:else}
            <ChevronDown class="h-3 w-3" />
          {/if}
        </button>
      {/if}
    </div>

    <!-- Tree Connection Bus & Children Branches -->
    {#if hasChildren && !isCollapsed && node.children}
      <!-- Vertical Stem from parent -->
      <div class="h-6 w-px bg-border/80"></div>

      <!-- Children Branch Container -->
      <div class="flex relative pt-4">
        {#each node.children as child, index (child.id)}
          {@const isFirst = index === 0}
          {@const isLast = index === node.children.length - 1}
          {@const isOnly = node.children.length === 1}

          <div class="flex flex-col items-center px-3 relative">
            <!-- Horizontal Connector Line -->
            {#if !isOnly}
              <div
                class={cn(
                  'absolute top-0 h-px bg-border/80',
                  isFirst && 'left-1/2 right-0',
                  isLast && 'left-0 right-1/2',
                  !isFirst && !isLast && 'left-0 right-0'
                )}
              ></div>
            {/if}

            <!-- Vertical Connector Down to Child -->
            <div class="absolute top-0 left-1/2 h-4 w-px bg-border/80 -translate-x-1/2"></div>

            <!-- Recursive Child Render -->
            {@render renderNode(child)}
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}
