<script lang="ts">
  import {
    X,
    UserCheck,
    Clock,
    GitBranch,
    Settings,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface WorkflowNodeData {
    id: string;
    name: string;
    type: 'start' | 'approver' | 'gateway' | 'cc' | 'end';
    approverType?: 'manager' | 'role' | 'specified' | 'self_select' | undefined;
    targetRole?: string | undefined;
    approvalMode?: 'all_agree' | 'any_agree' | 'percentage' | undefined;
    passPercentage?: number | undefined;
    timeoutHours?: number | undefined;
    timeoutAction?: 'remind' | 'auto_pass' | 'auto_transfer' | undefined;
    conditionExpression?: string | undefined;
    ccChannels?: string[] | undefined;
  }

  export interface WorkflowNodeInspectorProps {
    open?: boolean | undefined;
    node?: WorkflowNodeData | undefined;
    title?: string | undefined;
    class?: string | undefined;
    onSaveNode?: ((node: WorkflowNodeData) => void) | undefined;
    onClose?: (() => void) | undefined;
  }

  let {
    open = $bindable(false),
    node = $bindable<WorkflowNodeData>({
      id: 'node-appr-01',
      name: '部门主管审批节点',
      type: 'approver',
      approverType: 'manager',
      targetRole: '直属部门经理',
      approvalMode: 'all_agree',
      passPercentage: 100,
      timeoutHours: 24,
      timeoutAction: 'remind',
      ccChannels: ['dingtalk', 'wecom', 'email'],
    }),
    title = '流程节点属性检查器 (Node Inspector)',
    class: className = '',
    onSaveNode,
    onClose,
  }: WorkflowNodeInspectorProps = $props();

  let editedNode = $state<WorkflowNodeData>({ ...node });

  function handleSave() {
    onSaveNode?.(editedNode);
    open = false;
  }

  function handleClose() {
    open = false;
    onClose?.();
  }
</script>

{#if open}
  <!-- 抽屉遮罩 -->
  <div
    class="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs transition-opacity duration-200"
    onclick={handleClose}
    aria-hidden="true"
  ></div>

  <!-- 侧边滑出抽屉面板 -->
  <div
    class={cn(
      'fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border text-foreground shadow-2xl flex flex-col animate-in slide-in-from-right duration-200',
      className
    )}
    role="dialog"
    aria-modal="true"
    aria-label="流程节点属性配置抽屉"
    data-svadmin-component="workflow-node-inspector"
  >
    <!-- 头部 -->
    <div class="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Settings class="w-4 h-4 text-primary" />
        <h3 class="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <button
        type="button"
        class="p-1 rounded text-muted-foreground hover:text-foreground"
        onclick={handleClose}
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- 表单内容 -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
      <!-- 节点名称 -->
      <div class="space-y-1.5">
        <label for="node-name-input" class="font-medium text-foreground">节点名称</label>
        <input
          id="node-name-input"
          type="text"
          bind:value={editedNode.name}
          class="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <!-- 审批人设置 -->
      {#if editedNode.type === 'approver'}
        <div class="space-y-3 p-3 rounded-xl border border-border bg-muted/10">
          <div class="flex items-center gap-1.5 font-medium text-foreground">
            <UserCheck class="w-3.5 h-3.5 text-primary" />
            <span>审批人指定规则</span>
          </div>

          <div class="grid grid-cols-2 gap-2">
            {#each [
              { id: 'manager' as const, label: '直属主管审批' },
              { id: 'role' as const, label: '按角色岗位审批' },
              { id: 'specified' as const, label: '指定具体人员' },
              { id: 'self_select' as const, label: '发起人自选' },
            ] as appType (appType.id)}
              <button
                type="button"
                class={cn(
                  'p-2 rounded-lg border text-left transition-colors text-xs font-medium',
                  editedNode.approverType === appType.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card hover:bg-muted text-muted-foreground'
                )}
                onclick={() => (editedNode.approverType = appType.id)}
              >
                {appType.label}
              </button>
            {/each}
          </div>

          <!-- 审批方式 -->
          <div class="space-y-1.5 pt-2 border-t border-border/50">
            <span class="text-[11px] font-medium text-foreground">多审批人决议方式:</span>
            <div class="flex items-center gap-2">
              {#each [
                { id: 'all_agree' as const, label: '会签 (全员同意)' },
                { id: 'any_agree' as const, label: '或签 (一人同意即可)' },
                { id: 'percentage' as const, label: '投票比例通过' },
              ] as mode (mode.id)}
                <button
                  type="button"
                  class={cn(
                    'px-2 py-1 rounded-md border text-[11px] transition-colors',
                    editedNode.approvalMode === mode.id
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border bg-card text-muted-foreground'
                  )}
                  onclick={() => (editedNode.approvalMode = mode.id)}
                >
                  {mode.label}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <!-- 超时策略 -->
        <div class="space-y-2 p-3 rounded-xl border border-border bg-muted/10">
          <div class="flex items-center gap-1.5 font-medium text-foreground">
            <Clock class="w-3.5 h-3.5 text-primary" />
            <span>超时自动流转策略</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-muted-foreground">处理时限:</span>
            <input
              type="number"
              bind:value={editedNode.timeoutHours}
              class="w-20 px-2 py-1 text-xs rounded border border-border bg-background text-foreground font-mono"
            />
            <span class="text-muted-foreground">小时</span>
          </div>
        </div>
      {/if}

      <!-- 条件分支设置 -->
      {#if editedNode.type === 'gateway'}
        <div class="space-y-2 p-3 rounded-xl border border-border bg-muted/10">
          <div class="flex items-center gap-1.5 font-medium text-foreground">
            <GitBranch class="w-3.5 h-3.5 text-primary" />
            <span>条件流转表达式</span>
          </div>
          <textarea
            bind:value={editedNode.conditionExpression}
            placeholder="例如: amount > 100000 && department === '财务部'"
            rows={3}
            class="w-full p-2 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          ></textarea>
        </div>
      {/if}
    </div>

    <!-- 底部按钮 -->
    <div class="p-3 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" class="h-8 text-xs" onclick={handleClose}>
        取消
      </Button>
      <Button variant="default" size="sm" class="h-8 text-xs bg-primary text-primary-foreground" onclick={handleSave}>
        保存节点配置
      </Button>
    </div>
  </div>
{/if}
