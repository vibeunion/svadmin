<script lang="ts">
  import { untrack } from 'svelte';
  export interface OffboardingEmployee {
    id: string;
    name: string;
    department: string;
    role: string;
    lastWorkingDate: string;
    avatarUrl?: string;
    handoverTarget: string;
  }

  export type OffboardingCategory = 'hardware' | 'document' | 'account' | 'finance' | 'project';
  export type OffboardingItemStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

  export interface OffboardingItem {
    id: string;
    category: OffboardingCategory;
    title: string;
    description: string;
    status: OffboardingItemStatus;
    assignee: string;
    updatedAt: string;
    blockedReason?: string;
  }

  export interface SignoffStatus {
    hrApproved: boolean;
    managerApproved: boolean;
    itApproved: boolean;
    financeApproved: boolean;
  }

  interface Props {
    employee: OffboardingEmployee;
    items?: OffboardingItem[];
    signoffStatus?: SignoffStatus;
    canSignoff?: boolean;
    onItemStatusChange?: (item: OffboardingItem, newStatus: OffboardingItemStatus, reason?: string) => void;
    onSignoff?: (role: 'hr' | 'manager' | 'it' | 'finance') => void;
    onExportAuditReport?: () => void;
  }

  const {
    employee,
    items = [],
    signoffStatus = {
      hrApproved: false,
      managerApproved: false,
      itApproved: false,
      financeApproved: false,
    },
    canSignoff = true,
    onItemStatusChange,
    onSignoff,
    onExportAuditReport,
  }: Props = $props();

  let selectedCategory = $state<'all' | OffboardingCategory>('all');
  let blockingModalItemId = $state<string | null>(null);
  let blockingReasonInput = $state('');
  let blockingEmployeeId = $state<string | null>(null);
  let observedEmployeeId = untrack(() => employee.id);
  $effect.pre(() => {
    if (employee.id === observedEmployeeId) return;
    observedEmployeeId = employee.id;
    blockingModalItemId = null;
    blockingEmployeeId = null;
    blockingReasonInput = '';
    selectedCategory = 'all';
  });
  const handoverComplete = $derived(items.every(item => item.status === 'completed'));

  const filteredItems = $derived(
    selectedCategory === 'all'
      ? items
      : items.filter((item) => item.category === selectedCategory),
  );

  const totalCount = $derived(items.length);
  const completedCount = $derived(items.filter((i) => i.status === 'completed').length);
  const blockedCount = $derived(items.filter((i) => i.status === 'blocked').length);
  const progressPercent = $derived(
    totalCount === 0 ? 100 : Math.round((completedCount / totalCount) * 100),
  );

  const allSignedOff = $derived(
    signoffStatus.hrApproved &&
      signoffStatus.managerApproved &&
      signoffStatus.itApproved &&
      signoffStatus.financeApproved,
  );

  function getCategoryLabel(category: OffboardingCategory): string {
    switch (category) {
      case 'hardware':
        return '硬件设备';
      case 'document':
        return '文档资料';
      case 'account':
        return '账号权限';
      case 'finance':
        return '财务报销';
      case 'project':
        return '业务交接';
      default:
        return category;
    }
  }

  function getStatusLabel(status: OffboardingItemStatus): string {
    switch (status) {
      case 'completed':
        return '已交接';
      case 'in_progress':
        return '进行中';
      case 'blocked':
        return '阻断违规';
      case 'pending':
      default:
        return '待交接';
    }
  }

  function handleMarkStatus(item: OffboardingItem, newStatus: OffboardingItemStatus) {
    if (newStatus === 'blocked') {
      blockingModalItemId = item.id;
      blockingEmployeeId = employee.id;
      blockingReasonInput = '';
    } else {
      onItemStatusChange?.(item, newStatus);
    }
  }

  function confirmBlockItem() {
    if (!blockingModalItemId || blockingEmployeeId !== employee.id || !blockingReasonInput.trim()) return;
    const targetItem = items.find((i) => i.id === blockingModalItemId);
    if (targetItem) {
      onItemStatusChange?.(targetItem, 'blocked', blockingReasonInput.trim());
    }
    blockingModalItemId = null;
    blockingEmployeeId = null;
    blockingReasonInput = '';
  }

  function cancelBlockModal() {
    blockingModalItemId = null;
    blockingEmployeeId = null;
    blockingReasonInput = '';
  }

  function signOff(role: 'hr' | 'manager' | 'it' | 'finance') {
    const approved = { hr: signoffStatus.hrApproved, manager: signoffStatus.managerApproved,
      it: signoffStatus.itApproved, finance: signoffStatus.financeApproved };
    if (!canSignoff || !handoverComplete || approved[role] || !onSignoff) return;
    onSignoff(role);
  }
</script>

<div
  class="flex flex-col gap-5 rounded-xl border border-border/80 bg-card p-6 text-card-foreground shadow-sm transition-all"
  data-svadmin-component="EmployeeOffboardingAuditor"
>
  <!-- 顶部离职员工摘要卡片 -->
  <header class="flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/20 p-5 md:flex-row md:items-center md:justify-between">
    <div class="flex items-center gap-4">
      <div
        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border/60 bg-primary/10 text-xl font-bold text-primary shadow-inner"
        role="img"
        aria-label={employee.name}
      >
        {#if employee.avatarUrl}
          <span
            class="h-full w-full rounded-full bg-cover bg-center"
            style="background-image: url('{employee.avatarUrl}')"
          ></span>
        {:else}
          {employee.name.slice(0, 1).toUpperCase()}
        {/if}
      </div>
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-semibold tracking-tight">{employee.name}</h2>
          <span class="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {employee.department} · {employee.role}
          </span>
        </div>
        <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>离职日期: <strong class="font-medium text-foreground">{employee.lastWorkingDate}</strong></span>
          <span>交接责任人: <strong class="font-medium text-foreground">{employee.handoverTarget}</strong></span>
          <span>员工工号: <code class="rounded bg-muted px-1.5 py-0.5 font-mono">{employee.id}</code></span>
        </div>
      </div>
    </div>

    <!-- 总体交接进度仪表 -->
    <div class="flex flex-col items-start gap-1.5 md:items-end">
      <div class="flex items-center gap-2 text-sm">
        <span class="text-xs text-muted-foreground">总交接进度:</span>
        <span class="font-bold tabular-nums text-primary">{progressPercent}%</span>
        <span class="text-xs text-muted-foreground">({completedCount}/{totalCount})</span>
        {#if blockedCount > 0}
          <span class="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
            {blockedCount} 项阻断
          </span>
        {/if}
      </div>
      <div class="h-2 w-48 overflow-hidden rounded-full bg-muted">
        <div
          class="h-full rounded-full bg-primary transition-all duration-300"
          style="width: {progressPercent}%;"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        ></div>
      </div>
    </div>
  </header>

  <!-- 分类过滤选项卡与工具栏 -->
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
    <div class="flex flex-wrap items-center gap-1.5" role="tablist">
      {#each [
        { key: 'all', label: '全部事项' },
        { key: 'hardware', label: '硬件设备' },
        { key: 'document', label: '文档资料' },
        { key: 'account', label: '系统权限' },
        { key: 'finance', label: '财务报销' },
        { key: 'project', label: '业务交接' },
      ] as tab (tab.key)}
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === tab.key}
          class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {selectedCategory === tab.key
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}"
          onclick={() => (selectedCategory = tab.key as 'all' | OffboardingCategory)}
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted/80 focus:outline-hidden"
        onclick={onExportAuditReport}
      >
        <svg class="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        导出离职审计报告
      </button>
    </div>
  </div>

  <!-- 事项清单网格 -->
  <section class="flex flex-col divide-y divide-border/40 rounded-lg border border-border/60 bg-background" aria-label="交接事项清单">
    {#if filteredItems.length === 0}
      <div class="py-12 text-center text-xs text-muted-foreground">
        暂无符合分类的离职交接条目
      </div>
    {:else}
      {#each filteredItems as item (item.id)}
        <article class="flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-muted/10 sm:flex-row sm:items-center">
          <div class="flex flex-col gap-1 sm:max-w-[65%]">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                {getCategoryLabel(item.category)}
              </span>
              <h3 class="text-sm font-semibold tracking-tight text-foreground">{item.title}</h3>
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-medium {item.status === 'completed'
                  ? 'bg-success/15 text-success dark:text-success'
                  : item.status === 'in_progress'
                  ? 'bg-info/15 text-info dark:text-info'
                  : item.status === 'blocked'
                  ? 'bg-destructive/15 text-destructive font-semibold'
                  : 'bg-muted text-muted-foreground'}"
              >
                {getStatusLabel(item.status)}
              </span>
            </div>
            <p class="text-xs text-muted-foreground">{item.description}</p>
            {#if item.status === 'blocked' && item.blockedReason}
              <div class="mt-1 rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                <strong>阻断原因:</strong> {item.blockedReason}
              </div>
            {/if}
            <div class="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>对接人: <strong class="text-foreground">{item.assignee}</strong></span>
              <span>更新时间: {item.updatedAt}</span>
            </div>
          </div>

          <!-- 操作按钮组 -->
          <div class="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              class="rounded border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              disabled={item.status === 'in_progress'}
              onclick={() => handleMarkStatus(item, 'in_progress')}
            >
              设为交接中
            </button>
            <button
              type="button"
              class="rounded border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-50 dark:text-success"
              disabled={item.status === 'completed'}
              onclick={() => handleMarkStatus(item, 'completed')}
            >
              确认交接完成
            </button>
            <button
              type="button"
              class="rounded border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
              disabled={item.status === 'blocked'}
              onclick={() => handleMarkStatus(item, 'blocked')}
            >
              阻断异常
            </button>
          </div>
        </article>
      {/each}
    {/if}
  </section>

  <!-- 阻断原因填写弹层 Modal -->
  {#if blockingModalItemId}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs">
      <div class="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 class="text-base font-semibold text-foreground">标记交接事项阻断与异常</h3>
        <p class="mt-1 text-xs text-muted-foreground">请填写阻断原因（如资产损坏、资料未清、账务不平等），交接流程将暂停至异常解除。</p>
        <textarea
          class="mt-3 w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
          rows="3"
          placeholder="请输入详细阻断原因..."
          bind:value={blockingReasonInput}
        ></textarea>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            onclick={cancelBlockModal}
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
            onclick={confirmBlockItem}
            disabled={!blockingReasonInput.trim()}
          >
            确认阻断
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- 四方签署会签矩阵 -->
  <footer class="mt-2 rounded-lg border border-border/70 bg-muted/20 p-4">
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">多部门离职归档联合签署 (Sign-off Matrix)</h4>
        <span class="text-xs font-medium {allSignedOff ? 'text-success dark:text-success' : 'text-warning dark:text-warning'}">
          {allSignedOff ? '✓ 四方签署已就绪' : '等待全部门签核'}
        </span>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {#each [
          { key: 'manager', label: '直属部门主管', approved: signoffStatus.managerApproved },
          { key: 'it', label: 'IT 信息技术部', approved: signoffStatus.itApproved },
          { key: 'finance', label: '财务资产部', approved: signoffStatus.financeApproved },
          { key: 'hr', label: '人力资源 HR', approved: signoffStatus.hrApproved },
        ] as dept (dept.key)}
          <div class="flex flex-col justify-between rounded border border-border/60 bg-background p-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-foreground">{dept.label}</span>
              <span
                class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold {dept.approved
                  ? 'bg-success/15 text-success dark:text-success'
                  : 'bg-muted text-muted-foreground'}"
              >
                {dept.approved ? '已签署' : '待签署'}
              </span>
            </div>
            <button
              type="button"
              class="mt-3 w-full rounded border border-border/80 bg-muted/40 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
              disabled={dept.approved || !canSignoff || !handoverComplete || !onSignoff}
              onclick={() => signOff(dept.key as 'hr' | 'manager' | 'it' | 'finance')}
            >
              {dept.approved ? '已确认' : '点击盖章签署'}
            </button>
          </div>
        {/each}
      </div>
    </div>
  </footer>
</div>
