import { assertFiltersExecutable } from '@svadmin/core/provider-filters';
import { HttpError, type BaseRecord, type DataProvider, type Filter } from '@svadmin/core';
import { productResources } from './generated/resources';

export type ProductScenario = 'normal' | 'empty' | 'error' | 'loading' | 'denied' | 'readonly';

function matches(row: BaseRecord, filter: Filter): boolean {
  assertFiltersExecutable('scaffold-memory', [filter]);
  if (!('field' in filter)) {
    return filter.operator === 'or'
      ? filter.value.some(candidate => matches(row, candidate))
      : filter.value.every(candidate => matches(row, candidate));
  }
  const value = row[filter.field];
  switch (filter.operator) {
    case 'eq': return value === filter.value;
    case 'ne': return value !== filter.value;
    case 'contains': return String(value ?? '').toLowerCase().includes(String(filter.value).toLowerCase());
    case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
    case 'null': return value === null || value === undefined;
    case 'nnull': return value !== null && value !== undefined;
    default: throw new HttpError('当前脚手架不支持该筛选条件', 400);
  }
}

export function createProductProvider(scenario: ProductScenario = 'normal'): DataProvider {
  const rows: Record<string, BaseRecord[]> = Object.fromEntries(
    productResources.map(resource => [resource.name, [] as BaseRecord[]]),
  );
  async function table(resource: string): Promise<BaseRecord[]> {
    if (scenario === 'denied') throw new HttpError('无权访问', 403);
    if (scenario === 'error') throw new HttpError('演示 provider 暂不可用', 503);
    if (scenario === 'loading') await new Promise(resolve => setTimeout(resolve, 1200));
    const data = rows[resource];
    if (!data) throw new HttpError('资源不存在', 404);
    return data;
  }
  function find(data: BaseRecord[], id: string | number): BaseRecord {
    const row = data.find(record => String(record['id']) === String(id));
    if (!row) throw new HttpError('记录不存在', 404);
    return row;
  }
  return {
    getApiUrl: () => 'memory://svadmin-product',
    async getList({ resource, pagination, sorters = [], filters = [] }) {
      const data = await table(resource);
      let result = (scenario === 'empty' ? [] : data).filter(row => filters.every(filter => matches(row, filter)));
      result = [...result].sort((a, b) => {
        for (const sorter of sorters) {
          const order = String(a[sorter.field] ?? '').localeCompare(String(b[sorter.field] ?? ''), 'zh-CN', { numeric: true });
          if (order) return sorter.order === 'desc' ? -order : order;
        }
        return 0;
      });
      const total = result.length;
      if (pagination?.mode !== 'off') {
        const size = pagination?.pageSize ?? 10;
        const start = ((pagination?.current ?? 1) - 1) * size;
        result = result.slice(start, start + size);
      }
      return { data: structuredClone(result), total };
    },
    async getOne({ resource, id }) { return { data: structuredClone(find(await table(resource), id)) }; },
    async getMany({ resource, ids }) {
      return { data: structuredClone((await table(resource)).filter(row => ids.some(id => String(id) === String(row['id'])))) };
    },
    async create({ resource, variables }) {
      if (scenario === 'readonly') throw new HttpError('仅允许查看', 403);
      const data = await table(resource);
      const record = { ...(variables as BaseRecord), id: crypto.randomUUID() };
      data.push(record);
      return { data: structuredClone(record) };
    },
    async update({ resource, id, variables }) {
      if (scenario === 'readonly') throw new HttpError('仅允许查看', 403);
      const data = await table(resource);
      const record = find(data, id);
      Object.assign(record, variables as BaseRecord);
      return { data: structuredClone(record) };
    },
    async deleteOne() { throw new HttpError('产品脚手架未启用删除', 403); },
  };
}
