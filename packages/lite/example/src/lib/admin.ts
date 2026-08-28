import type {
  BaseRecord,
  CreateParams,
  CreateResult,
  DataProvider,
  DeleteParams,
  DeleteResult,
  GetListParams,
  GetListResult,
  GetOneParams,
  GetOneResult,
  MenuItem,
  ResourceDefinition,
  UpdateParams,
  UpdateResult,
} from '@svadmin/core';
import { inMemoryDataProvider as exampleDbProvider } from '../../../../../example/src/providers/inMemoryDb';
import { createResources } from '../../../../../example/src/resources';

export const postsResource: ResourceDefinition = {
  name: 'posts',
  label: 'Posts',
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canShow: true,
  fields: [
    { key: 'id', label: 'ID', type: 'number', sortable: false, showInForm: false },
    { key: 'title', label: 'Title', type: 'text', searchable: true, required: true },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
  ],
  defaultSort: { field: 'id', order: 'asc' },
};

interface PostRecord extends Record<string, unknown> {
  id: number;
  title: string;
  status: 'draft' | 'published';
}

const postsData: PostRecord[] = [
  { id: 1, title: 'IE11 SSR contract', status: 'published' },
  { id: 2, title: 'Native form actions', status: 'draft' },
  { id: 3, title: 'Dynamic catch-all routing', status: 'published' },
];

let nextPostId = 4;

export const dataProvider: DataProvider = {
  getApiUrl: () => 'in-memory',

  getList: async <TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResult<TData>> => {
    if (params.resource === 'posts') {
      const search = (params.filters?.[0] as { value?: string } | undefined)?.value?.trim().toLowerCase() ?? '';
      const filtered = search
        ? postsData.filter((post) => post.title.toLowerCase().includes(search))
        : [...postsData];

      if (params.sorters?.[0]) {
        const { field, order } = params.sorters[0];
        filtered.sort((a, b) => {
          const valA = a[field as keyof PostRecord];
          const valB = b[field as keyof PostRecord];
          if (valA == null && valB == null) return 0;
          if (valA == null) return order === 'asc' ? -1 : 1;
          if (valB == null) return order === 'asc' ? 1 : -1;
          if (valA < valB) return order === 'asc' ? -1 : 1;
          if (valA > valB) return order === 'asc' ? 1 : -1;
          return 0;
        });
      }

      const current = params.pagination?.current ?? 1;
      const pageSize = params.pagination?.pageSize ?? 10;
      const start = (current - 1) * pageSize;
      const paginated = filtered.slice(start, start + pageSize);

      return {
        data: paginated as unknown as TData[],
        total: filtered.length,
      };
    }
    return exampleDbProvider.getList<TData>(params);
  },

  getOne: async <TData extends BaseRecord = BaseRecord>(params: GetOneParams): Promise<GetOneResult<TData>> => {
    if (params.resource === 'posts') {
      const post = postsData.find((p) => String(p.id) === String(params.id));
      if (!post) throw new Error(`Post ${params.id} not found`);
      return { data: { ...post } as unknown as TData };
    }
    return exampleDbProvider.getOne<TData>(params);
  },

  create: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: CreateParams<TVariables>,
  ): Promise<CreateResult<TData>> => {
    if (params.resource === 'posts') {
      const vars = params.variables as Record<string, unknown>;
      const newPost: PostRecord = {
        id: nextPostId++,
        title: String(vars.title ?? ''),
        status: (vars.status as 'draft' | 'published') ?? 'draft',
      };
      postsData.push(newPost);
      return { data: newPost as unknown as TData };
    }
    return exampleDbProvider.create<TData, TVariables>(params);
  },

  update: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: UpdateParams<TVariables>,
  ): Promise<UpdateResult<TData>> => {
    if (params.resource === 'posts') {
      const vars = params.variables as Record<string, unknown>;
      const index = postsData.findIndex((p) => String(p.id) === String(params.id));
      if (index === -1) throw new Error(`Post ${params.id} not found`);
      const updated: PostRecord = {
        ...postsData[index],
        ...vars,
        id: postsData[index].id,
      };
      postsData[index] = updated;
      return { data: updated as unknown as TData };
    }
    return exampleDbProvider.update<TData, TVariables>(params);
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: DeleteParams<TVariables>,
  ): Promise<DeleteResult<TData>> => {
    if (params.resource === 'posts') {
      const index = postsData.findIndex((p) => String(p.id) === String(params.id));
      if (index === -1) throw new Error(`Post ${params.id} not found`);
      const [removed] = postsData.splice(index, 1);
      return { data: removed as unknown as TData };
    }
    return exampleDbProvider.deleteOne<TData, TVariables>(params);
  },
};

const fullResources = createResources('en').filter((r: ResourceDefinition) => r.fields && r.fields.length > 0);

export const resources: ResourceDefinition[] = [
  postsResource,
  ...fullResources.filter((r: ResourceDefinition) => r.name !== 'posts'),
];

export function getResource(name: string): ResourceDefinition | undefined {
  return resources.find((r) => r.name === name);
}

export const menu: MenuItem[] = [
  { name: 'home', label: 'Dashboard', href: '/lite' },
  {
    name: 'inventory',
    label: 'Inventory',
    children: [
      { name: 'products', label: 'Products', href: '/lite/products' },
      { name: 'skus', label: 'SKUs', href: '/lite/skus' },
      { name: 'categories', label: 'Categories', href: '/lite/categories' },
      { name: 'suppliers', label: 'Suppliers', href: '/lite/suppliers' },
      { name: 'warehouses', label: 'Warehouses', href: '/lite/warehouses' },
    ],
  },
  {
    name: 'operations',
    label: 'Operations',
    children: [
      { name: 'stock_movements', label: 'Stock Movements', href: '/lite/stock_movements' },
      { name: 'purchase_orders', label: 'Purchase Orders', href: '/lite/purchase_orders' },
      { name: 'sales_orders', label: 'Sales Orders', href: '/lite/sales_orders' },
      { name: 'todos', label: 'Todo', href: '/lite/todos' },
      { name: 'stock_transfers', label: 'Stock Transfers', href: '/lite/stock_transfers' },
      { name: 'cycle_counts', label: 'Cycle Counts', href: '/lite/cycle_counts' },
      { name: 'inventory_adjustments', label: 'Inventory Adjustments', href: '/lite/inventory_adjustments' },
      { name: 'reorder_rules', label: 'Reorder Rules', href: '/lite/reorder_rules' },
    ],
  },
  {
    name: 'users_org',
    label: 'User Management',
    children: [
      { name: 'users', label: 'Users', href: '/lite/users' },
      { name: 'roles', label: 'Roles', href: '/lite/roles' },
      { name: 'permissions', label: 'Permissions', href: '/lite/permissions' },
      { name: 'user_accounts', label: 'User Accounts', href: '/lite/user_accounts' },
    ],
  },
  {
    name: 'crm',
    label: 'CRM',
    children: [
      { name: 'crm_accounts', label: 'Customer Accounts', href: '/lite/crm_accounts' },
      { name: 'crm_contacts', label: 'Customer Contacts', href: '/lite/crm_contacts' },
      { name: 'crm_deals', label: 'Revenue Opportunities', href: '/lite/crm_deals' },
    ],
  },
  {
    name: 'content',
    label: 'Content',
    children: [
      { name: 'posts', label: 'Posts (SSR Test)', href: '/lite/posts' },
    ],
  },
];
