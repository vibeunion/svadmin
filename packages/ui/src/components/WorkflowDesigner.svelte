<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils';

  export interface WorkflowNode {
    id: string;
    type: 'start' | 'approver' | 'condition' | 'notifier';
    title: string;
    content?: string;
    status?: 'pending' | 'active' | 'completed' | 'rejected';
    error?: string;
    assignees?: string[];
  }

  export type WorkflowNodeRenderer = Snippet<[WorkflowNode]>;

  export interface WorkflowDesignerProps {
    /** List of workflow steps in linear or branching order */
    nodes?: WorkflowNode[];
    /** Whether the designer is in view-only / execution status mode */
    readonly?: boolean;
    /** Callback when a node card is clicked for editing */
    onnodeclick?: (node: WorkflowNode) => void;
    /** Callback when an add node button is clicked */
    onaddnode?: (targetNodeId: string, type: 'approver' | 'condition' | 'notifier') => void;
    /** Callback when a node is removed */
    ondeletenode?: (nodeId: string) => void;
    /** Optional renderer per node type; defaults to the built-in node card. */
    nodeTypes?: Partial<Record<WorkflowNode['type'], WorkflowNodeRenderer>>;
    /** Extra header or toolbar slot */
    extra?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    nodes = [
      { id: '1', type: 'start', title: '发起人', content: '所有人' },
      { id: '2', type: 'approver', title: '直属主管审批', content: '主管审批' },
      { id: '3', type: 'notifier', title: '抄送人', content: '抄送发起人' },
    ],
    readonly = false,
    onnodeclick,
    onaddnode,
    ondeletenode,
    nodeTypes,
    extra,
    class: className = '',
  }: WorkflowDesignerProps = $props();

  let activeAddMenuId = $state<string | null>(null);

  function getNodeTypeColor(type: WorkflowNode['type']) {
    switch (type) {
      case 'start':
        return {
          headerBg: 'bg-primary',
          headerText: 'text-primary-foreground',
          badge: '发起',
        };
      case 'approver':
        return {
          headerBg: 'bg-warning',
          headerText: 'text-warning-foreground',
          badge: '审批人',
        };
      case 'condition':
        return {
          headerBg: 'bg-success',
          headerText: 'text-success-foreground',
          badge: '条件分支',
        };
      case 'notifier':
        return {
          headerBg: 'bg-info',
          headerText: 'text-info-foreground',
          badge: '抄送人',
        };
      default:
        return {
          headerBg: 'bg-muted-foreground',
          headerText: 'text-background',
          badge: '节点',
        };
    }
  }

  function getStatusTone(status?: WorkflowNode['status']) {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success/30';
      case 'active':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'pending':
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  }

  function handleAdd(nodeId: string, type: 'approver' | 'condition' | 'notifier') {
    onaddnode?.(nodeId, type);
    activeAddMenuId = null;
  }
</script>

<div
  data-svadmin-component="WorkflowDesigner"
  class={cn(
    'svadmin-workflow-designer relative flex w-full flex-col items-center justify-start bg-background py-6',
    className
  )}
>
  {#if extra}
    <div class="mb-4 flex w-full max-w-md items-center justify-end px-4">
      {@render extra()}
    </div>
  {/if}

  <div class="relative flex flex-col items-center gap-0">
    {#each nodes as node, index (node.id)}
      {@const colors = getNodeTypeColor(node.type)}
      {@const customNode = nodeTypes?.[node.type]}
      {#if customNode}
        <div class="group/node relative flex w-72 flex-col rounded-[4px] border border-border bg-card shadow-xs transition-all hover:shadow-md">
          <div
            role="button"
            tabindex="0"
            class="w-full text-left focus-visible:outline-none"
            aria-label={`编辑 ${node.title}`}
            onclick={() => onnodeclick?.(node)}
            onkeydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onnodeclick?.(node);
              }
            }}
          >
            {@render customNode(node)}
          </div>

          {#if !readonly && node.type !== 'start'}
            <button
              type="button"
              aria-label={`删除 ${node.title}`}
              class="absolute right-2 top-2 p-0.5 text-muted-foreground transition-colors hover:text-destructive"
              onclick={(event) => {
                event.stopPropagation();
                ondeletenode?.(node.id);
              }}
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          {/if}
        </div>
      {:else}
        <!-- Node Card -->
        <div class="group/node relative flex w-72 flex-col rounded-[4px] border border-border bg-card shadow-xs transition-all hover:shadow-md">
          <!-- Node Header -->
          <div class={cn('flex items-center justify-between px-3 py-1.5 rounded-t-[3px]', colors.headerBg, colors.headerText)}>
            <div class="flex items-center gap-1.5 text-xs font-medium">
              <span>{node.title}</span>
            </div>

            <div class="flex items-center gap-1">
              {#if node.status}
                <span class={cn('rounded-[2px] border px-1.5 py-0.2 text-xs font-normal leading-tight', getStatusTone(node.status))}>
                  {node.status}
                </span>
              {/if}

              {#if !readonly && node.type !== 'start'}
                <button
                  type="button"
                  aria-label={`删除 ${node.title}`}
                  class="opacity-0 transition-opacity group-hover/node:opacity-100 p-0.5 text-white/80 hover:text-white"
                  onclick={(e) => {
                    e.stopPropagation();
                    ondeletenode?.(node.id);
                  }}
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              {/if}
            </div>
          </div>

          <!-- Node Body -->
          <button
            type="button"
            class="flex w-full flex-col items-start p-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none"
            onclick={() => onnodeclick?.(node)}
          >
            <div class="text-xs text-foreground line-clamp-2">
              {node.content || '请设置节点属性'}
            </div>

            {#if node.assignees && node.assignees.length > 0}
              <div class="mt-2 flex flex-wrap gap-1">
                {#each node.assignees as assignee (assignee)}
                  <span class="rounded-[2px] bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {assignee}
                  </span>
                {/each}
              </div>
            {/if}

            {#if node.error}
              <span class="mt-1 text-xs text-destructive">
                {node.error}
              </span>
            {/if}
          </button>
        </div>
      {/if}

      <!-- Connecting line and Add Button -->
      {#if index < nodes.length - 1 || !readonly}
        <div class="relative flex h-14 w-full flex-col items-center justify-center">
          <div class="h-full w-[1.5px] bg-border"></div>

          {#if !readonly}
            <div class="absolute inset-auto flex items-center justify-center">
              <button
                type="button"
                aria-label="添加节点"
                class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none"
                onclick={() => {
                  activeAddMenuId = activeAddMenuId === node.id ? null : node.id;
                }}
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              {#if activeAddMenuId === node.id}
                <!-- Add Node Menu Modal/Popover -->
                <div class="absolute top-8 z-30 flex w-48 flex-col rounded-[4px] border border-border bg-card p-1.5 shadow-lg">
                  <button
                    type="button"
                    class="flex items-center gap-2 rounded-[2px] px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                    onclick={() => handleAdd(node.id, 'approver')}
                  >
                    <span class="h-2 w-2 rounded-full bg-warning"></span>
                    <span>审批人节点</span>
                  </button>
                  <button
                    type="button"
                    class="flex items-center gap-2 rounded-[2px] px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                    onclick={() => handleAdd(node.id, 'notifier')}
                  >
                    <span class="h-2 w-2 rounded-full bg-info"></span>
                    <span>抄送人节点</span>
                  </button>
                  <button
                    type="button"
                    class="flex items-center gap-2 rounded-[2px] px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                    onclick={() => handleAdd(node.id, 'condition')}
                  >
                    <span class="h-2 w-2 rounded-full bg-success"></span>
                    <span>条件分支</span>
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    {/each}

    <!-- End Node -->
    <div class="flex items-center justify-center">
      <div class="rounded-full bg-muted px-4 py-1 text-xs text-muted-foreground select-none">
        流程结束
      </div>
    </div>
  </div>
</div>
