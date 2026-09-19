import type { SvarInteractiveApi, SvarInteractiveEngineProps } from './svar-grid-interactions.js';

export interface SvarManagedApi extends SvarInteractiveApi {
  exec(action: string, params?: Record<string, unknown>): Promise<unknown>;
  getState(): {
    selectedRows?: unknown;
    scrollTop?: number;
    flatData?: Record<string, unknown>[];
    focusCell?: { row?: string | number; column?: string | number };
  };
}
export interface SvarManagedEngineProps extends Omit<SvarInteractiveEngineProps, 'init' | 'columns'> {
  columns: (SvarInteractiveEngineProps['columns'][number] & { hidden?: boolean })[];
  dynamic?: { rowCount?: number };
  init?: (api: SvarManagedApi) => void;
}

function own(event: unknown, key: string): unknown {
  return event && typeof event === 'object' ? Object.getOwnPropertyDescriptor(event, key)?.value : undefined;
}
function mirroredEvent(action: string, event: unknown): Record<string, unknown> | undefined {
  if (action === 'scroll-to') {
    const top = own(event, 'top');
    return typeof top === 'number' && Number.isFinite(top) && top >= 0 ? { top } : undefined;
  }
  if (action === 'open-row' || action === 'close-row') {
    const id = own(event, 'id');
    return typeof id === 'string' ? { id, nested: own(event, 'nested') === true } : undefined;
  }
  const key = own(event, 'key');
  if (typeof key !== 'string') return undefined;
  if (action === 'sort-rows') {
    // 上游首次排序可能省略 order，其公开语义为升序。
    const order = own(event, 'order') ?? 'asc';
    if (order !== 'asc' && order !== 'desc') return undefined;
    return { key, order, add: own(event, 'add') === true };
  }
  const value = own(event, 'value');
  return typeof value === 'string' || value == null ? { key, value: value ?? '' } : undefined;
}

/** 两个公开 Grid 实例组成固定右侧面板，不读取或改写上游 Community 功能开关。 */
export function createSvarPanePair(current: () => boolean) {
  const panes = new Map<0 | 1, SvarManagedApi>();
  let disposed = false;
  let synchronizing = 0;
  function attach(side: 0 | 1, api: SvarManagedApi): void {
    panes.set(side, api);
    for (const action of ['scroll-to', 'sort-rows', 'filter-rows', 'open-row', 'close-row']) {
      api.on(action, event => {
        const peer = panes.get(side === 0 ? 1 : 0);
        if (disposed || synchronizing || panes.get(side) !== api || !peer || !current()) return;
        const next = mirroredEvent(action, event);
        if (!next) return;
        if (action === 'scroll-to' && peer.getState().scrollTop === next['top']) return;
        synchronizing++;
        try { void Promise.resolve(peer.exec(action, next)).catch(() => {}).finally(() => { synchronizing--; }); }
        catch { synchronizing--; }
      });
    }
    if (side === 1) {
      const top = panes.get(0)?.getState().scrollTop;
      if (typeof top === 'number' && top > 0) void api.exec('scroll-to', { top }).catch(() => {});
    }
  }
  function focus(side: 0 | 1, row: string | number, column: string): void {
    if (disposed || !current()) return;
    const api = panes.get(side);
    if (api) void api.exec('focus-cell', { row, column, eventSource: 'svadmin-pinned-navigation' }).catch(() => {});
  }
  return { attach, focus, get: (side: 0 | 1) => panes.get(side), dispose() { disposed = true; panes.clear(); } };
}
