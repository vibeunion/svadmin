<script lang="ts">
  import {
    Clock,
    Tag,
    CheckCircle2,
    Send,
    UserCheck,
    Flame,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type TicketPriority = 'P0' | 'P1' | 'P2' | 'P3';
  export type TicketStatus = 'unassigned' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed';

  export interface TicketActor {
    id: string;
    name: string;
    avatar?: string | undefined;
    role?: 'reporter' | 'assignee' | 'collaborator' | undefined;
  }

  export interface SlaInfo {
    /** 承诺截止时间 ISO 字符串或时间戳 */
    dueAt: string | number;
    /** SLA 类型说明，如 "首响 SLA" 或 "结单 SLA" */
    label?: string | undefined;
    /** 是否已达成违约 */
    isBreached?: boolean | undefined;
  }

  export interface ServiceDeskTicketCardProps {
    /** 工单唯一编号，如 "TCK-20261114-8848" */
    ticketId: string;
    /** 工单主题标题 */
    title: string;
    /** 工单概要详情或描述 */
    description?: string | undefined;
    /** 工单优先级 */
    priority?: TicketPriority | undefined;
    /** 工单流转状态 */
    status?: TicketStatus | undefined;
    /** 业务分类/服务目录标签，如 ["财务开票", "企业发票"] */
    categoryTags?: string[] | undefined;
    /** 提单人信息 */
    reporter: TicketActor;
    /** 当前指派处理人 */
    assignee?: TicketActor | undefined;
    /** 协同参与者列表 */
    collaborators?: TicketActor[] | undefined;
    /** SLA 承诺信息 */
    sla?: SlaInfo | undefined;
    /** 创建时间说明或 ISO 字符串 */
    createdAt?: string | undefined;
    /** 点击卡片查看详情回调 */
    onclick?: (() => void) | undefined;
    /** 快捷转派处理人回调 */
    onreassign?: (() => void) | undefined;
    /** 快捷结单回调 */
    onresolve?: (() => void) | undefined;
    /** 快捷催办回调 */
    onurge?: (() => void) | undefined;
    class?: string | undefined;
  }

  let {
    ticketId,
    title,
    description,
    priority = 'P2',
    status = 'in_progress',
    categoryTags = [],
    reporter,
    assignee,
    collaborators = [],
    sla,
    createdAt = '刚刚',
    onclick,
    onreassign,
    onresolve,
    onurge,
    class: className = '',
  }: ServiceDeskTicketCardProps = $props();

  // 优先级色彩与标签映射
  function getPriorityMeta(p: TicketPriority) {
    switch (p) {
      case 'P0':
        return { label: 'P0 致命阻塞', badgeClass: 'bg-destructive/10 text-destructive border-destructive/30' };
      case 'P1':
        return { label: 'P1 严重影响', badgeClass: 'bg-warning/10 text-warning border-warning/30' };
      case 'P2':
        return { label: 'P2 一般诉求', badgeClass: 'bg-primary/10 text-primary border-primary/30' };
      case 'P3':
        return { label: 'P3 低优先级', badgeClass: 'bg-muted text-muted-foreground border-border' };
    }
  }

  // 状态色彩与标签映射
  function getStatusMeta(s: TicketStatus) {
    switch (s) {
      case 'unassigned':
        return { label: '待受理分配', color: 'bg-warning/10 text-warning border-warning/30' };
      case 'in_progress':
        return { label: '技术处理中', color: 'bg-primary/10 text-primary border-primary/30' };
      case 'pending_customer':
        return { label: '等待客户反馈', color: 'bg-info/10 text-info border-info/30' };
      case 'resolved':
        return { label: '问题已解决', color: 'bg-success/10 text-success border-success/30' };
      case 'closed':
        return { label: '工单已结案', color: 'bg-muted text-muted-foreground border-border' };
    }
  }

  // 动态 SLA 剩余时间推演
  const slaRemaining = $derived.by(() => {
    if (!sla || !sla.dueAt) return null;
    const dueTime = new Date(sla.dueAt).getTime();
    if (isNaN(dueTime)) return null;
    const now = Date.now();
    const diffMs = dueTime - now;

    if (diffMs <= 0 || sla.isBreached) {
      return { isBreached: true, text: 'SLA 已超时违约', urgent: true };
    }

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainMin = minutes % 60;

    const urgent = minutes < 60; // 不足 1 小时紧急告警
    const text = hours > 0 ? `剩余 ${hours}h ${remainMin}m` : `剩余 ${minutes}m`;

    return { isBreached: false, text, urgent };
  });

  const priorityMeta = $derived(getPriorityMeta(priority));
  const statusMeta = $derived(getStatusMeta(status));
</script>

<div
  class={cn(
    'group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 text-card-foreground shadow-sm transition-all hover:border-primary/50 hover:shadow-md',
    priority === 'P0' ? 'ring-1 ring-destructive/30' : '',
    className
  )}
  data-svadmin-component="ServiceDeskTicketCard"
>
  <!-- 头部工单编号、优先级与 SLA 指示器 -->
  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
    <div class="flex items-center gap-2">
      <code class="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
        {ticketId}
      </code>
      <span class="text-[11px] text-muted-foreground">{createdAt}</span>

      <!-- 优先级 Badge -->
      <span class={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', priorityMeta.badgeClass)}>
        {priorityMeta.label}
      </span>

      <!-- 状态 Badge -->
      <span class={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', statusMeta.color)}>
        {statusMeta.label}
      </span>
    </div>

    <!-- SLA 倒计时时效提示条 -->
    {#if slaRemaining}
      <div
        class={cn(
          'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors',
          slaRemaining.isBreached
            ? 'border-destructive/40 bg-destructive/10 text-destructive animate-pulse'
            : slaRemaining.urgent
              ? 'border-warning/40 bg-warning/10 text-warning'
              : 'border-success/40 bg-success/10 text-success'
        )}
      >
        {#if slaRemaining.isBreached}
          <Flame class="h-3.5 w-3.5" />
        {:else}
          <Clock class="h-3.5 w-3.5" />
        {/if}
        <span>{sla?.label ?? 'SLA'}: {slaRemaining.text}</span>
      </div>
    {/if}
  </div>

  <!-- 主体信息：标题、描述与服务分类标签 -->
  <div class="my-3 flex-1 cursor-pointer" onclick={onclick} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && onclick?.()}>
    <h3 class="text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
      {title}
    </h3>
    {#if description}
      <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {description}
      </p>
    {/if}

    {#if categoryTags.length > 0}
      <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
        {#each categoryTags as tag (tag)}
          <span class="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            <Tag class="h-2.5 w-2.5" />
            <span>{tag}</span>
          </span>
        {/each}
      </div>
    {/if}
  </div>

  <!-- 底部人员协作群组与快捷动作栏 -->
  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3 text-xs">
    <!-- 提单人与当前处理人 -->
    <div class="flex items-center gap-4">
      <!-- 提单客户 -->
      <div class="flex items-center gap-1.5">
        <span class="text-muted-foreground">提单:</span>
        <span class="font-medium text-foreground">{reporter.name}</span>
      </div>

      <!-- 处理责任人 -->
      <div class="flex items-center gap-1.5">
        <span class="text-muted-foreground">处理:</span>
        {#if assignee}
          <span class="font-medium text-primary">{assignee.name}</span>
        {:else}
          <span class="rounded bg-warning/10 px-1.5 py-0.2 text-[11px] font-medium text-warning">
            待认领
          </span>
        {/if}
      </div>

      <!-- 协同人头像组 -->
      {#if collaborators.length > 0}
        <div class="flex -space-x-1.5">
          {#each collaborators.slice(0, 3) as c (c.name ?? c.id ?? c)}
            <div
              class="flex h-5 w-5 items-center justify-center rounded-full border border-card bg-muted text-[10px] font-semibold text-muted-foreground"
              title={`协作者: ${c.name}`}
            >
              {c.name.slice(0, 1)}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- 快捷业务操作按钮 -->
    <div class="flex items-center gap-1.5">
      {#if onurge && status !== 'resolved' && status !== 'closed'}
        <button
          type="button"
          class="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
          onclick={(e) => {
            e.stopPropagation();
            onurge?.();
          }}
          title="发送催办通知提醒处理人"
        >
          <Send class="h-3 w-3" />
          <span>催单</span>
        </button>
      {/if}

      {#if onreassign && status !== 'closed'}
        <button
          type="button"
          class="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
          onclick={(e) => {
            e.stopPropagation();
            onreassign?.();
          }}
          title="转派工单给其他同事"
        >
          <UserCheck class="h-3 w-3" />
          <span>转派</span>
        </button>
      {/if}

      {#if onresolve && status !== 'resolved' && status !== 'closed'}
        <button
          type="button"
          class="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
          onclick={(e) => {
            e.stopPropagation();
            onresolve?.();
          }}
          title="标记此工单已处理完成"
        >
          <CheckCircle2 class="h-3 w-3" />
          <span>结单</span>
        </button>
      {/if}
    </div>
  </div>
</div>
