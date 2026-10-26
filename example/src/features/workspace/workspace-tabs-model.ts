import type { CrudOperator, Filter, Pagination, Sort } from '@svadmin/core';
import type {
  ListStateSnapshot,
  WorkspaceDraftJsonObject,
  WorkspaceTab,
  WorkspaceTabStateStorage,
} from '@svadmin/ui';

export const OPENABLE_RESOURCES = [
  'crm_accounts',
  'crm_contacts',
  'crm_deals',
  'crm_activities',
] as const;
export type WorkspaceResource = (typeof OPENABLE_RESOURCES)[number];

export const EDITABLE_RESOURCES = ['crm_accounts'] as const;
export type EditableResource = (typeof EDITABLE_RESOURCES)[number];

export interface WorkspaceListTabDescriptor {
  kind: 'list';
  resource: WorkspaceResource;
}

export interface WorkspaceEditorTabDescriptor {
  kind: 'editor';
  resource: EditableResource;
  recordId: string;
}

export type WorkspaceTabDescriptor = WorkspaceListTabDescriptor | WorkspaceEditorTabDescriptor;

export const DEFAULT_RESOURCE: WorkspaceResource = 'crm_accounts';
export const DEFAULT_EDITOR_RECORD_ID = '1';
export const EDITOR_TAB_PREFIX = 'edit';
export const DEFAULT_RESOURCES: WorkspaceResource[] = [DEFAULT_RESOURCE, 'crm_deals'];
export const MAX_TABS = 3;
export const TAB_SESSION_VERSION = 2;
export const TAB_SESSION_KEY_PREFIX = 'svadmin:example-workspace-tabs';
export const TAB_SYNC_VERSION = 1;
export const TAB_SYNC_CHANNEL_PREFIX = `${TAB_SESSION_KEY_PREFIX}:sync`;
export const TAB_STATE_KEY_PREFIX = 'svadmin:example-workspace-tab-state';
export const LIST_STATE_ENVELOPE_VERSION = 1;
export const DRAFT_BASELINE_KEY = '__workspaceDraftBaseline';

export const EDITOR_DRAFT_FIELDS: Record<EditableResource, readonly string[]> = {
  crm_accounts: ['accountName'],
};

const LIST_FILTER_OPERATORS = new Set<string>([
  'eq', 'ne', 'lt', 'gt', 'lte', 'gte',
  'contains', 'ncontains', 'startswith', 'endswith',
  'in', 'nin', 'null', 'nnull', 'between', 'nbetween',
]);

export interface StoredWorkspaceTabs {
  tabIds: string[];
  activeTabId: string | undefined;
}

export interface WorkspaceTabsSyncMessage {
  version: typeof TAB_SYNC_VERSION;
  type: 'request' | 'state';
  scope: string;
  senderId: string;
  revision?: number;
  tabIds?: string[];
}

export interface PendingRemoteTabState {
  revision: number;
  senderId: string;
  tabIds: string[];
}

export function draftFieldKeys(resource: EditableResource): readonly string[] {
  return EDITOR_DRAFT_FIELDS[resource] ?? [];
}

export function adapterDraftFields(): string[] {
  const keys = new Set<string>([DRAFT_BASELINE_KEY]);
  for (const resource of EDITABLE_RESOURCES) {
    for (const key of draftFieldKeys(resource)) keys.add(key);
  }
  return [...keys];
}

export function stableDraftJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableDraftJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableDraftJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

export function businessDraftValues(
  data: Record<string, unknown>,
  fields: readonly string[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const key of fields) {
    if (Object.prototype.hasOwnProperty.call(data, key)) values[key] = data[key];
  }
  return values;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isWorkspaceResource(value: string | undefined): value is WorkspaceResource {
  return value !== undefined && (OPENABLE_RESOURCES as readonly string[]).includes(value);
}

export function isEditableResource(value: string | undefined): value is EditableResource {
  return value !== undefined && (EDITABLE_RESOURCES as readonly string[]).includes(value);
}

export function parseWorkspaceTabId(value: string): WorkspaceTabDescriptor | undefined {
  if (isWorkspaceResource(value)) return { kind: 'list', resource: value };
  const prefix = `${EDITOR_TAB_PREFIX}:`;
  if (!value.startsWith(prefix)) return undefined;
  const rest = value.slice(prefix.length);
  const separator = rest.indexOf(':');
  if (separator <= 0) return undefined;
  const resource = rest.slice(0, separator);
  if (!isEditableResource(resource)) return undefined;
  const encodedRecordId = rest.slice(separator + 1);
  if (!encodedRecordId) return undefined;
  let recordId: string;
  try {
    recordId = decodeURIComponent(encodedRecordId);
  } catch {
    return undefined;
  }
  if (!recordId.trim()) return undefined;
  return { kind: 'editor', resource, recordId };
}

export function editorTabId(resource: EditableResource, recordId: string): string {
  return `${EDITOR_TAB_PREFIX}:${resource}:${encodeURIComponent(recordId)}`;
}

export function isCrudOperator(value: unknown): value is CrudOperator {
  return typeof value === 'string' && LIST_FILTER_OPERATORS.has(value);
}

function isPositiveInteger(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= max;
}

function decodeListFilter(
  value: unknown,
  budget: { remaining: number },
  depth = 0,
): Filter | undefined {
  if (depth > 20 || budget.remaining-- <= 0 || !isRecord(value)) return undefined;
  if (typeof value['field'] === 'string') {
    if (!value['field'].trim() || !isCrudOperator(value['operator']) || !('value' in value)) {
      return undefined;
    }
    return { field: value['field'], operator: value['operator'], value: value['value'] };
  }
  if ((value['operator'] !== 'and' && value['operator'] !== 'or') || !Array.isArray(value['value'])) {
    return undefined;
  }
  const children = value['value'].map((child) => decodeListFilter(child, budget, depth + 1));
  if (children.some((child) => child === undefined)) return undefined;
  return { operator: value['operator'], value: children as Filter[] };
}

function decodeListSorters(value: unknown): Sort[] | undefined {
  if (!Array.isArray(value) || value.length > 20) return undefined;
  const sorters: Sort[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate) || typeof candidate['field'] !== 'string' || !candidate['field'].trim()) {
      return undefined;
    }
    if (candidate['order'] !== 'asc' && candidate['order'] !== 'desc') return undefined;
    sorters.push({ field: candidate['field'], order: candidate['order'] });
  }
  return sorters;
}

function decodeListPagination(value: unknown): Pagination | undefined {
  if (!isRecord(value)) return undefined;
  if (!isPositiveInteger(value['current'], 1_000_000) || !isPositiveInteger(value['pageSize'], 1_000)) {
    return undefined;
  }
  return { current: value['current'], pageSize: value['pageSize'] };
}

function decodeListSnapshot(value: unknown): ListStateSnapshot | undefined {
  if (!isRecord(value) || typeof value['search'] !== 'string' || value['search'].length > 1_000) {
    return undefined;
  }
  if (!Array.isArray(value['filters']) || value['filters'].length > 200) return undefined;
  const budget = { remaining: 200 };
  const filters = value['filters'].map((filter) => decodeListFilter(filter, budget));
  if (filters.some((filter) => filter === undefined)) return undefined;
  const sorters = decodeListSorters(value['sorters']);
  const pagination = decodeListPagination(value['pagination']);
  if (!sorters || !pagination) return undefined;
  return { search: value['search'], filters: filters as Filter[], sorters, pagination };
}

export function decodePersistedListState(
  raw: string | undefined,
  tab: WorkspaceTab,
): ListStateSnapshot | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return undefined;
    if (parsed['version'] !== LIST_STATE_ENVELOPE_VERSION || parsed['resource'] !== tab.id || parsed['path'] !== tab.path) {
      return undefined;
    }
    return decodeListSnapshot(parsed['snapshot']);
  } catch {
    return undefined;
  }
}

export function encodePersistedListState(tab: WorkspaceTab, snapshot: ListStateSnapshot): string {
  return JSON.stringify({
    version: LIST_STATE_ENVELOPE_VERSION,
    resource: tab.id,
    path: tab.path,
    snapshot,
  });
}

export function tabPathForId(id: string): string {
  return `/workspace?tab=${encodeURIComponent(id)}`;
}

export function createWorkspaceTab(resource: WorkspaceResource, label: string): WorkspaceTab {
  return { id: resource, title: label, path: tabPathForId(resource), closable: true };
}

export function createWorkspaceEditorTab(
  resource: EditableResource,
  recordId: string,
  label: string,
  isZh: boolean,
): WorkspaceTab {
  const id = editorTabId(resource, recordId);
  return {
    id,
    title: isZh ? `编辑 ${label} #${recordId}` : `Edit ${label} #${recordId}`,
    path: tabPathForId(id),
    closable: true,
    dirty: false,
  };
}

export function createWorkspaceTabFromId(
  id: string,
  label: (resource: WorkspaceResource | EditableResource) => string,
  isZh: boolean,
): WorkspaceTab | undefined {
  const descriptor = parseWorkspaceTabId(id);
  if (!descriptor) return undefined;
  return descriptor.kind === 'list'
    ? createWorkspaceTab(descriptor.resource, label(descriptor.resource))
    : createWorkspaceEditorTab(descriptor.resource, descriptor.recordId, label(descriptor.resource), isZh);
}

export function workspaceSessionKey(scope: string): string {
  return `${TAB_SESSION_KEY_PREFIX}:v${TAB_SESSION_VERSION}:${encodeURIComponent(scope)}`;
}

export function workspaceSyncChannelName(scope: string): string {
  return `${TAB_SYNC_CHANNEL_PREFIX}:v${TAB_SYNC_VERSION}:${encodeURIComponent(scope)}`;
}

export function createSyncSenderId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function parseStoredWorkspaceTabs(raw: string | null): StoredWorkspaceTabs | undefined {
  if (raw === null) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value['version'] !== TAB_SESSION_VERSION || !Array.isArray(value['tabs'])) {
      return undefined;
    }
    if (value['tabs'].length > MAX_TABS) return undefined;
    const tabIds: string[] = [];
    const seen = new Set<string>();
    for (const candidate of value['tabs']) {
      if (typeof candidate !== 'string' || !parseWorkspaceTabId(candidate) || seen.has(candidate)) return undefined;
      seen.add(candidate);
      tabIds.push(candidate);
    }
    const active = value['activeTabId'];
    if (active !== null && typeof active !== 'string') return undefined;
    if (active !== null && !seen.has(active)) return undefined;
    if (tabIds.length === 0 && active !== null) return undefined;
    return { tabIds, activeTabId: active ?? undefined };
  } catch {
    return undefined;
  }
}

export function readStoredWorkspaceTabs(scope: string): StoredWorkspaceTabs | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return parseStoredWorkspaceTabs(window.sessionStorage.getItem(workspaceSessionKey(scope)));
  } catch {
    return undefined;
  }
}

export function writeStoredWorkspaceTabs(scope: string, state: StoredWorkspaceTabs): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.sessionStorage.setItem(workspaceSessionKey(scope), JSON.stringify({
      version: TAB_SESSION_VERSION,
      tabs: state.tabIds,
      activeTabId: state.activeTabId ?? null,
    }));
    return true;
  } catch {
    return false;
  }
}

export function createSessionTabStateStorage(): WorkspaceTabStateStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const storage = window.sessionStorage;
    const probeKey = `${TAB_STATE_KEY_PREFIX}:probe`;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => storage.setItem(key, value),
      removeItem: (key) => storage.removeItem(key),
    };
  } catch {
    return undefined;
  }
}

export function parseRequestedWorkspaceTab(hash: string): string | undefined {
  const [, query = ''] = hash.replace(/^#/, '').split('?');
  const requested = new URLSearchParams(query).get('tab') ?? undefined;
  return requested && parseWorkspaceTabId(requested) ? requested : undefined;
}

export function validWorkspaceTabIds(tabs: readonly WorkspaceTab[]): string[] {
  return tabs
    .map((tab) => tab.id)
    .filter((id, index, values) => parseWorkspaceTabId(id) !== undefined && values.indexOf(id) === index);
}

export function parseSyncTabIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length > MAX_TABS) return undefined;
  const ids: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== 'string' || parseWorkspaceTabId(candidate) === undefined || ids.includes(candidate)) {
      return undefined;
    }
    ids.push(candidate);
  }
  return ids;
}

export function withoutTab<T>(record: Record<string, T>, tabId: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== tabId)) as Record<string, T>;
}
