export type EnterpriseMaturityTier = 'P0' | 'P1' | 'P2';
export type EnterpriseMaturityStatus = 'stable' | 'verified' | 'experimental' | 'planned';

export interface EnterpriseMaturityEntry {
  readonly id: string;
  readonly tier: EnterpriseMaturityTier;
  readonly status: EnterpriseMaturityStatus;
  readonly surfaces: readonly string[];
  readonly acceptance: readonly string[];
}

export const ENTERPRISE_MATURITY: readonly EnterpriseMaturityEntry[] = [
  {
    id: 'platform-foundation',
    tier: 'P0',
    status: 'stable',
    surfaces: ['AdminApp', 'ProviderBundle', 'SSR', 'Lite'],
    acceptance: ['公共契约可类型检查', '失败状态不伪造成功', '关键路径有 SSR 和 Lite 证据'],
  },
  {
    id: 'resource-operations',
    tier: 'P0',
    status: 'stable',
    surfaces: ['CRUD', 'AutoTable', 'AutoForm', 'Import', 'Export'],
    acceptance: ['资源读写、表格、表单和批量数据操作有直接行为测试'],
  },
  {
    id: 'governance-and-audit',
    tier: 'P0',
    status: 'stable',
    surfaces: ['Permissions', 'Tenant', 'Audit', 'Session'],
    acceptance: ['操作按租户和权限边界执行，并保留可追踪回执'],
  },
  {
    id: 'competitive-workflows',
    tier: 'P1',
    status: 'verified',
    surfaces: ['AdvancedTable', 'SavedViews', 'ImportWizard', 'TaskQueue', 'Approval', 'VersionDiff', 'Dashboard', 'MultiTab'],
    acceptance: ['跨 UI/Core/Lite 聚焦测试覆盖异步回执和错误边界'],
  },
  {
    id: 'extension-modules',
    tier: 'P2',
    status: 'experimental',
    surfaces: ['Kanban', 'Gantt', 'Pivot', 'Spreadsheet', 'DecisionTable', 'PDF', 'Print', 'Signature', 'Annotation', 'Media', 'Collaboration', 'OfflineSync'],
    acceptance: ['按场景逐项完成 API、SSR/Lite、集成和线上验收后再升级状态'],
  },
] as const;

export function enterpriseMaturityFor(
  tier: EnterpriseMaturityTier,
): readonly EnterpriseMaturityEntry[] {
  return ENTERPRISE_MATURITY.filter((entry) => entry.tier === tier);
}
