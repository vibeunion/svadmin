import { isCrudFieldOperator, type CrudOperator, type Filter, CRUD_FIELD_OPERATORS } from './types';

/**
 * 各一手数据源实际执行的筛选协议。
 * 未声明的运算符或逻辑组合必须失败关闭，不能改写成相等或丢掉条件组。
 */
export const FILTER_PROVIDER_IDS = [
  'pocketbase',
  'directus',
  'sanity',
  'elysia',
  'supabase-table',
  'scaffold-memory',
] as const;

export type FilterProviderId = (typeof FILTER_PROVIDER_IDS)[number];

export interface ProviderFilterCapability {
  id: FilterProviderId;
  /** 语义等价、会被真正下推的字段运算符。 */
  operators: readonly CrudOperator[];
  /** 是否执行嵌套 and/or。key 只是条件组身份，不是查询谓词。 */
  logical: boolean;
}

function operators(values: readonly CrudOperator[]): readonly CrudOperator[] {
  return values;
}

export const PROVIDER_FILTER_CAPABILITIES: Record<FilterProviderId, ProviderFilterCapability> = {
  pocketbase: {
    id: 'pocketbase',
    logical: true,
    operators: operators([
      'eq', 'ne', 'lt', 'gt', 'lte', 'gte',
      'contains', 'ncontains', 'startswith', 'nstartswith', 'endswith', 'nendswith',
      'in', 'nin', 'null', 'nnull', 'between', 'nbetween',
    ]),
  },
  directus: {
    id: 'directus',
    logical: true,
    operators: operators([
      'eq', 'ne', 'lt', 'gt', 'lte', 'gte',
      'contains', 'ncontains', 'containss', 'ncontainss',
      'startswith', 'nstartswith', 'startswiths', 'nstartswiths',
      'endswith', 'nendswith', 'endswiths', 'nendswiths',
      'in', 'nin', 'null', 'nnull', 'between', 'nbetween',
    ]),
  },
  sanity: {
    id: 'sanity',
    logical: true,
    operators: operators([
      'eq', 'ne', 'lt', 'gt', 'lte', 'gte',
      'contains', 'ncontains', 'startswith', 'endswith',
      'in', 'nin', 'null', 'nnull', 'between', 'nbetween',
    ]),
  },
  elysia: {
    id: 'elysia',
    logical: true,
    operators: CRUD_FIELD_OPERATORS,
  },
  'supabase-table': {
    id: 'supabase-table',
    logical: false,
    operators: operators(['eq']),
  },
  'scaffold-memory': {
    id: 'scaffold-memory',
    logical: true,
    operators: operators(['eq', 'ne', 'contains', 'in', 'null', 'nnull']),
  },
};

const supportedOperators = new Map<FilterProviderId, ReadonlySet<string>>(
  FILTER_PROVIDER_IDS.map((id) => [id, new Set(PROVIDER_FILTER_CAPABILITIES[id].operators)]),
);

export function providerSupportsOperator(provider: FilterProviderId, operator: CrudOperator): boolean {
  return supportedOperators.get(provider)?.has(operator) ?? false;
}

function visitFilter(provider: FilterProviderId, filter: Filter, depth: number, seen: Set<object>): void {
  const capability = PROVIDER_FILTER_CAPABILITIES[provider];
  const allowed = supportedOperators.get(provider);
  if (!capability || !allowed) throw new Error(`Unknown filter provider: ${provider}`);
  if (depth > 32) throw new Error(`Unsupported ${provider} filter: nesting is too deep`);
  if (typeof filter !== 'object' || filter === null || seen.has(filter)) {
    throw new Error(`Unsupported ${provider} filter: expected an object`);
  }
  seen.add(filter);
  if ('field' in filter) {
    if (!isCrudFieldOperator(filter.operator) || !allowed.has(filter.operator)) {
      throw new Error(`Unsupported ${provider} filter operator: ${String(filter.operator)}`);
    }
    return;
  }
  if (!capability.logical || (filter.operator !== 'and' && filter.operator !== 'or') || !Array.isArray(filter.value)) {
    throw new Error(`Unsupported ${provider} logical operator: ${String(filter.operator)}`);
  }
  for (const child of filter.value) visitFilter(provider, child, depth + 1, seen);
}

/** 在翻译之前拒绝能力矩阵之外的运算符和逻辑组合。 */
export function assertFiltersExecutable(provider: FilterProviderId, filters: readonly Filter[] | undefined): void {
  if (!FILTER_PROVIDER_IDS.includes(provider)) throw new Error(`Unknown filter provider: ${String(provider)}`);
  const seen = new Set<object>();
  for (const filter of filters ?? []) visitFilter(provider, filter, 0, seen);
}
