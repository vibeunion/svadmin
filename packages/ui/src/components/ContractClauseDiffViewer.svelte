<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    FileText,
    Check,
    X,
    MessageSquare,
    AlertTriangle,
    ShieldAlert,
    ChevronRight,
    Split,
    Columns,
    Filter,
    Send
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type ClauseChangeType = 'unchanged' | 'added' | 'removed' | 'modified';
  export type ClauseRiskLevel = 'low' | 'medium' | 'high';
  export type ClauseDecisionStatus = 'pending' | 'accepted' | 'rejected';

  export interface ClauseAnnotation {
    id: string;
    author: string;
    avatar?: string;
    role?: string;
    timestamp: string;
    content: string;
  }

  export interface ContractClause {
    id: string;
    clauseNumber: string;
    title: string;
    changeType: ClauseChangeType;
    riskLevel?: ClauseRiskLevel;
    originalContent?: string;
    proposedContent?: string;
    annotations?: ClauseAnnotation[];
    decision?: ClauseDecisionStatus;
  }

  export interface ContractClauseDiffViewerProps {
    /** 原始版本标识，如 "v1.0 (基线版本)" */
    originalVersionLabel?: string;
    /** 修订版本标识，如 "v2.0 (法务修订版)" */
    proposedVersionLabel?: string;
    /** 条款列表 */
    clauses: ContractClause[];
    /** 对比视图模式：'split' (双侧对比) | 'unified' (单侧合并) */
    viewMode?: 'split' | 'unified';
    /** 过滤模式：'all' | 'changed' | 'high_risk' */
    filter?: 'all' | 'changed' | 'high_risk';
    /** 当前高亮选中的条款 ID */
    selectedClauseId?: string;
    /** 只读模式 */
    readonly?: boolean;
    /** 决策变更回调 */
    onDecisionChange?: (clauseId: string, decision: ClauseDecisionStatus) => void;
    /** 批量决策回调 */
    onBatchDecision?: (decision: ClauseDecisionStatus) => void;
    /** 新增批注回调 */
    onAddAnnotation?: (clauseId: string, content: string) => void;
    /** 选中条款变更回调 */
    onSelectClause?: (clauseId: string) => void;
    /** 自定义头部操作区插槽 */
    actions?: Snippet | undefined;
    class?: string | undefined;
  }

  let {
    originalVersionLabel = '基线条款 (v1.0)',
    proposedVersionLabel = '修订条款 (v2.0)',
    clauses = [],
    viewMode = $bindable('split'),
    filter = $bindable('all'),
    selectedClauseId = $bindable(''),
    readonly = false,
    onDecisionChange,
    onBatchDecision,
    onAddAnnotation,
    onSelectClause,
    actions,
    class: className = ''
  }: ContractClauseDiffViewerProps = $props();

  // 内部选中的条款
  let activeId = $state(selectedClauseId || '');
  // 临时批注输入内容字典
  let newAnnotationInputs = $state<Record<string, string>>({});
  // 展开批注列表的条款集合
  let expandedAnnotations = $state<Record<string, boolean>>({});

  $effect(() => {
    if (!activeId && clauses.length > 0) {
      activeId = clauses[0].id;
    }
  });

  $effect(() => {
    if (selectedClauseId && selectedClauseId !== activeId) {
      activeId = selectedClauseId;
    }
  });

  const filteredClauses = $derived.by(() => {
    return clauses.filter((clause) => {
      if (filter === 'changed') {
        return clause.changeType !== 'unchanged';
      }
      if (filter === 'high_risk') {
        return clause.riskLevel === 'high';
      }
      return true;
    });
  });

  const statistics = $derived.by(() => {
    let added = 0;
    let removed = 0;
    let modified = 0;
    let unchanged = 0;
    let pending = 0;
    let accepted = 0;
    let rejected = 0;

    for (const c of clauses) {
      if (c.changeType === 'added') added++;
      else if (c.changeType === 'removed') removed++;
      else if (c.changeType === 'modified') modified++;
      else unchanged++;

      const dec = c.decision ?? 'pending';
      if (dec === 'accepted') accepted++;
      else if (dec === 'rejected') rejected++;
      else pending++;
    }

    return { added, removed, modified, unchanged, pending, accepted, rejected, total: clauses.length };
  });

  function handleSelect(id: string) {
    activeId = id;
    selectedClauseId = id;
    onSelectClause?.(id);
  }

  function handleDecision(id: string, decision: ClauseDecisionStatus) {
    if (readonly) return;
    onDecisionChange?.(id, decision);
  }

  function handleBatch(decision: ClauseDecisionStatus) {
    if (readonly) return;
    onBatchDecision?.(decision);
  }

  function toggleAnnotationSection(id: string) {
    expandedAnnotations[id] = !expandedAnnotations[id];
  }

  function handleSendAnnotation(clauseId: string) {
    const text = (newAnnotationInputs[clauseId] ?? '').trim();
    if (!text) return;
    onAddAnnotation?.(clauseId, text);
    newAnnotationInputs[clauseId] = '';
    expandedAnnotations[clauseId] = true;
  }

  function getChangeBadge(type: ClauseChangeType) {
    switch (type) {
      case 'added':
        return { label: '新增', class: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400' };
      case 'removed':
        return { label: '删除', class: 'bg-rose-500/15 text-rose-600 border-rose-500/30 dark:text-rose-400' };
      case 'modified':
        return { label: '修订', class: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400' };
      default:
        return { label: '未变更', class: 'bg-muted text-muted-foreground border-border' };
    }
  }

  function getRiskBadge(risk?: ClauseRiskLevel) {
    switch (risk) {
      case 'high':
        return { label: '高风险', class: 'bg-destructive/15 text-destructive border-destructive/30' };
      case 'medium':
        return { label: '中风险', class: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400' };
      default:
        return { label: '低风险', class: 'bg-muted/80 text-muted-foreground border-border' };
    }
  }

  function getDecisionBadge(status?: ClauseDecisionStatus) {
    switch (status) {
      case 'accepted':
        return { label: '已采纳', class: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' };
      case 'rejected':
        return { label: '已驳回', class: 'bg-rose-500/15 text-rose-600 border-rose-500/30' };
      default:
        return { label: '待决策', class: 'bg-amber-500/15 text-amber-600 border-amber-500/30' };
    }
  }
</script>

<div
  class={cn(
    'flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden',
    className
  )}
  data-svadmin-component="ContractClauseDiffViewer"
>
  <!-- 顶部工具条 -->
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-sm font-semibold text-foreground">合同条款版本对比与法务决策</h3>
        <p class="text-xs text-muted-foreground">逐条比对合同条款差异，追踪法务合规批注与决策记录</p>
      </div>
    </div>

    <!-- 操作组 -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- 视图切换 -->
      <div class="flex items-center rounded-lg border border-border bg-background p-0.5 text-xs">
        <button
          type="button"
          class={cn(
            'flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors',
            viewMode === 'split' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          )}
          onclick={() => (viewMode = 'split')}
          title="双侧分屏对比"
        >
          <Columns class="h-3.5 w-3.5" />
          分侧对比
        </button>
        <button
          type="button"
          class={cn(
            'flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors',
            viewMode === 'unified' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          )}
          onclick={() => (viewMode = 'unified')}
          title="单侧整合对比"
        >
          <Split class="h-3.5 w-3.5" />
          合并对比
        </button>
      </div>

      <!-- 批量决策按钮 -->
      {#if !readonly}
        <div class="flex items-center gap-1.5 border-l border-border pl-2">
          <button
            type="button"
            class="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
            onclick={() => handleBatch('accepted')}
          >
            <Check class="h-3.5 w-3.5" />
            一键全采纳
          </button>
          <button
            type="button"
            class="flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-400"
            onclick={() => handleBatch('rejected')}
          >
            <X class="h-3.5 w-3.5" />
            一键全驳回
          </button>
        </div>
      {/if}

      {#if actions}
        {@render actions()}
      {/if}
    </div>
  </header>

  <!-- 统计指标与过滤条 -->
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5 text-xs">
    <!-- 指标统计 -->
    <div class="flex flex-wrap items-center gap-2 text-muted-foreground">
      <span>总计 <strong class="font-semibold text-foreground">{statistics.total}</strong> 条</span>
      <span class="text-border">|</span>
      <span class="text-emerald-600 dark:text-emerald-400">新增 +{statistics.added}</span>
      <span class="text-rose-600 dark:text-rose-400">删除 -{statistics.removed}</span>
      <span class="text-amber-600 dark:text-amber-400">修改 ~{statistics.modified}</span>
      <span class="text-border">|</span>
      <span>待决 <strong class="text-amber-600 dark:text-amber-400">{statistics.pending}</strong></span>
      <span>已采纳 <strong class="text-emerald-600 dark:text-emerald-400">{statistics.accepted}</strong></span>
      <span>已驳回 <strong class="text-rose-600 dark:text-rose-400">{statistics.rejected}</strong></span>
    </div>

    <!-- 过滤器 -->
    <div class="flex items-center gap-1.5">
      <Filter class="h-3.5 w-3.5 text-muted-foreground" />
      <button
        type="button"
        class={cn(
          'rounded-md px-2 py-0.5 text-xs transition-colors',
          filter === 'all' ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'
        )}
        onclick={() => (filter = 'all')}
      >
        全部
      </button>
      <button
        type="button"
        class={cn(
          'rounded-md px-2 py-0.5 text-xs transition-colors',
          filter === 'changed' ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'
        )}
        onclick={() => (filter = 'changed')}
      >
        仅看变更
      </button>
      <button
        type="button"
        class={cn(
          'rounded-md px-2 py-0.5 text-xs transition-colors',
          filter === 'high_risk' ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'
        )}
        onclick={() => (filter = 'high_risk')}
      >
        高风险条款
      </button>
    </div>
  </div>

  <!-- 主体工作区：左侧目录 + 右侧对比内容 -->
  <div class="grid grid-cols-1 divide-y divide-border lg:grid-cols-12 lg:divide-x lg:divide-y-0">
    <!-- 左侧条款导航列表 (3 列) -->
    <aside class="max-h-[700px] overflow-y-auto p-2 lg:col-span-4 xl:col-span-3">
      <div class="mb-2 px-2 text-xs font-semibold text-muted-foreground">条款目录与风险索引</div>
      <div class="flex flex-col gap-1.5">
        {#each filteredClauses as clause (clause.id)}
          {@const change = getChangeBadge(clause.changeType)}
          {@const risk = getRiskBadge(clause.riskLevel)}
          {@const decision = getDecisionBadge(clause.decision)}
          <button
            type="button"
            class={cn(
              'flex flex-col gap-1 rounded-lg border p-2.5 text-left text-xs transition-colors',
              activeId === clause.id
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-border bg-card hover:bg-muted/40'
            )}
            onclick={() => handleSelect(clause.id)}
          >
            <div class="flex items-center justify-between gap-1.5">
              <span class="font-semibold text-foreground">
                {clause.clauseNumber} {clause.title}
              </span>
              <span class={cn('rounded border px-1.5 py-0.2 text-[10px] font-medium', change.class)}>
                {change.label}
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
              {#if clause.riskLevel}
                <span class={cn('rounded border px-1.5 py-0.2', risk.class)}>
                  {risk.label}
                </span>
              {/if}
              <span class={cn('rounded border px-1.5 py-0.2', decision.class)}>
                {decision.label}
              </span>
              {#if clause.annotations && clause.annotations.length > 0}
                <span class="flex items-center gap-0.5 text-muted-foreground">
                  <MessageSquare class="h-3 w-3" />
                  {clause.annotations.length}
                </span>
              {/if}
            </div>
          </button>
        {/each}

        {#if filteredClauses.length === 0}
          <div class="py-8 text-center text-xs text-muted-foreground">无匹配的合同条款</div>
        {/if}
      </div>
    </aside>

    <!-- 右侧条款比对明细展示区 (9 列) -->
    <main class="flex flex-col divide-y divide-border overflow-hidden lg:col-span-8 xl:col-span-9">
      {#each filteredClauses as clause (clause.id)}
        {#if !activeId || activeId === clause.id}
          {@const change = getChangeBadge(clause.changeType)}
          {@const risk = getRiskBadge(clause.riskLevel)}
          {@const decision = getDecisionBadge(clause.decision)}
          {@const isExpanded = expandedAnnotations[clause.id] ?? false}
          <article class="flex flex-col gap-3 p-4">
            <!-- 条款头：编号、标题、标签与采纳驳回操作 -->
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <h4 class="text-base font-semibold text-foreground">
                  第 {clause.clauseNumber} 条：{clause.title}
                </h4>
                <span class={cn('rounded border px-2 py-0.5 text-xs font-medium', change.class)}>
                  {change.label}
                </span>
                {#if clause.riskLevel}
                  <span class={cn('rounded border px-2 py-0.5 text-xs font-medium', risk.class)}>
                    {risk.label}
                  </span>
                {/if}
              </div>

              <!-- 决策与批注控制 -->
              <div class="flex items-center gap-1.5">
                {#if !readonly}
                  <button
                    type="button"
                    class={cn(
                      'flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      clause.decision === 'accepted'
                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                        : 'border-border bg-card text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600'
                    )}
                    onclick={() => handleDecision(clause.id, 'accepted')}
                    title="采纳修订方案"
                  >
                    <Check class="h-3.5 w-3.5" />
                    采纳
                  </button>
                  <button
                    type="button"
                    class={cn(
                      'flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      clause.decision === 'rejected'
                        ? 'border-rose-500 bg-rose-500 text-white shadow-xs'
                        : 'border-border bg-card text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600'
                    )}
                    onclick={() => handleDecision(clause.id, 'rejected')}
                    title="驳回修订方案"
                  >
                    <X class="h-3.5 w-3.5" />
                    驳回
                  </button>
                {/if}

                <button
                  type="button"
                  class={cn(
                    'flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted',
                    isExpanded ? 'bg-muted text-foreground' : 'bg-card text-muted-foreground'
                  )}
                  onclick={() => toggleAnnotationSection(clause.id)}
                >
                  <MessageSquare class="h-3.5 w-3.5" />
                  批注 ({clause.annotations?.length ?? 0})
                </button>
              </div>
            </div>

            <!-- 对比内容区 -->
            {#if viewMode === 'split'}
              <!-- 双侧对比 -->
              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <!-- 左：基线/原始版本 -->
                <div class="flex flex-col rounded-lg border border-border bg-muted/20 p-3">
                  <div class="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>{originalVersionLabel}</span>
                    <span class="rounded bg-muted px-1.5 py-0.5 text-[10px]">原条款</span>
                  </div>
                  <div class="min-h-[90px] whitespace-pre-wrap text-xs leading-relaxed text-foreground/90 font-mono">
                    {#if clause.originalContent}
                      <span class={cn(clause.changeType === 'modified' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 rounded px-1 py-0.5' : '')}>
                        {clause.originalContent}
                      </span>
                    {:else}
                      <span class="italic text-muted-foreground/60">（原合同中无此条款，属新增项）</span>
                    {/if}
                  </div>
                </div>

                <!-- 右：修订/对手方版本 -->
                <div class="flex flex-col rounded-lg border border-border bg-card p-3">
                  <div class="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>{proposedVersionLabel}</span>
                    <span class="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px]">修订提案</span>
                  </div>
                  <div class="min-h-[90px] whitespace-pre-wrap text-xs leading-relaxed text-foreground font-mono">
                    {#if clause.proposedContent}
                      <span class={cn(
                        clause.changeType === 'modified' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded px-1 py-0.5' : '',
                        clause.changeType === 'added' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded px-1 py-0.5' : ''
                      )}>
                        {clause.proposedContent}
                      </span>
                    {:else}
                      <span class="italic text-muted-foreground/60">（修订案建议删除此条款）</span>
                    {/if}
                  </div>
                </div>
              </div>
            {:else}
              <!-- 单侧合并对比 -->
              <div class="flex flex-col rounded-lg border border-border bg-card p-3 font-mono text-xs leading-relaxed">
                <div class="mb-2 text-xs font-semibold text-muted-foreground">合并比对视图</div>
                {#if clause.changeType === 'unchanged'}
                  <div class="text-foreground">{clause.proposedContent || clause.originalContent}</div>
                {:else}
                  {#if clause.originalContent}
                    <div class="rounded bg-rose-500/10 p-2 text-rose-700 line-through dark:text-rose-300 mb-1.5">
                      - {clause.originalContent}
                    </div>
                  {/if}
                  {#if clause.proposedContent}
                    <div class="rounded bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-300">
                      + {clause.proposedContent}
                    </div>
                  {/if}
                {/if}
              </div>
            {/if}

            <!-- 批注与法务意见区 -->
            {#if isExpanded}
              <div class="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
                <div class="text-xs font-semibold text-foreground">法务与合规批注 ({clause.annotations?.length ?? 0})</div>

                <!-- 批注列表 -->
                {#if clause.annotations && clause.annotations.length > 0}
                  <div class="flex flex-col gap-2">
                    {#each clause.annotations as anno (anno.id)}
                      <div class="flex flex-col gap-1 rounded-md border border-border bg-card p-2 text-xs">
                        <div class="flex items-center justify-between text-muted-foreground">
                          <div class="flex items-center gap-1.5">
                            <span class="font-medium text-foreground">{anno.author}</span>
                            {#if anno.role}
                              <span class="rounded bg-muted px-1.5 py-0.2 text-[10px]">{anno.role}</span>
                            {/if}
                          </div>
                          <span class="text-[10px]">{anno.timestamp}</span>
                        </div>
                        <p class="text-foreground/90">{anno.content}</p>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="py-2 text-xs text-muted-foreground">暂想法务批注记录</div>
                {/if}

                <!-- 追加批注输入框 -->
                {#if !readonly}
                  <div class="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      class="h-8 flex-1 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="针对该条款添加法务合规意见..."
                      bind:value={newAnnotationInputs[clause.id]}
                      onkeydown={(e) => {
                        if (e.key === 'Enter') handleSendAnnotation(clause.id);
                      }}
                    />
                    <button
                      type="button"
                      class="flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      onclick={() => handleSendAnnotation(clause.id)}
                    >
                      <Send class="h-3 w-3" />
                      发表
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
          </article>
        {/if}
      {/each}
    </main>
  </div>
</div>
