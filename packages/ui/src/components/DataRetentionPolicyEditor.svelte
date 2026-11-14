<script lang="ts">
  import type {
    RetentionAction,
    RetentionStatus,
    RetentionPolicy,
  } from './retention-utils.js';
  import {
    calculateRetentionMetrics,
    detectPolicyConflicts,
  } from './retention-utils.js';

  export interface DataRetentionPolicyEditorProps {
    policies?: RetentionPolicy[];
    class?: string;
    onSave?: (policies: RetentionPolicy[]) => void;
    onRunManualArchive?: (policy: RetentionPolicy) => void;
  }

  const {
    policies: initialPolicies = [],
    class: className = '',
    onSave,
    onRunManualArchive,
  }: DataRetentionPolicyEditorProps = $props();

  // Internal reactive policies
  let policyList = $state<RetentionPolicy[]>([]);

  $effect(() => {
    policyList = initialPolicies.length > 0
      ? initialPolicies.map(p => ({ ...p }))
      : [
          {
            id: 'ret-1',
            name: '用户操作审计日志留存归档',
            resource: 'audit_logs',
            retentionDays: 180,
            action: 'archive_cold_storage',
            status: 'active',
            targetStorage: 's3://corp-compliance-vault/audit_logs/',
            filterCondition: "event_level != 'CRITICAL_SECURITY'",
            estimatedRows: 1450000,
            estimatedStorageMb: 3600,
            lastExecutedAt: '2026-11-15 02:00',
            scheduleCron: '0 2 * * *',
          },
          {
            id: 'ret-2',
            name: '临时数据导出报表定期物理销毁',
            resource: 'temp_exports',
            retentionDays: 7,
            action: 'hard_delete',
            status: 'active',
            estimatedRows: 4200,
            estimatedStorageMb: 8500,
            lastExecutedAt: '2026-11-15 03:00',
            scheduleCron: '0 3 * * *',
          },
          {
            id: 'ret-3',
            name: '已注销企业租户数据脱敏归档',
            resource: 'tenant_records',
            retentionDays: 365,
            action: 'mask_and_archive',
            status: 'active',
            targetStorage: 's3://corp-glacier-cold/tenant_archive/',
            filterCondition: "tenant_status = 'deleted'",
            estimatedRows: 86000,
            estimatedStorageMb: 1200,
            lastExecutedAt: '2026-11-01 04:00',
            scheduleCron: '0 4 1 * *',
          },
          {
            id: 'ret-4',
            name: '已读站内系统通知定时软清理',
            resource: 'notifications',
            retentionDays: 90,
            action: 'soft_delete',
            status: 'paused',
            filterCondition: 'is_read = true',
            estimatedRows: 220000,
            estimatedStorageMb: 450,
          },
        ];
  });

  const metrics = $derived(calculateRetentionMetrics(policyList));
  const conflicts = $derived(detectPolicyConflicts(policyList));

  // Edit / Add Modal state
  let isEditing = $state(false);
  let editId = $state('');
  let editName = $state('');
  let editResource = $state('audit_logs');
  let editDays = $state(180);
  let editAction = $state<RetentionAction>('archive_cold_storage');
  let editTargetStorage = $state('');
  let editCondition = $state('');

  // Search & Filter
  let searchQuery = $state('');
  let filterAction = $state<'ALL' | RetentionAction>('ALL');

  const filteredPolicies = $derived.by(() => {
    return policyList.filter((p) => {
      if (filterAction !== 'ALL' && p.action !== filterAction) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesResource = p.resource.toLowerCase().includes(q);
        if (!matchesName && !matchesResource) return false;
      }
      return true;
    });
  });

  function openCreateModal() {
    editId = `ret-${Date.now()}`;
    editName = '';
    editResource = 'audit_logs';
    editDays = 180;
    editAction = 'archive_cold_storage';
    editTargetStorage = 's3://corp-compliance-vault/';
    editCondition = '';
    isEditing = true;
  }

  function openEditModal(p: RetentionPolicy) {
    editId = p.id;
    editName = p.name;
    editResource = p.resource;
    editDays = p.retentionDays;
    editAction = p.action;
    editTargetStorage = p.targetStorage || '';
    editCondition = p.filterCondition || '';
    isEditing = true;
  }

  function savePolicy() {
    if (!editName.trim()) return;
    const existingIndex = policyList.findIndex(p => p.id === editId);
    const item: RetentionPolicy = {
      id: editId,
      name: editName.trim(),
      resource: editResource.trim(),
      retentionDays: editDays,
      action: editAction,
      status: 'active',
      targetStorage: editTargetStorage.trim() || undefined,
      filterCondition: editCondition.trim() || undefined,
      estimatedRows: 10000,
      estimatedStorageMb: 500,
    };

    if (existingIndex >= 0) {
      policyList[existingIndex] = { ...policyList[existingIndex], ...item };
    } else {
      policyList = [...policyList, item];
    }

    onSave?.($state.snapshot(policyList));
    isEditing = false;
  }

  function toggleStatus(policy: RetentionPolicy) {
    policy.status = policy.status === 'active' ? 'paused' : 'active';
    onSave?.($state.snapshot(policyList));
  }

  function deletePolicy(id: string) {
    policyList = policyList.filter(p => p.id !== id);
    onSave?.($state.snapshot(policyList));
  }

  function handleTriggerManual(p: RetentionPolicy) {
    onRunManualArchive?.(p);
  }

  function getActionBadge(act: RetentionAction) {
    switch (act) {
      case 'hard_delete':
        return 'bg-destructive/15 text-destructive border-destructive/25';
      case 'archive_cold_storage':
        return 'bg-primary/15 text-primary border-primary/25';
      case 'mask_and_archive':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25';
      case 'soft_delete':
        return 'bg-muted text-muted-foreground border-border';
    }
  }

  function getActionLabel(act: RetentionAction) {
    switch (act) {
      case 'hard_delete':
        return '物理销毁 (Hard Delete)';
      case 'archive_cold_storage':
        return '冷存储归档 (Glacier/S3)';
      case 'mask_and_archive':
        return '脱敏后归档 (Mask & Archive)';
      case 'soft_delete':
        return '软删除标记 (Soft Delete)';
    }
  }
</script>

<div
  class="w-full flex flex-col gap-6 p-6 bg-background text-foreground rounded-xl border border-border shadow-sm {className}"
  data-svadmin-component="DataRetentionPolicyEditor"
  data-svadmin-resource="data_retention_policies"
>
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <h2 class="text-xl font-bold tracking-tight text-foreground">数据生命周期与合规归档中心 (Retention Studio)</h2>
        <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
          GDPR & 等保 2.0 合规
        </span>
      </div>
      <p class="text-sm text-muted-foreground">
        配置资源数据留存期限（Retention Policy），支持自动下沉至冷存储、定期物理安全擦除与合规审计报表生成。
      </p>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={openCreateModal}
        class="inline-flex items-center justify-center text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
      >
        <svg class="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        新建留存规则
      </button>
    </div>
  </div>

  <!-- Conflict Warnings Banner -->
  {#if conflicts.length > 0}
    <div class="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex flex-col gap-1 text-xs text-amber-700 dark:text-amber-400">
      <span class="font-bold flex items-center gap-1.5">
        ⚠️ 检测到规则重叠与潜在冲突提示:
      </span>
      {#each conflicts as warn}
        <p class="text-[11px] leading-relaxed pl-4">• {warn}</p>
      {/each}
    </div>
  {/if}

  <!-- Metrics Strip -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <div class="p-3 rounded-lg bg-card border border-border flex flex-col gap-1">
      <span class="text-xs text-muted-foreground">活跃生命周期策略</span>
      <span class="text-xl font-bold text-foreground">
        {metrics.activePolicies} <span class="text-xs text-muted-foreground font-normal">/ {metrics.totalPolicies} 条</span>
      </span>
    </div>
    <div class="p-3 rounded-lg bg-card border border-border flex flex-col gap-1">
      <span class="text-xs text-muted-foreground">月度预估受影响数据</span>
      <span class="text-xl font-bold text-primary font-mono">
        {(metrics.totalEstimatedRows / 10000).toFixed(1)} 万行
      </span>
    </div>
    <div class="p-3 rounded-lg bg-card border border-border flex flex-col gap-1">
      <span class="text-xs text-muted-foreground">预计释放线上存储</span>
      <span class="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
        {metrics.totalEstimatedStorageGb} GB
      </span>
    </div>
    <div class="p-3 rounded-lg bg-card border border-border flex flex-col gap-1">
      <span class="text-xs text-muted-foreground">转存入冷存储体量</span>
      <span class="text-xl font-bold text-foreground font-mono">
        {metrics.archivedToColdStorageGb} GB
      </span>
    </div>
  </div>

  <!-- Filters & Search -->
  <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
    <div class="relative flex-1 max-w-sm">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="搜索策略名称、对应数据资源..."
        class="w-full px-3 py-2 pl-8 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <svg class="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>

    <div class="flex items-center gap-2">
      <select
        bind:value={filterAction}
        class="px-2.5 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="ALL">全部处置策略</option>
        <option value="archive_cold_storage">冷存储归档</option>
        <option value="hard_delete">物理安全销毁</option>
        <option value="mask_and_archive">脱敏后归档</option>
        <option value="soft_delete">软删除标记</option>
      </select>
    </div>
  </div>

  <!-- Policies Table -->
  <div class="rounded-xl border border-border bg-card overflow-hidden text-xs">
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
          <th class="p-3 text-left">策略名称 / 资源</th>
          <th class="p-3 text-center">留存期限</th>
          <th class="p-3 text-left">到期处置动作</th>
          <th class="p-3 text-left">归档存储 / 过滤条件</th>
          <th class="p-3 text-right">预估数据量</th>
          <th class="p-3 text-center">状态</th>
          <th class="p-3 text-right">操作</th>
        </tr>
      </thead>
      <tbody>
        {#if filteredPolicies.length === 0}
          <tr>
            <td colspan="7" class="p-8 text-center text-muted-foreground">没有找到匹配的数据生命周期策略</td>
          </tr>
        {:else}
          {#each filteredPolicies as item (item.id)}
            <tr class="border-b border-border/60 hover:bg-muted/20 transition-colors">
              <td class="p-3">
                <div class="flex flex-col gap-0.5">
                  <span class="font-semibold text-foreground">{item.name}</span>
                  <span class="text-[11px] font-mono text-muted-foreground">Resource: {item.resource}</span>
                </div>
              </td>
              <td class="p-3 text-center font-mono font-bold text-foreground">
                {item.retentionDays} 天
              </td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-[11px] font-medium border {getActionBadge(item.action)}">
                  {getActionLabel(item.action)}
                </span>
              </td>
              <td class="p-3">
                <div class="flex flex-col gap-0.5 max-w-xs font-mono text-[10px] text-muted-foreground">
                  {#if item.targetStorage}
                    <span class="truncate">存储: {item.targetStorage}</span>
                  {/if}
                  {#if item.filterCondition}
                    <span class="truncate">过滤: {item.filterCondition}</span>
                  {/if}
                </div>
              </td>
              <td class="p-3 text-right font-mono">
                <div class="flex flex-col items-end">
                  <span class="text-foreground">{item.estimatedRows.toLocaleString()} 行</span>
                  <span class="text-[10px] text-muted-foreground">约 {(item.estimatedStorageMb / 1024).toFixed(2)} GB</span>
                </div>
              </td>
              <td class="p-3 text-center">
                <button
                  type="button"
                  onclick={() => toggleStatus(item)}
                  class="text-[11px] px-2 py-0.5 rounded font-medium transition-colors {item.status === 'active' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}"
                >
                  {item.status === 'active' ? '已生效' : '已暂停'}
                </button>
              </td>
              <td class="p-3 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onclick={() => handleTriggerManual(item)}
                    class="px-2 py-1 rounded border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                  >
                    测试执行
                  </button>
                  <button
                    type="button"
                    onclick={() => openEditModal(item)}
                    class="px-2 py-1 rounded text-primary hover:bg-primary/10 transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onclick={() => deletePolicy(item.id)}
                    class="px-2 py-1 rounded text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Create / Edit Modal -->
  {#if isEditing}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-xl flex flex-col gap-4 text-foreground text-xs">
        <div class="flex items-center justify-between pb-2 border-b border-border">
          <h3 class="font-bold text-sm text-foreground">
            {editId.startsWith('ret-') && editName === '' ? '新建数据生命周期规则' : '编辑数据生命周期规则'}
          </h3>
          <button type="button" onclick={() => (isEditing = false)} class="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label for="policy-name-input" class="font-semibold text-foreground">规则名称</label>
            <input
              id="policy-name-input"
              type="text"
              bind:value={editName}
              placeholder="例如：系统操作日志定期冷存储归档"
              class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground"
            />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1">
              <label for="policy-resource-input" class="font-semibold text-foreground">目标数据资源 (Resource)</label>
              <input
                id="policy-resource-input"
                type="text"
                bind:value={editResource}
                placeholder="audit_logs"
                class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="policy-days-input" class="font-semibold text-foreground">保留期限 (天数)</label>
              <input
                id="policy-days-input"
                type="number"
                bind:value={editDays}
                min="1"
                class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono"
              />
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label for="policy-action-select" class="font-semibold text-foreground">到期处置动作</label>
            <select
              id="policy-action-select"
              bind:value={editAction}
              class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground"
            >
              <option value="archive_cold_storage">冷存储归档 (转存至 S3 Glacier / OSS 冷存)</option>
              <option value="hard_delete">物理安全擦除 (不可恢复的物理销毁)</option>
              <option value="mask_and_archive">脱敏后归档 (擦除敏感信息保留统计属性)</option>
              <option value="soft_delete">软删除标记 (保留数据记录打上 deleted 标记)</option>
            </select>
          </div>

          {#if editAction === 'archive_cold_storage' || editAction === 'mask_and_archive'}
            <div class="flex flex-col gap-1">
              <label for="policy-storage-input" class="font-semibold text-foreground">归档目标存储路径</label>
              <input
                id="policy-storage-input"
                type="text"
                bind:value={editTargetStorage}
                placeholder="s3://corp-compliance-vault/archive/"
                class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono"
              />
            </div>
          {/if}

          <div class="flex flex-col gap-1">
            <label for="policy-filter-input" class="font-semibold text-foreground">条件过滤器 (可选 SQL/DSL 表达式)</label>
            <input
              id="policy-filter-input"
              type="text"
              bind:value={editCondition}
              placeholder="event_level != 'CRITICAL'"
              class="px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button type="button" onclick={() => (isEditing = false)} class="px-3 py-1.5 rounded border border-border bg-card">取消</button>
          <button type="button" onclick={savePolicy} class="px-3 py-1.5 rounded bg-primary text-primary-foreground font-semibold">保存规则</button>
        </div>
      </div>
    </div>
  {/if}
</div>
