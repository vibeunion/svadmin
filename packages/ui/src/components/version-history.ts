import type { DetailWorkspaceVersionData } from './detail-workspace';

/** 显式存储的记录版本。快照必须是普通 JSON 对象，不包含恢复或合并动作。 */
export interface StoredRecordVersion {
  id: string;
  version: number;
  title?: string;
  snapshot: Record<string, unknown>;
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 把已选版本映射成详情区现有的 old/new 载荷。
 * 选中项是 newValue，按版本号紧邻的上一条是 oldValue；没有上一条时旧值为空对象。
 * 未知选择、重复版本号或非普通对象快照都返回 null，不猜测差异。
 */
export function selectRecordVersion(
  versions: readonly StoredRecordVersion[],
  selectedId: string,
): DetailWorkspaceVersionData | null {
  if (selectedId.length === 0) return null;
  const versionNumbers = new Set<number>();
  for (const item of versions) {
    if (!Number.isInteger(item.version) || versionNumbers.has(item.version) || !plainRecord(item.snapshot)) return null;
    versionNumbers.add(item.version);
  }
  const ordered = [...versions].sort((left, right) => left.version - right.version);
  const index = ordered.findIndex(item => item.id === selectedId);
  if (index < 0) return null;
  const selected = ordered[index];
  const previous = index > 0 ? ordered[index - 1] : undefined;
  if (!selected || !plainRecord(selected.snapshot)) return null;
  return {
    oldValue: previous?.snapshot ?? {},
    newValue: selected.snapshot,
    ...(previous?.title === undefined ? {} : { oldTitle: previous.title }),
    ...(selected.title === undefined ? {} : { newTitle: selected.title }),
  };
}
