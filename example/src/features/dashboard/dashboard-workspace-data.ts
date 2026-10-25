import {
  decodeDashboardQuery, type DashboardQuery, type DashboardSnapshot, type DataProvider,
} from '@svadmin/core';
import { demoRenderers } from '../../resource-rendering';
import type { DemoRow } from '../../resource-schemas';

export interface DashboardWorkspaceData {
  region: 'all' | 'east' | 'west';
  warehouseId?: number;
  fromDate: string;
  toDate: string;
  movements: DemoRow<'stock_movements'>[];
  orders: DemoRow<'sales_orders'>[];
  openTodos: DemoRow<'todos'>[];
  unitsMoved: number;
}

export interface DashboardWorkspaceResult {
  data: DashboardWorkspaceData;
  snapshot: DashboardSnapshot;
}

export interface WorkspaceDrilldownTarget {
  widgetId: string;
  widgetTitle: string;
  kind: 'metric' | 'text';
  metricId?: string;
  metricLabel?: string;
  filters: readonly { field: string; value: string | number | boolean | null }[];
  timeRange?: { from: string; to: string };
}

export interface DashboardWorkspaceRecord {
  resource: 'stock_movements' | 'sales_orders' | 'todos';
  id: number;
  title: string;
  meta: string;
}

function readRegion(query: DashboardQuery): DashboardWorkspaceData['region'] {
  const raw = query.filters?.find(filter => filter.field === 'region')?.value;
  if (raw === undefined || raw === '') return 'all';
  if (raw === 'east' || raw === 'west') return raw;
  throw new Error('Unsupported dashboard region');
}

function readRange(query: DashboardQuery): { fromDate: string; toDate: string } {
  const from = query.timeRange?.from;
  const to = query.timeRange?.to;
  if (!from || !to) throw new Error('Dashboard time range must be a valid ordered UTC range');
  return { fromDate: from.slice(0, 10), toDate: to.slice(0, 10) };
}

function decodeWorkspaceQuery(query: DashboardQuery): DashboardQuery {
  try {
    return decodeDashboardQuery(query);
  } catch {
    throw new Error('Dashboard time range must be a valid ordered UTC range');
  }
}

function inRange(date: string, fromDate: string, toDate: string): boolean {
  return date >= fromDate && date <= toDate;
}

export async function loadDashboardWorkspace(
  provider: DataProvider,
  query: DashboardQuery,
  options: { isZh?: boolean } = {},
): Promise<DashboardWorkspaceResult> {
  const decoded = decodeWorkspaceQuery(query);
  const region = readRegion(decoded);
  const { fromDate, toDate } = readRange(decoded);
  const [movementResult, orderResult, todoResult] = await Promise.all([
    provider.getList({ resource: 'stock_movements', pagination: { mode: 'off' } }),
    provider.getList({ resource: 'sales_orders', pagination: { mode: 'off' } }),
    provider.getList({ resource: 'todos', pagination: { mode: 'off' } }),
  ]);
  const warehouseId = region === 'east' ? 1 : region === 'west' ? 2 : undefined;
  const movements = demoRenderers.stock_movements.records(movementResult.data)
    .filter(row => (warehouseId === undefined || row.warehouseId === warehouseId) && inRange(row.date, fromDate, toDate));
  const orders = demoRenderers.sales_orders.records(orderResult.data)
    .filter(row => inRange(row.orderDate, fromDate, toDate));
  const openTodos = demoRenderers.todos.records(todoResult.data).filter(row => !row.completed);
  const unitsMoved = movements.reduce((sum, row) => sum + row.quantity, 0);
  const data: DashboardWorkspaceData = {
    region, ...(warehouseId === undefined ? {} : { warehouseId }),
    fromDate, toDate, movements, orders, openTodos, unitsMoved,
  };
  const isZh = options.isZh === true;
  const regionLabel = isZh
    ? region === 'east' ? '东区' : region === 'west' ? '西区' : '全部'
    : region;
  const scope = isZh
    ? `区域 ${regionLabel} · ${fromDate} 至 ${toDate} · 移动量：仓库 + 日期；销售订单：日期；未完成待办：全部区域/日期`
    : `Region ${regionLabel} · ${fromDate} to ${toDate} · Units moved: warehouse + date; Sales orders: date; Open todos: all regions/dates`;
  const snapshot: DashboardSnapshot = {
    version: 1,
    widgets: [{
      id: 'workspace-scope',
      title: isZh ? '工作区口径' : 'Workspace scope',
      kind: 'text',
      metrics: [],
      text: scope,
    }, {
      id: 'workspace-metrics',
      title: isZh ? '工作区指标' : 'Workspace metrics',
      kind: 'metric',
      metrics: [
        {
          id: 'units',
          label: isZh ? '移动量（仓库/日期）' : 'Units moved (warehouse/date)',
          value: unitsMoved,
          tone: unitsMoved < 0 ? 'warning' : 'success',
        },
        {
          id: 'orders',
          label: isZh ? '销售订单（日期）' : 'Sales orders (date)',
          value: orders.length,
          tone: 'info',
        },
        {
          id: 'todos',
          label: isZh ? '未完成待办（全部区域/日期）' : 'Open todos (all regions/dates)',
          value: openTodos.length,
          tone: openTodos.length > 0 ? 'warning' : 'success',
        },
      ],
    }],
  };
  return { data, snapshot };
}

export function selectWorkspaceDrilldownRecords(
  data: DashboardWorkspaceData,
  target: WorkspaceDrilldownTarget,
): DashboardWorkspaceRecord[] {
  if (target.metricId === 'units' || (target.kind === 'text' && target.metricId === undefined)) {
    return data.movements.map(row => ({
      resource: 'stock_movements' as const,
      id: row.id,
      title: row.note,
      meta: `${row.date} · ${row.type} · qty ${row.quantity}`,
    }));
  }
  if (target.metricId === 'orders') {
    return data.orders.map(row => ({
      resource: 'sales_orders' as const,
      id: row.id,
      title: row.orderNumber,
      meta: `${row.customerName} · ${row.orderDate} · ${row.status}`,
    }));
  }
  if (target.metricId === 'todos') {
    return data.openTodos.map(row => ({
      resource: 'todos' as const,
      id: row.id,
      title: row.title,
      meta: `${row.status} · due ${row.dueDate}`,
    }));
  }
  throw new Error('Unsupported drill-down target');
}

export async function loadWorkspaceDrilldownRecords(
  provider: DataProvider,
  target: WorkspaceDrilldownTarget,
  options: { isZh?: boolean } = {},
): Promise<DashboardWorkspaceRecord[]> {
  const query: DashboardQuery = {
    dashboardId: 'operations-dashboard',
    ...(target.filters.length ? {
      filters: target.filters.map(filter => ({ field: filter.field, value: filter.value })),
    } : {}),
    ...(target.timeRange ? { timeRange: { ...target.timeRange } } : {}),
  };
  const result = await loadDashboardWorkspace(provider, query, options);
  return selectWorkspaceDrilldownRecords(result.data, target);
}