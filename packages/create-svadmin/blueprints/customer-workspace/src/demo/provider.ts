import { HttpError, type BaseRecord, type DataProvider, type Filter } from '@svadmin/core';
import { parseContractCreateInput, parseContractUpdateInput } from '@svadmin/core/resource-contract';
import { customers, followups, approvals, type Customer, type Followup, type Approval } from '../features/customers/data';

export type DemoScenario = 'normal' | 'empty' | 'error' | 'loading' | 'denied' | 'partial' | 'readonly';

export const demoCustomers: Customer[] = [
  { id: 'c1', name: '澄川科技', contact: '林悦', email: 'lin@example.test', status: 'active', owner: '陈晨', notes: '下周确认第二阶段交付范围。' },
  { id: 'c2', name: '远山设计事务所', contact: '周宁', email: 'zhou@example.test', status: 'potential', owner: '李沐', notes: '' },
  { id: 'c3', name: '海川城市服务与可持续基础设施联合研究中心', contact: '张文', email: 'zhang@example.test', status: 'active', owner: '陈晨', notes: '涉及多个业务部门，合同审批由统一联系人协调。' },
  { id: 'c4', name: '青禾教育', contact: '许安', email: 'xu@example.test', status: 'paused', owner: '李沐', notes: '等待预算确认。' },
];
const demoFollowups: Followup[] = [
  { id: 'f1', customerId: 'c1', summary: '已完成需求访谈，客户确认先上线客户与审批模块。', owner: '陈晨', date: '2026-09-21' },
  { id: 'f2', customerId: 'c1', summary: '发送实施方案，等待客户确认。', owner: '陈晨', date: '2026-09-23' },
  { id: 'f3', customerId: 'c3', summary: '整理跨部门的数据字段与权限边界。', owner: '李沐', date: '2026-09-22' },
];
const demoApprovals: Approval[] = [
  { id: 'a1', title: '澄川科技合同变更', applicant: '陈晨', status: 'pending', reason: '增加跟进记录模块，需要确认交付范围。' },
  { id: 'a2', title: '远山设计试用延期', applicant: '李沐', status: 'pending', reason: '申请延长试用期七天。' },
];

function matches(row: BaseRecord, filter: Filter): boolean {
  if (!('field' in filter)) {
    return filter.operator === 'or'
      ? filter.value.some(f => matches(row, f))
      : filter.value.every(f => matches(row, f));
  }
  const value = row[filter.field];
  switch (filter.operator) {
    case 'eq': return value === filter.value;
    case 'ne': return value !== filter.value;
    case 'contains': return String(value ?? '').toLowerCase().includes(String(filter.value).toLowerCase());
    case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
    case 'null': return value === null || value === undefined;
    case 'nnull': return value !== null && value !== undefined;
    default: throw new HttpError(`演示数据不支持筛选条件 ${filter.operator}`, 400);
  }
}

export function createDemoProvider(scenario: DemoScenario = 'normal'): DataProvider {
  const rows: Record<string, BaseRecord[]> = {
    customers: structuredClone(demoCustomers),
    followups: structuredClone(demoFollowups),
    approvals: structuredClone(demoApprovals),
  };
  async function table(resource: string): Promise<BaseRecord[]> {
    if (scenario === 'denied') throw new HttpError('无权访问', 403);
    if (scenario === 'error' || (scenario === 'partial' && resource === 'approvals')) throw new HttpError('演示服务暂不可用', 503);
    if (scenario === 'loading') await new Promise(resolve => setTimeout(resolve, 2500));
    const data = rows[resource];
    if (!data) throw new HttpError('资源不存在', 404);
    return data;
  }
  function find(data: BaseRecord[], id: string | number): BaseRecord {
    const row = data.find(record => record['id'] === String(id));
    if (!row) throw new HttpError('记录不存在', 404);
    return row;
  }
  return {
    getApiUrl: () => 'memory://svadmin-demo',
    async getList({ resource, pagination, sorters = [], filters = [] }) {
      const data = await table(resource);
      let result = scenario === 'empty' ? [] : data.filter(row => filters.every(f => matches(row, f)));
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
    async getOne({ resource, id }) {
      return { data: structuredClone(find(await table(resource), id)) };
    },
    async getMany({ resource, ids }) {
      return { data: structuredClone((await table(resource)).filter(row => ids.some(id => String(id) === row['id']))) };
    },
    async create({ resource, variables }) {
      if (scenario === 'readonly') throw new HttpError('仅允许查看', 403);
      const data = await table(resource);
      const input = resource === 'customers' ? parseContractCreateInput(customers, variables)
        : resource === 'followups' ? parseContractCreateInput(followups, variables)
        : (() => { throw new HttpError('该资源不允许创建', 403); })();
      if (resource === 'followups' && 'customerId' in input) find(await table('customers'), String(input.customerId));
      const record = { ...input, id: crypto.randomUUID() };
      data.push(record);
      return { data: structuredClone(record) };
    },
    async update({ resource, id, variables }) {
      if (scenario === 'readonly') throw new HttpError('仅允许查看', 403);
      const data = await table(resource);
      const row = find(data, id);
      const input = resource === 'customers' ? parseContractUpdateInput(customers, variables)
        : resource === 'followups' ? parseContractUpdateInput(followups, variables)
        : parseContractUpdateInput(approvals, variables);
      if (resource === 'followups' && 'customerId' in input) find(await table('customers'), String(input.customerId));
      Object.assign(row, input);
      return { data: structuredClone(row) };
    },
    async deleteOne() { throw new HttpError('演示项目未启用删除', 403); },
  };
}
