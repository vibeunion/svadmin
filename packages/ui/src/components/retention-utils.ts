export type RetentionAction = 'hard_delete' | 'soft_delete' | 'archive_cold_storage' | 'mask_and_archive';
export type RetentionStatus = 'active' | 'paused' | 'draft';

export interface RetentionPolicy {
  id: string;
  name: string;
  resource: string;
  retentionDays: number;
  action: RetentionAction;
  status: RetentionStatus;
  targetStorage?: string; // e.g. "s3://corp-archive-glacier/2026/"
  filterCondition?: string; // e.g. "status = 'resolved'"
  estimatedRows: number;
  estimatedStorageMb: number;
  lastExecutedAt?: string;
  scheduleCron?: string;
}

export interface RetentionSummaryMetrics {
  totalPolicies: number;
  activePolicies: number;
  totalEstimatedRows: number;
  totalEstimatedStorageGb: number;
  archivedToColdStorageGb: number;
}

/**
 * 汇总统计所有生命周期策略的预估受影响量与节省存储指标
 */
export function calculateRetentionMetrics(policies: RetentionPolicy[]): RetentionSummaryMetrics {
  const activeList = policies.filter(p => p.status === 'active');
  const totalRows = activeList.reduce((acc, curr) => acc + curr.estimatedRows, 0);
  const totalStorageMb = activeList.reduce((acc, curr) => acc + curr.estimatedStorageMb, 0);
  const coldStorageMb = activeList
    .filter(p => p.action === 'archive_cold_storage' || p.action === 'mask_and_archive')
    .reduce((acc, curr) => acc + curr.estimatedStorageMb, 0);

  return {
    totalPolicies: policies.length,
    activePolicies: activeList.length,
    totalEstimatedRows: totalRows,
    totalEstimatedStorageGb: Number((totalStorageMb / 1024).toFixed(2)),
    archivedToColdStorageGb: Number((coldStorageMb / 1024).toFixed(2)),
  };
}

/**
 * 检测同一资源是否存在潜在冲突的留存策略（同资源同状态同动作）
 */
export function detectPolicyConflicts(policies: RetentionPolicy[]): string[] {
  const warnings: string[] = [];
  const map = new Map<string, RetentionPolicy[]>();

  for (const p of policies) {
    if (p.status !== 'active') continue;
    const list = map.get(p.resource) || [];
    list.push(p);
    map.set(p.resource, list);
  }

  for (const [resource, list] of map.entries()) {
    if (list.length > 1) {
      warnings.push(`资源 "${resource}" 存在 ${list.length} 条并发执行的活跃留存策略，请确保过滤条件互斥。`);
    }
  }

  return warnings;
}
