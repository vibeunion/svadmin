<script lang="ts">
  import {
    GitCommit,
    UserCheck,
    Plus,
    Trash2,
    Settings,
    ArrowDown,
    X,
  } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';

  export type ApproverMode = 'all' | 'one' | 'sequential';
  export type ApprovalNodeType = 'start' | 'approver' | 'cc';

  export interface ApprovalChainNode {
    id: string;
    type: ApprovalNodeType;
    title: string;
    roleName: string;
    mode?: ApproverMode | undefined;
    autoPassHours?: number | undefined;
  }

  export interface ApprovalChainBuilderProps {
    nodes?: ApprovalChainNode[] | undefined;
    title?: string | undefined;
    description?: string | undefined;
    class?: string | undefined;
    onChange?: ((nodes: ApprovalChainNode[]) => void) | undefined;
  }

  let {
    nodes: initialNodes = [
      { id: 'start', type: 'start', title: '发起人', roleName: '全体员工' },
      { id: 'mgr', type: 'approver', title: '直属部门主管', roleName: '部门负责人', mode: 'one' },
      { id: 'fin', type: 'approver', title: '财务复核', roleName: '财务审批组', mode: 'all' },
      { id: 'cc', type: 'cc', title: '抄送节点', roleName: '人事与审计归档' },
    ],
    title,
    description,
    class: className = '',
    onChange,
  }: ApprovalChainBuilderProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let chain = $state<ApprovalChainNode[]>(untrack(() => JSON.parse(JSON.stringify(initialNodes))));
  let selectedNodeId = $state<string | null>(null);

  const selectedNode = $derived(chain.find((n) => n.id === selectedNodeId) ?? null);

  function insertNodeAfter(index: number, type: 'approver' | 'cc') {
    const newNode: ApprovalChainNode = {
      id: `node-${Date.now()}`,
      type,
      title: type === 'approver' ? (chinese ? '指定审批人' : 'Approver Node') : (chinese ? '抄送人' : 'CC Node'),
      roleName: type === 'approver' ? (chinese ? '部门主管' : 'Manager') : (chinese ? '抄送人员' : 'CC Members'),
      mode: 'one',
    };
    const next = [...chain];
    next.splice(index + 1, 0, newNode);
    chain = next;
    selectedNodeId = newNode.id;
    onChange?.(chain);
  }

  function removeNode(id: string) {
    if (id === 'start') return; // Cannot delete start node
    chain = chain.filter((n) => n.id !== id);
    if (selectedNodeId === id) selectedNodeId = null;
    onChange?.(chain);
  }

  const modeLabels = $derived<Record<ApproverMode, string>>({
    one: chinese ? '或签 (一名通过即生效)' : 'Any one approves',
    all: chinese ? '会签 (需全员同意)' : 'All must approve',
    sequential: chinese ? '按顺序逐级审批' : 'Sequential',
  });

  const resolvedTitle = $derived(title ?? (chinese ? '多级审批流编排设计器' : 'Approval Chain Flow Builder'));
  const resolvedDesc = $derived(
    description ?? (chinese ? '仿飞书/钉钉风格轻量纵向审批流，支持会签、或签与抄送节点灵活插入' : 'Visual multi-tier approval chain with countersign and CC nodes'),
  );
</script>

<div
  data-svadmin-component="ApprovalChainBuilder"
  class={cn(
    'relative w-full rounded-md border border-border bg-card text-card-foreground shadow-xs p-6 space-y-4 flex flex-col text-xs',
    className,
  )}
>
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-border/70 pb-3">
    <div class="flex items-center gap-2.5">
      <div class="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary border border-primary/20">
        <GitCommit class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-base font-semibold text-foreground">{resolvedTitle}</h3>
        <p class="text-xs text-muted-foreground">{resolvedDesc}</p>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 items-start">
    <!-- Vertical Chain Nodes Flow -->
    <div class="flex flex-col items-center py-4 space-y-2">
      {#each chain as node, idx (node.id)}
        {@const isSelected = selectedNodeId === node.id}
        <!-- Node Card -->
        <div
          role="button"
          tabindex="0"
          onclick={() => (selectedNodeId = node.id)}
          onkeydown={(e) => e.key === 'Enter' && (selectedNodeId = node.id)}
          class={cn(
            'group relative flex flex-col w-72 rounded-md border p-3.5 transition-all cursor-pointer bg-card shadow-2xs',
            isSelected ? 'border-primary ring-2 ring-primary/20 scale-[1.02]' : 'border-border/80 hover:border-primary/50',
          )}
        >
          <div class="flex items-center justify-between mb-1">
            <span
              class={cn(
                'text-xs font-bold uppercase px-2 py-0.5 rounded-full',
                node.type === 'start' ? 'bg-muted text-muted-foreground' : node.type === 'approver' ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info',
              )}
            >
              {node.type === 'start' ? (chinese ? '发起' : 'Start') : node.type === 'approver' ? (chinese ? '审批人' : 'Approver') : (chinese ? '抄送' : 'CC')}
            </span>

            {#if node.type !== 'start'}
              <button
                type="button"
                onclick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                class="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label="Remove approval node"
              >
                <Trash2 class="h-3 w-3" />
              </button>
            {/if}
          </div>

          <div class="font-bold text-xs text-foreground truncate mt-0.5">{node.title}</div>
          <div class="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
            <UserCheck class="h-3 w-3 text-primary" />
            <span class="truncate">{node.roleName}</span>
          </div>

          {#if node.mode}
            <div class="text-xs text-muted-foreground/75 font-mono mt-1">
              {modeLabels[node.mode]}
            </div>
          {/if}
        </div>

        <!-- Node Connector + Insert Button -->
        {#if idx < chain.length - 1}
          <div class="flex flex-col items-center my-1">
            <ArrowDown class="h-3.5 w-3.5 text-muted-foreground/50" />
            <div class="group relative my-1">
              <button
                type="button"
                class="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs shadow-xs hover:scale-110 transition-transform"
                title={chinese ? '插入新节点' : 'Insert node'}
                aria-label="Insert node"
              >
                <Plus class="h-3.5 w-3.5" />
              </button>

              <!-- Quick choice menu -->
              <div class="absolute left-1/2 -translate-x-1/2 top-6 hidden group-hover:flex items-center gap-1.5 bg-card border border-border p-1 rounded-lg shadow-lg z-20">
                <button
                  type="button"
                  onclick={() => insertNodeAfter(idx, 'approver')}
                  class="px-2 py-1 bg-muted hover:bg-primary hover:text-primary-foreground rounded text-xs font-semibold whitespace-nowrap"
                >
                  + {chinese ? '审批节点' : 'Approver'}
                </button>
                <button
                  type="button"
                  onclick={() => insertNodeAfter(idx, 'cc')}
                  class="px-2 py-1 bg-muted hover:bg-info hover:text-info-foreground rounded text-xs font-semibold whitespace-nowrap"
                >
                  + {chinese ? '抄送节点' : 'CC'}
                </button>
              </div>
            </div>
            <ArrowDown class="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
        {/if}
      {/each}
    </div>

    <!-- Right Side Node Inspector -->
    {#if selectedNode}
      <div class="rounded-md border border-border bg-muted/20 p-4 space-y-3">
        <div class="flex items-center justify-between border-b border-border/60 pb-2">
          <div class="flex items-center gap-1.5 font-bold text-foreground">
            <Settings class="h-3.5 w-3.5 text-primary" />
            <span>{chinese ? '节点属性配置' : 'Node Properties'}</span>
          </div>
          <button
            type="button"
            onclick={() => (selectedNodeId = null)}
            class="text-muted-foreground hover:text-foreground"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <div class="space-y-3">
          <div>
            <label for="approval-node-title" class="block font-medium text-muted-foreground mb-1">
              {chinese ? '节点名称' : 'Node Title'}
            </label>
            <input id="approval-node-title"
              type="text"
              bind:value={selectedNode.title}
              class="h-7.5 w-full rounded border border-input bg-background px-2 text-xs text-foreground"
            />
          </div>

          <div>
            <label for="approval-node-role" class="block font-medium text-muted-foreground mb-1">
              {chinese ? '指定审批角色/人员' : 'Role or Assignee'}
            </label>
            <input id="approval-node-role"
              type="text"
              bind:value={selectedNode.roleName}
              class="h-7.5 w-full rounded border border-input bg-background px-2 text-xs text-foreground"
            />
          </div>

          {#if selectedNode.type === 'approver'}
            <div>
              <label for="approval-node-mode" class="block font-medium text-muted-foreground mb-1">
                {chinese ? '多人审批方式' : 'Approval Policy'}
              </label>
              <select data-size="compact" id="approval-node-mode"
                bind:value={selectedNode.mode}
                class="svadmin-select h-7.5 w-full"
              >
                <option value="one">{chinese ? '或签 (一名通过即可)' : 'Any one (OR)'}</option>
                <option value="all">{chinese ? '会签 (所有人必须通过)' : 'Countersign (AND)'}</option>
                <option value="sequential">{chinese ? '顺序审批' : 'Sequential'}</option>
              </select>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground text-xs">
        {chinese ? '点击左侧任意节点查看并配置属性' : 'Click any node to inspect properties'}
      </div>
    {/if}
  </div>
</div>
