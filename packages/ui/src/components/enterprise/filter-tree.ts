import type { CrudOperator, FieldDefinition, Filter } from '@svadmin/core';

export const FILTER_EDITOR_LIMITS = Object.freeze({ depth: 12, nodes: 256, values: 1000 });
export interface FilterRuleNode { kind: 'rule'; id: string; field: string; operator: CrudOperator; value: unknown; readonly?: boolean }
export interface FilterGroupNode { kind: 'group'; id: string; operator: 'and' | 'or'; children: FilterNode[]; wrapped?: boolean }
export type FilterNode = FilterRuleNode | FilterGroupNode;
export type FilterIssueCode = 'invalid-filter' | 'limit' | 'unknown-field' | 'operator' | 'value' | 'empty-group';
export interface FilterEditorIssue { path: string; code: FilterIssueCode }
export type FilterTreeRead = { ok: true; root: FilterGroupNode } | { ok: false; issues: FilterEditorIssue[] };
export type FilterTreeCompile = { ok: true; filters: Filter[] } | { ok: false; issues: FilterEditorIssue[] };
const operators: CrudOperator[] = ['eq', 'ne', 'lt', 'gt', 'lte', 'gte', 'contains', 'ncontains', 'startswith', 'endswith', 'in', 'nin', 'null', 'nnull', 'between', 'nbetween'];
const comparison: CrudOperator[] = ['eq', 'ne', 'lt', 'gt', 'lte', 'gte', 'in', 'nin', 'between', 'nbetween', 'null', 'nnull'];
const selection: CrudOperator[] = ['eq', 'ne', 'in', 'nin', 'null', 'nnull'];
const text: CrudOperator[] = ['eq', 'ne', 'contains', 'ncontains', 'startswith', 'endswith', 'in', 'nin', 'null', 'nnull'];
const scalar = (value: unknown): boolean => value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value));
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
export const isCollectionOperator = (operator: CrudOperator): boolean => ['in', 'nin', 'between', 'nbetween'].includes(operator);
export const isNullOperator = (operator: CrudOperator): boolean => operator === 'null' || operator === 'nnull';

export function filterOperators(field: Pick<FieldDefinition, 'type'> | undefined): CrudOperator[] {
  if (!field) return [];
  if (field.type === 'number' || field.type === 'date') return [...comparison];
  if (field.type === 'boolean' || field.type === 'select' || field.type === 'multiselect') return [...selection];
  return [...text];
}

/** Filter[] 的顶层是隐式 AND；只有单个显式组可以成为编辑器根组，且保留包装信息。 */
export function readFilterTree(input: unknown): FilterTreeRead {
  let count = 0;
  const active = new Set<object>();
  const issues: FilterEditorIssue[] = [];
  function read(raw: unknown, depth: number, path: string): FilterNode | undefined {
    if (++count > FILTER_EDITOR_LIMITS.nodes || depth > FILTER_EDITOR_LIMITS.depth) { issues.push({ path, code: 'limit' }); return; }
    if (!object(raw) || active.has(raw)) { issues.push({ path, code: 'invalid-filter' }); return; }
    active.add(raw);
    try {
      const id = `node-${count}`;
      if ('field' in raw) {
        if (typeof raw['field'] !== 'string' || !raw['field'] || !operators.includes(raw['operator'] as CrudOperator)
          || Object.keys(raw).some((key) => !['field', 'operator', 'value'].includes(key))) { issues.push({ path, code: 'invalid-filter' }); return; }
        const value = raw['value'];
        if (!scalar(value) && !(Array.isArray(value) && value.length <= FILTER_EDITOR_LIMITS.values && Array.from(value).every(scalar))) { issues.push({ path, code: 'value' }); return; }
        return { kind: 'rule', id, field: raw['field'], operator: raw['operator'] as CrudOperator, value: Array.isArray(value) ? [...value] : value };
      }
      if (!['and', 'or'].includes(String(raw['operator'])) || !Array.isArray(raw['value'])
        || Object.keys(raw).some((key) => !['operator', 'value'].includes(key))) { issues.push({ path, code: 'invalid-filter' }); return; }
      if (raw['value'].length > FILTER_EDITOR_LIMITS.nodes) { issues.push({ path, code: 'limit' }); return; }
      const children: FilterNode[] = [];
      for (const [index, child] of raw['value'].entries()) {
        const node = read(child, depth + 1, `${path}/value/${index}`);
        if (node) children.push(node);
      }
      return { kind: 'group', id, operator: raw['operator'] as 'and' | 'or', children };
    } finally { active.delete(raw); }
  }
  if (!Array.isArray(input)) return { ok: false, issues: [{ path: '', code: 'invalid-filter' }] };
  if (input.length > FILTER_EDITOR_LIMITS.nodes) return { ok: false, issues: [{ path: '', code: 'limit' }] };
  const children: FilterNode[] = [];
  for (const [index, raw] of input.entries()) {
    const node = read(raw, 1, `/${index}`);
    if (node) children.push(node);
  }
  if (issues.length) return { ok: false, issues };
  const only = children[0];
  return { ok: true, root: children.length === 1 && only?.kind === 'group'
    ? { ...only, wrapped: true }
    : { kind: 'group', id: 'root', operator: 'and', children, wrapped: false } };
}

export function compileFilterTree(root: FilterGroupNode, fields: readonly FieldDefinition[], preserved: ReadonlyMap<string, Filter> = new Map()): FilterTreeCompile {
  const issues: FilterEditorIssue[] = [];
  const fieldMap = new Map(fields.map((field) => [field.key, field]));
  const active = new Set<FilterNode>();
  let count = 0;
  function visit(node: FilterNode, depth: number): Filter | undefined {
    const issue = (code: FilterIssueCode): void => { issues.push({ path: node.id, code }); };
    if (++count > FILTER_EDITOR_LIMITS.nodes || depth > FILTER_EDITOR_LIMITS.depth) { issue('limit'); return; }
    if (active.has(node)) { issue('invalid-filter'); return; }
    active.add(node);
    try {
      // Only unchanged host-owned readonly leaves and originally empty groups may bypass
      // editor capability checks. A forged readonly flag or edited payload is not sufficient.
      const original = preserved.get(node.id);
      if (original && node.kind === 'rule' && node.readonly && 'field' in original
        && node.field === original.field && node.operator === original.operator
        && JSON.stringify(node.value) === JSON.stringify(original.value)) {
        return { ...original, value: Array.isArray(original.value) ? [...original.value] : original.value };
      }
      if (original && node.kind === 'group' && !('field' in original)
        && !node.children.length && !original.value.length && node.operator === original.operator) {
        return { operator: node.operator, value: [] };
      }
      if (node.kind === 'group') {
        if (node.operator !== 'and' && node.operator !== 'or') { issue('operator'); return; }
        if (!node.children.length) issue('empty-group');
        if (node.children.length > FILTER_EDITOR_LIMITS.nodes) { issue('limit'); return; }
        const children: Filter[] = [];
        for (const child of node.children) { const filter = visit(child, depth + 1); if (filter) children.push(filter); }
        return { operator: node.operator, value: children };
      }
      const field = fieldMap.get(node.field);
      if (!field || field.filterable === false) { issue('unknown-field'); return; }
      if (!filterOperators(field).includes(node.operator)) { issue('operator'); return; }
      const validScalar = (value: unknown): boolean => {
        if (!scalar(value) || value === null) return false;
        if (field.type === 'number') return typeof value === 'number';
        if (field.type === 'boolean') return typeof value === 'boolean';
        if (field.options?.length) return field.options.some((option) => !option.disabled && option.value === value);
        return typeof value === 'string';
      };
      if (isNullOperator(node.operator)) {
        if (node.value !== null) { issue('value'); return; }
      } else if (isCollectionOperator(node.operator)) {
        if (!Array.isArray(node.value) || node.value.length === 0 || node.value.length > FILTER_EDITOR_LIMITS.values || !Array.from(node.value).every(validScalar)
          || ((node.operator === 'between' || node.operator === 'nbetween') && node.value.length !== 2)) { issue('value'); return; }
        if ((node.operator === 'between' || node.operator === 'nbetween') && typeof node.value[0] === 'number' && typeof node.value[1] === 'number' && node.value[0] > node.value[1]) { issue('value'); return; }
      } else if (!validScalar(node.value)) { issue('value'); return; }
      return { field: node.field, operator: node.operator, value: Array.isArray(node.value) ? [...node.value] : node.value };
    } finally { active.delete(node); }
  }
  if (root.children.length > FILTER_EDITOR_LIMITS.nodes) return { ok: false, issues: [{ path: root.id, code: 'limit' }] };
  if (!root.children.length && !root.wrapped) return { ok: true, filters: [] };
  // 隐式根不占公开 Filter 的深度或节点预算；显式根与读入时一致。
  let filters: Filter[] = [];
  if (root.operator === 'and' && !root.wrapped) {
    for (const child of root.children) { const filter = visit(child, 1); if (filter) filters.push(filter); }
  } else {
    const filter = visit(root, 1);
    if (filter) filters = [filter];
  }
  return issues.length ? { ok: false, issues } : { ok: true, filters };
}

export function parseFilterInput(raw: string, field: Pick<FieldDefinition, 'type'> | undefined, operator: CrudOperator): unknown {
  if (raw.length > 1_048_576) throw new Error('value');
  if (isNullOperator(operator)) return null;
  if (isCollectionOperator(operator)) return raw.trim() ? JSON.parse(raw) : undefined;
  if (field?.type === 'number') {
    if (!raw.trim()) return undefined;
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim()) || !Number.isFinite(Number(raw))) throw new Error('value');
    return Number(raw);
  }
  if (field?.type === 'boolean') {
    if (raw === '') return undefined;
    if (raw !== 'true' && raw !== 'false') throw new Error('value');
    return raw === 'true';
  }
  return raw;
}
