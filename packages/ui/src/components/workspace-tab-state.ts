/**
 * 多标签工作区的状态适配器。
 *
 * 组件 `MultiTabKeepAlive` 只负责标签栏交互与关闭保护；路由、查询、滚动和草稿
 * 属于真实消费者。本适配器提供显式、可测试的快照契约：
 * - 以“租户 + 标签 id”为内存键，恢复时再校验 path，避免同 id 不同路由串状态；
 * - 持久化是可选注入的 storage，默认仅在内存中保存，不擅自写 localStorage；
 * - 快照带版本、租户、标签和路径，非法或过期数据按未保存处理。
 */
export interface WorkspaceTabRef {
  id: string;
}

export interface WorkspaceTabIdentity extends WorkspaceTabRef {
  path: string;
}

export interface WorkspaceTabViewState {
  /** 规范化后的查询串，不包含开头的 `?`。 */
  query: string;
  scrollTop: number;
  scrollLeft: number;
  draft: boolean;
}

export interface WorkspaceTabStateStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface WorkspaceTabClearResult {
  /** 当前实例的内存快照是否已移除。 */
  memoryCleared: boolean;
  /**
   * 持久化清理结果。`failed` 表示同一实例已被 tombstone 阻止回读，但新实例仍可能
   * 从 storage 读到已关闭标签；调用方不能据此声称持久化已删除。
   */
  storage: 'cleared' | 'failed' | 'not-configured';
}

export interface WorkspaceTabStateAdapter {
  /** 保存标签快照；未提供的字段沿用已有快照或默认值。 */
  capture(
    tab: WorkspaceTabIdentity,
    state?: Partial<WorkspaceTabViewState>,
  ): WorkspaceTabViewState;
  /** 仅当租户、标签 id 和 path 都匹配时返回快照。 */
  restore(tab: WorkspaceTabIdentity): WorkspaceTabViewState | undefined;
  markDraft(tab: WorkspaceTabIdentity, draft: boolean): void;
  hasDraft(tab: WorkspaceTabIdentity): boolean;
  /** 标签关闭后清理，并显式报告持久化删除是否成功。 */
  clear(tab: WorkspaceTabRef): WorkspaceTabClearResult;
  /** 卸载清理只释放内存快照；持久化数据由 storage 的所有者决定。 */
  dispose(): void;
}

export interface WorkspaceTabStateAdapterOptions {
  /** 租户隔离键；不同租户即使标签 id/path 相同也不共享快照。 */
  tenantId: string;
  /** 可选持久化；传入 sessionStorage 等实现即可跨刷新恢复。 */
  storage?: WorkspaceTabStateStorage | null;
  keyPrefix?: string;
}

const SNAPSHOT_VERSION = 1;
const DEFAULT_KEY_PREFIX = 'svadmin:workspace-tab-state';

const EMPTY_STATE: WorkspaceTabViewState = {
  query: '',
  scrollTop: 0,
  scrollLeft: 0,
  draft: false,
};

interface StoredEntry {
  path: string;
  state: WorkspaceTabViewState;
}

function normalizeQuery(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const withoutPrefix = value.startsWith('?') ? value.slice(1) : value;
  return withoutPrefix;
}

function normalizeScroll(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function normalizeDraft(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function isValidScroll(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function normalizeState(
  state: Partial<WorkspaceTabViewState> | undefined,
  fallback: WorkspaceTabViewState = EMPTY_STATE,
): WorkspaceTabViewState {
  return {
    query: normalizeQuery(state?.query, fallback.query),
    scrollTop: normalizeScroll(state?.scrollTop, fallback.scrollTop),
    scrollLeft: normalizeScroll(state?.scrollLeft, fallback.scrollLeft),
    draft: normalizeDraft(state?.draft, fallback.draft),
  };
}

function cloneState(state: WorkspaceTabViewState): WorkspaceTabViewState {
  return { ...state };
}

export function createWorkspaceTabStateAdapter(
  options: WorkspaceTabStateAdapterOptions,
): WorkspaceTabStateAdapter {
  const tenantId = options.tenantId;
  const storage = options.storage ?? null;
  const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const memory = new Map<string, StoredEntry>();
  const tombstones = new Set<string>();
  let disposed = false;

  function memoryKey(tabId: string): string {
    return `${encodeURIComponent(tenantId)}::${encodeURIComponent(tabId)}`;
  }

  function storageKey(tabId: string): string {
    return `${keyPrefix}:v${SNAPSHOT_VERSION}:${encodeURIComponent(tenantId)}:${encodeURIComponent(tabId)}`;
  }

  function readPersisted(tab: WorkspaceTabIdentity): WorkspaceTabViewState | undefined {
    if (!storage) return undefined;
    try {
      const raw = storage.getItem(storageKey(tab.id));
      if (!raw) return undefined;
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
      const version = Reflect.get(value, 'version');
      const persistedTenantId = Reflect.get(value, 'tenantId');
      const tabId = Reflect.get(value, 'tabId');
      const path = Reflect.get(value, 'path');
      const query = Reflect.get(value, 'query');
      const scrollTop = Reflect.get(value, 'scrollTop');
      const scrollLeft = Reflect.get(value, 'scrollLeft');
      const draft = Reflect.get(value, 'draft');
      // 持久化读取不做宽容归一化：任何字段错误都按无快照处理，尤其不能把
      // `draft: "true"` 洗成 false 而静默丢失草稿保护。
      if (
        version !== SNAPSHOT_VERSION ||
        persistedTenantId !== tenantId ||
        tabId !== tab.id ||
        path !== tab.path ||
        typeof query !== 'string' ||
        !isValidScroll(scrollTop) ||
        !isValidScroll(scrollLeft) ||
        typeof draft !== 'boolean'
      ) {
        return undefined;
      }
      return { query, scrollTop, scrollLeft, draft };
    } catch {
      // 损坏、被篡改或 storage 不可用时按未保存处理，不阻断标签切换。
      return undefined;
    }
  }

  function writePersisted(tab: WorkspaceTabIdentity, state: WorkspaceTabViewState): void {
    if (!storage) return;
    try {
      storage.setItem(
        storageKey(tab.id),
        JSON.stringify({
          version: SNAPSHOT_VERSION,
          tenantId,
          tabId: tab.id,
          path: tab.path,
          ...state,
        }),
      );
    } catch {
      // 配额或隐私模式失败时保留内存快照，调用方仍可在当前会话恢复。
    }
  }

  function currentEntry(tab: WorkspaceTabIdentity): StoredEntry | undefined {
    const key = memoryKey(tab.id);
    if (tombstones.has(key)) return undefined;
    const cached = memory.get(key);
    if (cached && cached.path === tab.path) return cached;
    const persisted = readPersisted(tab);
    return persisted ? { path: tab.path, state: persisted } : undefined;
  }

  return {
    capture(tab, state) {
      const key = memoryKey(tab.id);
      const tombstoned = tombstones.has(key);
      const previous = disposed ? EMPTY_STATE : tombstoned ? EMPTY_STATE : currentEntry(tab)?.state;
      const next = normalizeState(state, previous ?? EMPTY_STATE);
      if (disposed) return next;
      // 重新 capture 表示标签被重新打开/接管，旧 tombstone 不再阻止新快照。
      tombstones.delete(key);
      memory.set(key, { path: tab.path, state: next });
      writePersisted(tab, next);
      return cloneState(next);
    },

    restore(tab) {
      if (disposed) return undefined;
      const entry = currentEntry(tab);
      if (!entry) return undefined;
      memory.set(memoryKey(tab.id), entry);
      return cloneState(entry.state);
    },

    markDraft(tab, draft) {
      if (disposed) return;
      const key = memoryKey(tab.id);
      const previous = tombstones.has(key)
        ? EMPTY_STATE
        : (currentEntry(tab)?.state ?? EMPTY_STATE);
      const next = normalizeState({ ...previous, draft });
      tombstones.delete(key);
      memory.set(key, { path: tab.path, state: next });
      writePersisted(tab, next);
    },

    hasDraft(tab) {
      if (disposed) return false;
      return currentEntry(tab)?.state.draft ?? false;
    },

    clear(tab) {
      if (disposed) return { memoryCleared: false, storage: 'not-configured' };
      const key = memoryKey(tab.id);
      memory.delete(key);
      // 先立 tombstone，即使 removeItem 抛错，同一实例也不能从 storage 回读旧标签。
      tombstones.add(key);
      if (!storage) return { memoryCleared: true, storage: 'not-configured' };
      try {
        storage.removeItem(storageKey(tab.id));
        return { memoryCleared: true, storage: 'cleared' };
      } catch {
        return { memoryCleared: true, storage: 'failed' };
      }
    },

    dispose() {
      disposed = true;
      memory.clear();
      tombstones.clear();
    },
  };
}