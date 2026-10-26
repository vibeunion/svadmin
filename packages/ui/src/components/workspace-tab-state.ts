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

/** 可安全序列化为 JSON 的草稿值。 */
export type WorkspaceDraftJsonValue =
  | null
  | boolean
  | string
  | number
  | WorkspaceDraftJsonValue[]
  | WorkspaceDraftJsonObject;

/** 草稿载荷的顶层只接受普通对象。 */
export interface WorkspaceDraftJsonObject {
  [key: string]: WorkspaceDraftJsonValue;
}

export interface WorkspaceTabViewState {
  /** 规范化后的查询串，不包含开头的 `?`。 */
  query: string;
  scrollTop: number;
  scrollLeft: number;
  draft: boolean;
  /** 仅当显式配置 userId、draftFields 和 storage 后才会持久化的草稿字段。 */
  draftData?: WorkspaceDraftJsonObject;
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
   * 持久化清理结果。`failed` 表示 removeItem 失败或未能真正删除；适配器会尝试
   * 写入跨实例关闭标记，并保证同一运行时的其它 adapter 使用同一 storage 对象时
   * 不再回读旧快照。若 storage 连关闭标记也无法写入，刷新或跨运行时的新实例仍
   * 可能读到旧快照，调用方不能据此声称持久化已删除。
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
  /**
   * 最近一次草稿载荷处理结果。`capture` 的返回状态不携带诊断，避免改变既有
   * 返回契约；调用方需要区分“未尝试草稿”和“草稿被拒绝”时读取此方法。
   */
  getLastDraftDataIssue(): WorkspaceDraftDataIssue | undefined;
}

export type WorkspaceDraftDataIssue =
  | 'disabled'
  | 'empty-allowlist'
  | 'invalid'
  | 'too-large'
  | 'storage-failed';

export interface WorkspaceTabStateAdapterOptions {
  /** 租户隔离键；不同租户即使标签 id/path 相同也不共享快照。 */
  tenantId: string;
  /** 可选持久化；传入 sessionStorage 等实现即可跨刷新恢复。 */
  storage?: WorkspaceTabStateStorage | null;
  keyPrefix?: string;
  /** 草稿数据所属用户；未提供时使用固定 anonymous 仅维持旧视图快照。 */
  userId?: string;
  /** 草稿顶层字段白名单；空数组或缺省都不会保存 draftData。 */
  draftFields?: readonly string[];
  /** draftData 序列化后的 UTF-8 字节上限，默认 65536。 */
  maxDraftBytes?: number;
}

const SNAPSHOT_VERSION = 1;
const DEFAULT_KEY_PREFIX = 'svadmin:workspace-tab-state';
const ANONYMOUS_USER_ID = 'anonymous';
const DEFAULT_MAX_DRAFT_BYTES = 65536;
const MAX_DRAFT_DEPTH = 32;
const MAX_DRAFT_NODES = 10000;
const FORBIDDEN_DRAFT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const EMPTY_STATE: WorkspaceTabViewState = {
  query: '',
  scrollTop: 0,
  scrollLeft: 0,
  draft: false,
};

// 同一 storage 对象上的关闭标记需跨 adapter 实例共享，不能只依赖各自的内存
// tombstone。持久化的关闭信封负责刷新/新运行时；这个 WeakMap 负责同一运行时
// 即使 storage 写入也失败时的最小安全兜底。
const sharedClearTombstones = new WeakMap<WorkspaceTabStateStorage, Map<string, object>>();

function sharedTombstonesFor(storage: WorkspaceTabStateStorage): Map<string, object> {
  let tombstones = sharedClearTombstones.get(storage);
  if (!tombstones) {
    tombstones = new Map<string, object>();
    sharedClearTombstones.set(storage, tombstones);
  }
  return tombstones;
}

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
  const cloned: WorkspaceTabViewState = { ...state };
  if (state.draftData !== undefined) {
    cloned.draftData = cloneDraftData(state.draftData);
  }
  return cloned;
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isPlainDraftObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && isPlainObject(value);
}

interface DraftJsonBudget {
  stack: WeakSet<object>;
  nodes: number;
}

function validateDraftJsonValue(
  value: unknown,
  budget: DraftJsonBudget,
  depth: number,
): boolean {
  budget.nodes += 1;
  if (budget.nodes > MAX_DRAFT_NODES) return false;
  if (depth > MAX_DRAFT_DEPTH) return false;
  if (value === null) return true;
  switch (typeof value) {
    case 'boolean':
    case 'string':
      return true;
    case 'number':
      return Number.isFinite(value);
    case 'object':
      break;
    default:
      // undefined、函数、Symbol、BigInt 都不是纯 JSON 值。
      return false;
  }

  const objectValue = value as object;
  const stack = budget.stack;
  if (
    objectValue instanceof Date ||
    objectValue instanceof Map ||
    objectValue instanceof Set ||
    (typeof File !== 'undefined' && objectValue instanceof File) ||
    (typeof Blob !== 'undefined' && objectValue instanceof Blob)
  ) {
    return false;
  }
  if (stack.has(objectValue)) return false;
  stack.add(objectValue);
  try {
    if (Array.isArray(objectValue)) {
      if (Object.getOwnPropertySymbols(objectValue).length > 0) return false;
      const names = Object.getOwnPropertyNames(objectValue);
      for (const name of names) {
        if (name === 'length') continue;
        // 稀疏数组、非索引属性、访问器或不可枚举元素都不属于纯 JSON 数组。
        if (!/^(0|[1-9]\d*)$/.test(name)) return false;
        const index = Number(name);
        if (!Number.isInteger(index) || index < 0 || index >= objectValue.length) return false;
        const descriptor = Object.getOwnPropertyDescriptor(objectValue, name);
        if (
          !descriptor ||
          typeof descriptor.get === 'function' ||
          typeof descriptor.set === 'function' ||
          descriptor.enumerable !== true
        ) {
          return false;
        }
        if (!validateDraftJsonValue((objectValue as unknown[])[index], budget, depth + 1)) {
          return false;
        }
      }
      for (let index = 0; index < objectValue.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(objectValue, String(index))) return false;
      }
      return true;
    }

    if (!isPlainObject(objectValue)) return false;
    if (Object.getOwnPropertySymbols(objectValue).length > 0) return false;
    for (const key of Object.getOwnPropertyNames(objectValue)) {
      if (FORBIDDEN_DRAFT_KEYS.has(key)) return false;
      const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
      if (
        !descriptor ||
        typeof descriptor.get === 'function' ||
        typeof descriptor.set === 'function' ||
        descriptor.enumerable !== true
      ) {
        return false;
      }
      if (
        !validateDraftJsonValue(
          (objectValue as Record<string, unknown>)[key],
          budget,
          depth + 1,
        )
      ) {
        return false;
      }
    }
    return true;
  } finally {
    stack.delete(objectValue);
  }
}

function isValidDraftJsonObject(value: unknown): value is WorkspaceDraftJsonObject {
  return (
    isPlainDraftObject(value) &&
    validateDraftJsonValue(value, { stack: new WeakSet(), nodes: 0 }, 0)
  );
}

function cloneDraftJsonValue(value: WorkspaceDraftJsonValue): WorkspaceDraftJsonValue {
  if (Array.isArray(value)) return value.map(cloneDraftJsonValue);
  if (value !== null && typeof value === 'object') {
    const cloned: WorkspaceDraftJsonObject = {};
    for (const key of Object.keys(value)) {
      const child = value[key];
      if (child !== undefined) cloned[key] = cloneDraftJsonValue(child);
    }
    return cloned;
  }
  return value;
}

function cloneDraftData(
  draftData: WorkspaceDraftJsonObject,
): WorkspaceDraftJsonObject {
  return cloneDraftJsonValue(draftData) as WorkspaceDraftJsonObject;
}

function draftDataByteLength(draftData: WorkspaceDraftJsonObject): number {
  return new TextEncoder().encode(JSON.stringify(draftData)).length;
}

function filterDraftData(
  draftData: Record<string, unknown>,
  fields: readonly string[],
): WorkspaceDraftJsonObject {
  const filtered: WorkspaceDraftJsonObject = {};
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(draftData, field)) continue;
    filtered[field] = cloneDraftJsonValue(
      draftData[field] as WorkspaceDraftJsonValue,
    );
  }
  return filtered;
}

function normalizeMaxDraftBytes(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_MAX_DRAFT_BYTES;
  }
  return Math.floor(value);
}

export function createWorkspaceTabStateAdapter(
  options: WorkspaceTabStateAdapterOptions,
): WorkspaceTabStateAdapter {
  const tenantId = options.tenantId;
  const storage = options.storage ?? null;
  const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const tenantScoped = typeof tenantId === 'string' && tenantId.trim().length > 0;
  const rawUserId = typeof options.userId === 'string' ? options.userId : '';
  // 显式身份（包括字面量 anonymous）与未登录 fallback 是两种作用域，不能共用
  // 存储键，也不能让显式身份回退读取旧的无 userId 视图键。身份本身保留原始
  // 字符串，只用 trim 判断是否为空，避免把 `x` 与 `  x  ` 合并成同一用户。
  const explicitIdentity = rawUserId.trim().length > 0;
  const configuredUserId = explicitIdentity ? rawUserId : undefined;
  const effectiveUserId = configuredUserId ?? ANONYMOUS_USER_ID;
  // 复制调用方白名单，防止适配器创建后外部 push/splice 改变保护范围。
  const draftFields = options.draftFields === undefined ? undefined : [...options.draftFields];
  const draftAllowlistInvalid =
    draftFields !== undefined &&
    draftFields.some(
      (field) => typeof field !== 'string' || FORBIDDEN_DRAFT_KEYS.has(field),
    );
  const maxDraftBytes = normalizeMaxDraftBytes(options.maxDraftBytes);
  const draftDataEnabled =
    configuredUserId !== undefined &&
    tenantScoped &&
    draftFields !== undefined &&
    storage !== null &&
    !draftAllowlistInvalid;
  const memory = new Map<string, StoredEntry>();
  const tombstones = new Set<string>();
  // 清理失败后，本实例显式 capture/markDraft 产生的新内存快照可以优先于同一
  // 个共享关闭标记；只有在对应 storage 写入并回读确认成功后，才退休该跨实例阻断。
  // 记录标记身份而不是布尔值，后续新的 clear 会替换标记，旧的内存优先权随之失效。
  const memoryOverrides = new Map<string, Set<object>>();
  const storageTombstones = storage ? sharedTombstonesFor(storage) : null;
  let disposed = false;
  let lastDraftDataIssue: WorkspaceDraftDataIssue | undefined;

  function memoryKey(tabId: string): string {
    return `${encodeURIComponent(tenantId)}::${encodeURIComponent(tabId)}`;
  }

  function storageKeys(tabId: string): string[] {
    const prefixes = `${keyPrefix}:v${SNAPSHOT_VERSION}:${encodeURIComponent(tenantId)}`;
    // 显式身份统一放进 `user:` 命名空间，避免任何字面量（包括 anonymous、
    // 含分隔符或空白的 id）与未登录 fallback 的键发生碰撞；显式身份只写自己
    // 的键，不参与旧键回退。
    const primary = explicitIdentity
      ? `${prefixes}:user:${encodeURIComponent(configuredUserId ?? '')}:${encodeURIComponent(tabId)}`
      : `${prefixes}:${encodeURIComponent(effectiveUserId)}:${encodeURIComponent(tabId)}`;
    if (explicitIdentity) return [primary];
    // 旧版本的无 userId 快照使用 tenant + tab 两级键；保留只读回退，写入仍走
    // 包含 user 的新键，避免新草稿数据落回旧键。
    const legacy = `${prefixes}:${encodeURIComponent(tabId)}`;
    return [primary, legacy];
  }

  interface BarrierState {
    key: string;
    keys: string[];
    barriers: object[];
    sharedBlocked: boolean;
    overridden: boolean;
    blocked: boolean;
  }

  function barrierState(tabId: string): BarrierState {
    const key = memoryKey(tabId);
    const keys = storageKeys(tabId);
    const barriers = keys
      .map((storageKey) => storageTombstones?.get(storageKey))
      .filter((barrier): barrier is object => barrier !== undefined);
    const overrides = memoryOverrides.get(key);
    const overridden =
      barriers.length > 0 && barriers.every((barrier) => overrides?.has(barrier) === true);
    return {
      key,
      keys,
      barriers,
      sharedBlocked: barriers.length > 0,
      overridden,
      blocked: tombstones.has(key) || (barriers.length > 0 && !overridden),
    };
  }

  function readEnvelope(raw: string, tab: WorkspaceTabIdentity): WorkspaceTabViewState | 'invalid' | 'closed' {
    try {
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) return 'invalid';
      const record = value as Record<string, unknown>;
      // 关闭标记不是快照：无论旧快照是否仍残留，都不能再恢复已关闭标签。
      if (record['closed'] === true) return 'closed';
      // 显式身份必须精确匹配 envelope.userId，缺失也不能按匿名视图接受；
      // 未登录 fallback 仅接受自身匿名信封或旧版无 userId 视图信封。
      const envelopeUserId = record['userId'];
      const userIdValid = explicitIdentity
        ? envelopeUserId === configuredUserId
        : envelopeUserId === undefined || envelopeUserId === ANONYMOUS_USER_ID;
      // 持久化读取不做宽容归一化：任何字段错误都按无快照处理，尤其不能把
      // `draft: "true"` 洗成 false 而静默丢失草稿保护。
      if (
        record['version'] !== SNAPSHOT_VERSION ||
        record['tenantId'] !== tenantId ||
        record['tabId'] !== tab.id ||
        record['path'] !== tab.path ||
        !userIdValid ||
        typeof record['query'] !== 'string' ||
        !isValidScroll(record['scrollTop']) ||
        !isValidScroll(record['scrollLeft']) ||
        typeof record['draft'] !== 'boolean'
      ) {
        return 'invalid';
      }
      const state: WorkspaceTabViewState = {
        query: record['query'],
        scrollTop: record['scrollTop'],
        scrollLeft: record['scrollLeft'],
        draft: record['draft'],
      };
      if (Object.prototype.hasOwnProperty.call(record, 'draftData')) {
        const persistedDraft = record['draftData'];
        // 已持久化的草稿必须整体合法；非法载荷让整条快照失效，不能只丢弃草稿
        // 后继续恢复 query/scroll，否则会掩盖损坏或被篡改的数据。
        if (!isValidDraftJsonObject(persistedDraft)) {
          lastDraftDataIssue = 'invalid';
          return 'invalid';
        }
        // 恢复时对过滤前的完整载荷再次执行字节上限校验，避免只校验白名单
        // 子集而让被篡改/膨胀的信封通过。
        if (draftDataByteLength(persistedDraft) > maxDraftBytes) {
          lastDraftDataIssue = 'too-large';
          return 'invalid';
        }
        // 危险白名单即使已经持久化也拒绝恢复，不能让过滤阶段把危险键
        // 写进结果对象。
        if (draftAllowlistInvalid) {
          lastDraftDataIssue = 'invalid';
          return 'invalid';
        }
        if (draftDataEnabled && draftFields !== undefined && draftFields.length > 0) {
          state.draftData = filterDraftData(persistedDraft, draftFields);
        }
      }
      return state;
    } catch {
      // 损坏、被篡改或 storage 不可用时按未保存处理，不阻断标签切换。
      return 'invalid';
    }
  }

  function readPersisted(tab: WorkspaceTabIdentity): WorkspaceTabViewState | undefined {
    if (!storage) return undefined;
    for (const storageKey of storageKeys(tab.id)) {
      let raw: string | null;
      try {
        raw = storage.getItem(storageKey);
      } catch {
        return undefined;
      }
      if (raw === null) continue;
      const result = readEnvelope(raw, tab);
      // 新键存在但损坏/关闭时不能回退旧键，否则清理或损坏的标识会被旧快照绕过。
      if (result === 'invalid' || result === 'closed') return undefined;
      return result;
    }
    return undefined;
  }

  function writePersisted(tab: WorkspaceTabIdentity, state: WorkspaceTabViewState): boolean {
    if (!storage) return true;
    try {
      const [key] = storageKeys(tab.id);
      if (key === undefined) return false;
      const serialized = JSON.stringify({
        version: SNAPSHOT_VERSION,
        tenantId,
        userId: effectiveUserId,
        tabId: tab.id,
        path: tab.path,
        ...state,
      });
      storage.setItem(key, serialized);
      // setItem 不抛错不等于真的写入：必须回读确认，避免静默 no-op 让旧快照复活。
      return storage.getItem(key) === serialized;
    } catch {
      // 配额或隐私模式失败时保留内存快照，调用方仍可在当前会话恢复。
      return false;
    }
  }

  function currentEntry(tab: WorkspaceTabIdentity): StoredEntry | undefined {
    const barrier = barrierState(tab.id);
    if (tombstones.has(barrier.key)) return undefined;
    const cached = memory.get(barrier.key);
    // 该 id 已有内存快照时，以内存为准：path 不匹配就视为未保存，绝不回读
    // 持久化旧路径来覆盖内存中的新快照（例如持久化写失败后的会话）。
    if (cached) {
      if (cached.path !== tab.path) return undefined;
      // 其它实例清理失败留下的共享阻断仍优先，除非本实例已显式接管新内存。
      if (barrier.sharedBlocked && !barrier.overridden) return undefined;
      return cached;
    }
    if (barrier.sharedBlocked) return undefined;
    const persisted = readPersisted(tab);
    return persisted ? { path: tab.path, state: persisted } : undefined;
  }

  function settlePersistence(
    barrier: BarrierState,
    persisted: boolean,
  ): void {
    if (persisted) {
      // 只有新快照确实写入并回读一致，才能退休共享关闭标记。
      for (const storageKey of barrier.keys) storageTombstones?.delete(storageKey);
      memoryOverrides.delete(barrier.key);
      return;
    }
    if (barrier.sharedBlocked) {
      // 持久化未确认：本地新内存可用，但跨实例阻断继续保留。
      const overrides = memoryOverrides.get(barrier.key) ?? new Set<object>();
      for (const sharedBarrier of barrier.barriers) overrides.add(sharedBarrier);
      memoryOverrides.set(barrier.key, overrides);
    } else {
      memoryOverrides.delete(barrier.key);
    }
    // 草稿能力一旦启用，任何持久化失败都可能丢失草稿或清除结果，必须让调用方
    // 通过诊断看到；不能只在本次状态仍带 draftData 时才报告。
    if (draftDataEnabled) lastDraftDataIssue = 'storage-failed';
  }

  function resolveDraftDataInput(
    input: Partial<WorkspaceTabViewState> | undefined,
    previous: WorkspaceTabViewState | undefined,
  ): { draftData?: WorkspaceDraftJsonObject; issue?: WorkspaceDraftDataIssue } {
    const hasDraftDataProperty =
      input !== undefined &&
      Object.prototype.hasOwnProperty.call(input, 'draftData');
    // 显式传入 draftData: undefined 表示清除；完全省略才沿用旧草稿。
    if (hasDraftDataProperty && input.draftData === undefined) return {};
    if (!hasDraftDataProperty) {
      return draftDataEnabled && previous?.draftData !== undefined
        ? { draftData: cloneDraftData(previous.draftData) }
        : {};
    }
    if (draftAllowlistInvalid) return { issue: 'invalid' };
    if (!draftDataEnabled) return { issue: 'disabled' };
    if (draftFields === undefined || draftFields.length === 0) {
      return { issue: 'empty-allowlist' };
    }
    if (draftFields.some((field) => FORBIDDEN_DRAFT_KEYS.has(field))) {
      return { issue: 'invalid' };
    }
    const source = input.draftData;
    if (!isPlainDraftObject(source)) return { issue: 'invalid' };

    const filtered: WorkspaceDraftJsonObject = {};
    // 整个候选草稿共享一份节点/深度预算，不能按字段各自重置。
    // 根对象本身也占用预算，字段值从 depth 1 开始，与 restore 读取持久化载荷
    // 时的深度/节点计算保持一致，避免 capture 比 restore 多放行一层。
    const budget: DraftJsonBudget = { stack: new WeakSet(), nodes: 1 };
    for (const field of draftFields) {
      const descriptor = Object.getOwnPropertyDescriptor(source, field);
      // 白名单外字段直接丢弃；白名单内字段必须存在普通数据属性且值可序列化。
      if (!descriptor) continue;
      if (
        typeof descriptor.get === 'function' ||
        typeof descriptor.set === 'function' ||
        descriptor.enumerable !== true
      ) {
        return { issue: 'invalid' };
      }
      if (!validateDraftJsonValue(descriptor.value, budget, 1)) {
        return { issue: 'invalid' };
      }
      filtered[field] = cloneDraftJsonValue(descriptor.value as WorkspaceDraftJsonValue);
    }
    if (draftDataByteLength(filtered) > maxDraftBytes) return { issue: 'too-large' };
    return { draftData: filtered };
  }

  return {
    capture(tab, state) {
      const barrier = barrierState(tab.id);
      const previous = disposed
        ? EMPTY_STATE
        : barrier.blocked
          ? EMPTY_STATE
          : currentEntry(tab)?.state;
      const next = normalizeState(state, previous ?? EMPTY_STATE);
      const draftResult = resolveDraftDataInput(state, previous);
      lastDraftDataIssue = draftResult.issue;
      // 保存/关闭草稿（draft:false）时同步清除草稿载荷，避免旧内容在后续
      // capture 时复活；draftData: undefined 的显式清除路径已由 resolve 处理。
      const explicitlyClean =
        state !== undefined &&
        Object.prototype.hasOwnProperty.call(state, 'draft') &&
        state.draft === false;
      if (!explicitlyClean && draftResult.draftData !== undefined) {
        next.draftData = draftResult.draftData;
      }
      if (disposed) return cloneState(next);
      // 重新 capture 表示标签被重新打开/接管，本实例旧 tombstone 不再阻止新快照。
      tombstones.delete(barrier.key);
      memory.set(barrier.key, { path: tab.path, state: next });
      const persisted = writePersisted(tab, next);
      settlePersistence(barrier, persisted);
      return cloneState(next);
    },

    restore(tab) {
      if (disposed) return undefined;
      lastDraftDataIssue = undefined;
      const entry = currentEntry(tab);
      if (!entry) return undefined;
      memory.set(memoryKey(tab.id), entry);
      return cloneState(entry.state);
    },

    markDraft(tab, draft) {
      if (disposed) return;
      const barrier = barrierState(tab.id);
      const previous = barrier.blocked ? EMPTY_STATE : (currentEntry(tab)?.state ?? EMPTY_STATE);
      const next = normalizeState({ ...previous, draft });
      if (draft && previous.draftData !== undefined) {
        next.draftData = cloneDraftData(previous.draftData);
      }
      lastDraftDataIssue = undefined;
      tombstones.delete(barrier.key);
      memory.set(barrier.key, { path: tab.path, state: next });
      const persisted = writePersisted(tab, next);
      settlePersistence(barrier, persisted);
    },

    hasDraft(tab) {
      if (disposed) return false;
      return currentEntry(tab)?.state.draft ?? false;
    },

    clear(tab) {
      if (disposed) return { memoryCleared: false, storage: 'not-configured' };
      const key = memoryKey(tab.id);
      const persistedKeys = storageKeys(tab.id);
      memory.delete(key);
      memoryOverrides.delete(key);
      // 先立 tombstone，即使 removeItem 抛错，同一实例也不能从 storage 回读旧标签。
      tombstones.add(key);
      if (!storage) return { memoryCleared: true, storage: 'not-configured' };
      // 同一运行时的其它 adapter 使用同一 storage 对象时也立即失效；capture
      // 重新打开同 id/path 时会移除该标记并重新接管。
      const barrier = {};
      for (const persistedKey of persistedKeys) storageTombstones?.set(persistedKey, barrier);

      let allRemoved = true;
      for (const persistedKey of persistedKeys) {
        let exists: boolean;
        try {
          exists = storage.getItem(persistedKey) !== null;
        } catch {
          // 读取失败时仍尝试删除，不能因为无法确认存在就跳过清理。
          exists = true;
        }
        if (!exists) continue;
        let removed = false;
        try {
          storage.removeItem(persistedKey);
          // removeItem 不抛错不等于真的删除；仍能读到旧值时必须按失败处理，
          // 不能让新实例恢复已关闭标签。
          removed = storage.getItem(persistedKey) === null;
        } catch {
          // removeItem 抛错时 removed 保持 false，按失败处理。
        }
        if (!removed) allRemoved = false;
      }
      if (allRemoved) return { memoryCleared: true, storage: 'cleared' };

      for (const persistedKey of persistedKeys) {
        try {
          // 删除失败或未生效时写入关闭信封，供刷新后的新实例识别，而不是回读旧快照。
          storage.setItem(
            persistedKey,
            JSON.stringify({
              version: SNAPSHOT_VERSION,
              tenantId,
              tabId: tab.id,
              closed: true,
            }),
          );
        } catch {
          // 关闭标记也写不进去时仍返回 failed；同一运行时共享 tombstone 继续阻止
          // 同 storage 对象的新 adapter。跨刷新风险由调用方按 failed 处理。
        }
      }
      return { memoryCleared: true, storage: 'failed' };
    },

    dispose() {
      disposed = true;
      memory.clear();
      tombstones.clear();
      memoryOverrides.clear();
      lastDraftDataIssue = undefined;
    },

    getLastDraftDataIssue() {
      return lastDraftDataIssue;
    },
  };
}
