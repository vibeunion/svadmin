/**
 * @svadmin/mock-provider
 *
 * In-memory zero-configuration DataProvider for rapid prototyping,
 * local testing, and offline Vibe Coding workflows.
 */
import type {
  BaseRecord,
  CreateParams,
  CreateResult,
  CreateManyParams,
  CreateManyResult,
  CustomParams,
  CustomResult,
  DataProvider,
  DeleteManyParams,
  DeleteManyResult,
  DeleteParams,
  DeleteResult,
  GetListParams,
  GetListResult,
  GetManyParams,
  GetManyResult,
  GetOneParams,
  GetOneResult,
  UpdateManyParams,
  UpdateManyResult,
  UpdateParams,
  UpdateResult,
} from './types';
import { HttpError } from './types';
import { matchClientFilter } from './client-filter';

export interface MockDataProviderOptions {
  /** Optional initial data set by resource name */
  initialData?: Record<string, BaseRecord[]>;
  /** Primary key field name (default: 'id') */
  idKey?: string;
  /** Artificial latency in milliseconds (default: 0) */
  latencyMs?: number;
}

export interface MockDataProviderInstance extends DataProvider {
  resetData(): void;
  setData(resource: string, records: BaseRecord[]): void;
  getData(resource: string): BaseRecord[];
  getAllData(): Record<string, BaseRecord[]>;
}

const DEFAULT_ENTERPRISE_DATA: Record<string, BaseRecord[]> = {
  users: [
    { id: 1, name: 'Alice Chen', email: 'alice@example.com', role: 'admin', active: true, createdAt: '2026-01-15T08:00:00Z' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'editor', active: true, createdAt: '2026-02-10T09:30:00Z' },
    { id: 3, name: 'Carol Danvers', email: 'carol@example.com', role: 'viewer', active: false, createdAt: '2026-03-01T14:15:00Z' },
    { id: 4, name: 'David Miller', email: 'david@example.com', role: 'editor', active: true, createdAt: '2026-04-12T11:00:00Z' },
  ],
  posts: [
    { id: 1, title: 'Getting Started with svadmin', status: 'published', authorId: 1, views: 1250, createdAt: '2026-02-01T10:00:00Z' },
    { id: 2, title: 'Vibe Coding with AI Agents', status: 'published', authorId: 2, views: 3420, createdAt: '2026-02-15T15:20:00Z' },
    { id: 3, title: 'Architectural Guardrails in Production', status: 'draft', authorId: 1, views: 0, createdAt: '2026-03-05T08:45:00Z' },
    { id: 4, title: 'Building Self-Healing Admin Systems', status: 'published', authorId: 4, views: 890, createdAt: '2026-03-20T16:10:00Z' },
    { id: 5, title: 'Declarative UI Patterns for 2026', status: 'draft', authorId: 2, views: 0, createdAt: '2026-04-02T13:00:00Z' },
  ],
  orders: [
    { id: 'ORD-1001', customer: 'Acme Corp', amount: 4999.00, status: 'completed', createdAt: '2026-03-10T12:00:00Z' },
    { id: 'ORD-1002', customer: 'Global Tech', amount: 1250.50, status: 'pending', createdAt: '2026-03-12T09:15:00Z' },
    { id: 'ORD-1003', customer: 'Nexus Ltd', amount: 890.00, status: 'completed', createdAt: '2026-03-14T14:30:00Z' },
    { id: 'ORD-1004', customer: 'Starlight Inc', amount: 15400.00, status: 'processing', createdAt: '2026-03-18T17:45:00Z' },
  ],
  audit_logs: [
    { id: 1, action: 'LOGIN', userId: 1, ip: '192.168.1.10', timestamp: '2026-04-01T08:00:00Z' },
    { id: 2, action: 'UPDATE_POST', userId: 2, ip: '192.168.1.15', timestamp: '2026-04-01T08:30:00Z' },
    { id: 3, action: 'EXPORT_ORDERS', userId: 1, ip: '192.168.1.10', timestamp: '2026-04-01T09:15:00Z' },
  ],
};

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Creates an in-memory mock data provider with enterprise defaults and zero backend dependencies.
 */
export function createMockDataProvider(options: MockDataProviderOptions = {}): MockDataProviderInstance {
  const idKey = options.idKey ?? 'id';
  const latencyMs = options.latencyMs ?? 0;
  const initial = options.initialData
    ? deepClone(options.initialData)
    : deepClone(DEFAULT_ENTERPRISE_DATA);

  let store: Record<string, BaseRecord[]> = deepClone(initial);

  const delay = async () => {
    if (latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, latencyMs));
    }
  };

  const getCollection = (resource: string): BaseRecord[] => {
    if (!store[resource]) {
      store[resource] = [];
    }
    return store[resource];
  };

  return {
    getApiUrl: () => 'mock://local',

    getList: async <TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResult<TData>> => {
      await delay();
      let records = [...getCollection(params.resource)];

      // 1. Filters
      if (params.filters && params.filters.length > 0) {
        for (const filter of params.filters) {
          records = records.filter(item => matchClientFilter(item, filter));
        }
      }

      // 2. Sorters
      if (params.sorters && params.sorters.length > 0) {
        records.sort((a, b) => {
          for (const sorter of params.sorters!) {
            const valA = a[sorter.field];
            const valB = b[sorter.field];
            if (valA === valB) continue;
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;

            const order = sorter.order === 'desc' ? -1 : 1;
            if (typeof valA === 'number' && typeof valB === 'number') {
              return (valA - valB) * order;
            }
            return String(valA).localeCompare(String(valB)) * order;
          }
          return 0;
        });
      }

      const total = records.length;

      // 3. Pagination
      const current = params.pagination?.current ?? 1;
      const pageSize = params.pagination?.pageSize ?? 10;
      const start = (current - 1) * pageSize;
      const paginated = records.slice(start, start + pageSize);

      return {
        data: deepClone(paginated) as TData[],
        total,
      };
    },

    getOne: async <TData extends BaseRecord = BaseRecord>(params: GetOneParams): Promise<GetOneResult<TData>> => {
      await delay();
      const records = getCollection(params.resource);
      const record = records.find(r => String(r[idKey]) === String(params.id));
      if (!record) {
        throw new HttpError(`Record ${params.id} not found in ${params.resource}`, 404);
      }
      return { data: deepClone(record) as TData };
    },

    getMany: async <TData extends BaseRecord = BaseRecord>(params: GetManyParams): Promise<GetManyResult<TData>> => {
      await delay();
      const records = getCollection(params.resource);
      const idSet = new Set(params.ids.map(id => String(id)));
      const matching = records.filter(r => idSet.has(String(r[idKey])));
      return { data: deepClone(matching) as TData[] };
    },

    create: async <TData extends BaseRecord = BaseRecord>(params: CreateParams): Promise<CreateResult<TData>> => {
      await delay();
      const records = getCollection(params.resource);
      const payload = { ...(params.variables as BaseRecord) };

      if (payload[idKey] === undefined) {
        // Auto assign ID
        const numericIds = records
          .map(r => Number(r[idKey]))
          .filter(id => !isNaN(id));
        payload[idKey] = numericIds.length > 0 ? Math.max(...numericIds) + 1 : records.length + 1;
      }

      records.push(payload);
      return { data: deepClone(payload) as TData };
    },

    createMany: async <TData extends BaseRecord = BaseRecord>(params: CreateManyParams): Promise<CreateManyResult<TData>> => {
      await delay();
      const records = getCollection(params.resource);
      const created: BaseRecord[] = [];

      for (const raw of params.variables) {
        const payload = { ...(raw as BaseRecord) };
        if (payload[idKey] === undefined) {
          const numericIds = [...records, ...created]
            .map(r => Number(r[idKey]))
            .filter(id => !isNaN(id));
          payload[idKey] = numericIds.length > 0 ? Math.max(...numericIds) + 1 : records.length + created.length + 1;
        }
        created.push(payload);
      }

      records.push(...created);
      return { data: deepClone(created) as TData[] };
    },

    update: async <TData extends BaseRecord = BaseRecord>(params: UpdateParams): Promise<UpdateResult<TData>> => {
      await delay();
      const records = getCollection(params.resource);
      const index = records.findIndex(r => String(r[idKey]) === String(params.id));
      const existing = records[index];
      if (index === -1 || !existing) {
        throw new HttpError(`Record ${params.id} not found in ${params.resource}`, 404);
      }

      const updatedRecord = {
        ...existing,
        ...(params.variables as BaseRecord),
        [idKey]: existing[idKey], // Preserve original id
      };
      records[index] = updatedRecord;

      return { data: deepClone(updatedRecord) as TData };
    },

    updateMany: async <TData extends BaseRecord = BaseRecord>(params: UpdateManyParams): Promise<UpdateManyResult<TData>> => {
      await delay();
      const records = getCollection(params.resource);
      const idSet = new Set(params.ids.map(id => String(id)));
      const updated: BaseRecord[] = [];

      for (let i = 0; i < records.length; i++) {
        const item = records[i];
        if (item && idSet.has(String(item[idKey]))) {
          const updatedItem = {
            ...item,
            ...(params.variables as BaseRecord),
            [idKey]: item[idKey],
          };
          records[i] = updatedItem;
          updated.push(updatedItem);
        }
      }

      return { data: deepClone(updated) as TData[] };
    },

    deleteOne: async <TData extends BaseRecord = BaseRecord>(params: DeleteParams): Promise<DeleteResult<TData>> => {
      await delay();
      const records = getCollection(params.resource);
      const index = records.findIndex(r => String(r[idKey]) === String(params.id));
      if (index === -1) {
        throw new HttpError(`Record ${params.id} not found in ${params.resource}`, 404);
      }

      const [deleted] = records.splice(index, 1);
      return { data: deepClone(deleted) as TData };
    },

    deleteMany: async <TData extends BaseRecord = BaseRecord>(params: DeleteManyParams): Promise<DeleteManyResult<TData>> => {
      await delay();
      const records = getCollection(params.resource);
      const idSet = new Set(params.ids.map(id => String(id)));
      const deleted: BaseRecord[] = [];

      store[params.resource] = records.filter(r => {
        if (idSet.has(String(r[idKey]))) {
          deleted.push(r);
          return false;
        }
        return true;
      });

      return { data: deepClone(deleted) as TData[] };
    },

    custom: async <TData = unknown>(params: CustomParams): Promise<CustomResult<TData>> => {
      await delay();
      return {
        data: {
          url: params.url,
          method: params.method,
          ok: true,
        } as unknown as TData,
      };
    },

    resetData: () => {
      store = deepClone(initial);
    },

    setData: (resource: string, records: BaseRecord[]) => {
      store[resource] = deepClone(records);
    },

    getData: (resource: string) => {
      return deepClone(store[resource] ?? []);
    },

    getAllData: () => {
      return deepClone(store);
    },
  };
}
