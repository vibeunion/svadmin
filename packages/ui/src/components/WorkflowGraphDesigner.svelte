<script lang="ts">
  import { untrack } from 'svelte';
  import { Play, CheckCircle2, GitBranch, UserCheck, Send, Plus, Trash2, ArrowDown } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type WorkflowNodeType = 'start' | 'approval' | 'condition' | 'cc' | 'end';

  export interface WorkflowGraphNode {
    id: string;
    type: WorkflowNodeType;
    title: string;
    description?: string | undefined;
    assigneeText?: string | undefined;
    conditionText?: string | undefined;
    nextNodes?: string[] | undefined;
  }

  export interface WorkflowGraphDesignerProps {
    /** 初始节点流程列表 */
    initialNodes?: WorkflowGraphNode[] | undefined;
    /** 是否只读展示 */
    readOnly?: boolean | undefined;
    /** 节点变动回调 */
    onnodeschange?: ((nodes: WorkflowGraphNode[]) => void) | undefined;
    /** 点击选中节点回调 */
    onselectnode?: ((node: WorkflowGraphNode) => void) | undefined;
    class?: string | undefined;
  }

  const defaultStarterNodes: WorkflowGraphNode[] = [
    { id: 'node-start', type: 'start', title: '发起审批申请', description: '员工提交请假或报销申请' },
    { id: 'node-cond-1', type: 'condition', title: '金额阈值判断', conditionText: '报销金额 >= ¥10,000' },
    { id: 'node-appr-1', type: 'approval', title: '部门直属主管初审', assigneeText: '直属部门经理 (会签)' },
    { id: 'node-appr-2', type: 'approval', title: '财务总监终审', assigneeText: '财务总监 (一票否决制)' },
    { id: 'node-cc-1', type: 'cc', title: '抄送行政与出纳', assigneeText: '抄送: 出纳组、人力资源部' },
    { id: 'node-end', type: 'end', title: '流程结束', description: '自动归档并触发打款 Webhook' },
  ];

  let {
    initialNodes = defaultStarterNodes,
    readOnly = false,
    onnodeschange,
    onselectnode,
    class: className = '',
  }: WorkflowGraphDesignerProps = $props();

  let nodes = $state<WorkflowGraphNode[]>(untrack(() => initialNodes));
  let selectedNodeId = $state<string | null>(null);

  function makeId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  function addNodeAfter(index: number, type: WorkflowNodeType) {
    if (readOnly) return;
    const newNode: WorkflowGraphNode = {
      id: `node-${makeId()}`,
      type,
      title: type === 'approval' ? '新增审批节点' : type === 'condition' ? '新增条件网关' : '新增抄送节点',
      assigneeText: type === 'approval' ? '指定主管' : undefined,
      conditionText: type === 'condition' ? '满足自定义表达式' : undefined,
    };

    const next = [...nodes];
    next.splice(index + 1, 0, newNode);
    nodes = next;
    onnodeschange?.(nodes);
  }

  function removeNode(id: string) {
    if (readOnly) return;
    nodes = nodes.filter((n) => n.id !== id);
    if (selectedNodeId === id) selectedNodeId = null;
    onnodeschange?.(nodes);
  }

  function getNodeTone(type: WorkflowNodeType) {
    switch (type) {
      case 'start':
        return { badge: 'bg-primary/10 text-primary border-primary/30', icon: Play };
      case 'approval':
        return { badge: 'bg-warning/10 text-warning border-warning/30', icon: UserCheck };
      case 'condition':
        return { badge: 'bg-accent/30 text-foreground border-border', icon: GitBranch };
      case 'cc':
        return { badge: 'bg-muted text-muted-foreground border-border', icon: Send };
      case 'end':
      default:
        return { badge: 'bg-success/10 text-success border-success/30', icon: CheckCircle2 };
    }
  }
</script>

<div
  class={cn('rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs flex flex-col space-y-4', className)}
  data-svadmin-component="WorkflowGraphDesigner"
>
  <header class="flex items-center justify-between border-b border-border pb-3">
    <div>
      <h3 class="font-bold text-sm text-foreground">复杂审批流可视化编排设计器</h3>
      <p class="text-xs text-muted-foreground mt-0.5">支持条件分支网关、审批人策略、多级会签与抄送链路设计</p>
    </div>
    <span class="text-xs font-mono text-muted-foreground">共 {nodes.length} 个编排节点</span>
  </header>

  <!-- Flow Visual Column -->
  <div class="flex flex-col items-center py-4 space-y-3 overflow-y-auto max-h-[520px]">
    {#each nodes as node, idx (node.id)}
      {@const tone = getNodeTone(node.type)}
      <div class="flex flex-col items-center w-full max-w-md">
        <!-- Node Card -->
        <div
          role="button"
          tabindex="0"
          onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { selectedNodeId = node.id; onselectnode?.(node); } }}
          class={cn(
            'w-full rounded-xl border p-4 text-left transition-all cursor-pointer relative shadow-2xs group flex items-start gap-3',
            selectedNodeId === node.id
              ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
              : 'border-border bg-card hover:border-primary/50'
          )}
          onclick={() => {
            selectedNodeId = node.id;
            onselectnode?.(node);
          }}
          data-workflow-node={node.id}
        >
          <div class={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border', tone.badge)}>
            <tone.icon class="h-4 w-4" />
          </div>

          <div class="flex-1 min-w-0 text-xs">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-foreground text-xs truncate group-hover:text-primary transition-colors">
                {node.title}
              </span>
              <span class="font-mono text-[10px] text-muted-foreground uppercase">{node.type}</span>
            </div>

            {#if node.assigneeText}
              <p class="text-muted-foreground font-mono text-[11px] mt-1 flex items-center gap-1">
                <span>👤</span>
                <span>{node.assigneeText}</span>
              </p>
            {/if}

            {#if node.conditionText}
              <p class="text-warning font-mono text-[11px] mt-1 flex items-center gap-1 bg-warning/5 px-1.5 py-0.5 rounded border border-warning/20">
                <span>⌥ 判定:</span>
                <span>{node.conditionText}</span>
              </p>
            {/if}

            {#if node.description}
              <p class="text-muted-foreground text-[11px] mt-1">{node.description}</p>
            {/if}
          </div>

          {#if !readOnly && node.type !== 'start' && node.type !== 'end'}
            <button
              type="button"
              class="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all cursor-pointer"
              onclick={(e) => { e.stopPropagation(); removeNode(node.id); }}
              aria-label="Remove node"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          {/if}
        </div>

        <!-- Downward Connector Arrow & Add Node Button -->
        {#if idx < nodes.length - 1}
          <div class="flex flex-col items-center my-1 select-none relative group/line">
            <div class="h-5 w-0.5 bg-border group-hover/line:bg-primary transition-colors"></div>
            {#if !readOnly}
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="h-5 px-2 rounded-full border border-dashed border-border bg-background hover:border-primary text-muted-foreground hover:text-primary text-[10px] font-mono flex items-center gap-0.5 transition-all cursor-pointer"
                  onclick={() => addNodeAfter(idx, 'approval')}
                >
                  <Plus class="h-2.5 w-2.5" />
                  <span>审批</span>
                </button>
                <button
                  type="button"
                  class="h-5 px-2 rounded-full border border-dashed border-border bg-background hover:border-primary text-muted-foreground hover:text-primary text-[10px] font-mono flex items-center gap-0.5 transition-all cursor-pointer"
                  onclick={() => addNodeAfter(idx, 'condition')}
                >
                  <Plus class="h-2.5 w-2.5" />
                  <span>分支</span>
                </button>
              </div>
            {/if}
            <div class="h-5 w-0.5 bg-border group-hover/line:bg-primary transition-colors"></div>
            <ArrowDown class="h-3.5 w-3.5 text-muted-foreground -mt-1" />
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
