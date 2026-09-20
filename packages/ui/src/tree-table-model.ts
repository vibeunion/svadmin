export type TreeTableId = string | number;

export interface TreeTableSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface TreeTableNode {
  record: Record<string, unknown>;
  id: TreeTableId;
  parent: TreeTableId | undefined;
  children: TreeTableId[];
  level: number;
  disabled: boolean;
}

export function compareTreeTableValues(left: unknown, right: unknown): number {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  if (typeof left === 'number' && typeof right === 'number') {
    if (Number.isNaN(left) && Number.isNaN(right)) return 0;
    if (Number.isNaN(left)) return -1;
    if (Number.isNaN(right)) return 1;
    return left - right;
  }
  return treeTableText(left).localeCompare(treeTableText(right), undefined, { numeric: true, sensitivity: 'base' });
}

function treeTableText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value) : '';
}

export function filterTreeTableData(
  data: Record<string, unknown>[],
  search: string,
  keys: string[],
  childrenKey: string,
): Record<string, unknown>[] {
  const needle = search.trim().toLocaleLowerCase();
  if (!needle) return data;
  const matches = (record: Record<string, unknown>): boolean =>
    keys.some(key => treeTableText(record[key]).toLocaleLowerCase().includes(needle));
  const visit = (record: Record<string, unknown>): Record<string, unknown> | undefined => {
    if (matches(record)) return record;
    const children = Array.isArray(record[childrenKey])
      ? record[childrenKey].filter((item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && !Array.isArray(item))
      : [];
    const keptChildren = children.map(visit).filter((item): item is Record<string, unknown> => item !== undefined);
    if (keptChildren.length === 0) return undefined;
    return keptChildren.length > 0
      ? { ...record, [childrenKey]: keptChildren }
      : record;
  };
  return data.map(visit).filter((item): item is Record<string, unknown> => item !== undefined);
}

export function sortTreeTableData(
  data: Record<string, unknown>[],
  sort: TreeTableSort | undefined,
  childrenKey: string,
): Record<string, unknown>[] {
  if (!sort) return data;
  const direction = sort.direction === 'desc' ? -1 : 1;
  const visit = (records: Record<string, unknown>[]): Record<string, unknown>[] => records
    .map(record => {
      const children = Array.isArray(record[childrenKey])
        ? visit(record[childrenKey].filter((item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null && !Array.isArray(item)))
        : undefined;
      return children ? { ...record, [childrenKey]: children } : record;
    })
    .sort((left, right) => direction * compareTreeTableValues(left[sort.key], right[sort.key]));
  return visit(data);
}

export function indexTreeTable(
  data: Record<string, unknown>[],
  primaryKey: string,
  childrenKey: string,
  loadedChildren?: ReadonlyMap<TreeTableId, Record<string, unknown>[]>,
): { valid: boolean; nodes: Map<TreeTableId, TreeTableNode> } {
  const nodes = new Map<TreeTableId, TreeTableNode>();
  const invalid = () => ({ valid: false, nodes: new Map<TreeTableId, TreeTableNode>() });
  if (!Array.isArray(data) || data.length > 10000) return invalid();
  const stack: { record: unknown; parent: TreeTableId | undefined; level: number }[] =
    data.map(record => ({ record, parent: undefined, level: 0 })).reverse();
  while (stack.length) {
    const item = stack.pop();
    if (!item) break;
    if (item.level > 64 || nodes.size >= 10000 || typeof item.record !== 'object'
      || item.record === null || Array.isArray(item.record)) return invalid();
    const record = item.record as Record<string, unknown>;
    const id = record[primaryKey];
    if (typeof id !== 'string' && (typeof id !== 'number' || !Number.isFinite(id))) return invalid();
    if (nodes.has(id)) return invalid();
    const children = loadedChildren?.get(id) ?? record[childrenKey];
    if (children != null && (!Array.isArray(children) || children.length > 10000)) return invalid();
    const node: TreeTableNode = {
      id, record, parent: item.parent, children: [], level: item.level,
      disabled: record['disabled'] === true || (item.parent !== undefined && nodes.get(item.parent)?.disabled === true),
    };
    nodes.set(id, node);
    if (item.parent !== undefined) nodes.get(item.parent)?.children.push(id);
    if (Array.isArray(children)) {
      if (nodes.size + stack.length + children.length > 10000) return invalid();
      for (let index = children.length - 1; index >= 0; index -= 1) {
        stack.push({ record: children[index], parent: id, level: item.level + 1 });
      }
    }
  }
  return { valid: true, nodes };
}

export function treeTableSelection(
  nodes: ReadonlyMap<TreeTableId, TreeTableNode>,
  selected: ReadonlySet<TreeTableId>,
): Map<TreeTableId, { total: number; selected: number }> {
  const counts = new Map<TreeTableId, { total: number; selected: number }>();
  // 索引按深度优先顺序插入，逆序累计可在线性时间内计算全树半选状态。
  for (const node of [...nodes.values()].reverse()) {
    const count = { total: node.disabled ? 0 : 1, selected: node.disabled ? 0 : selected.has(node.id) ? 1 : 0 };
    for (const id of node.children) {
      const child = counts.get(id);
      if (child) {
        count.total += child.total;
        count.selected += child.selected;
      }
    }
    counts.set(node.id, count);
  }
  return counts;
}
