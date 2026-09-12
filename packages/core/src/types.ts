// Core type definitions — DataProvider + AuthProvider + Providers

import type { Component } from 'svelte';
import type { TaskRecord, SubmitTaskOptions, TaskError } from './task-contract';
import type { Identity, CheckResult, AuthErrorResult } from './auth-query-contract';
export type { Identity, CheckResult } from './auth-query-contract';
import type { AuthActionResult } from './auth-mutation-contract';
import type { ResourceContract } from './resource-contract';
export type { AuthActionResult } from './auth-mutation-contract';
export type { TaskRecord, SubmitTaskOptions, TaskDateValue, TaskMessageValue } from './task-contract';

// ─── HttpError ─────────────────────────────────────────────────

export type ValidationErrors = Record<string, string | string[]>;

export interface HttpErrorOptions {
  code?: string;
  details?: unknown;
  body?: unknown;
  cause?: unknown;
}

export class HttpError extends Error {
  statusCode: number;
  errors: ValidationErrors | undefined;
  code: string | undefined;
  details?: unknown;
  body?: unknown;
  override cause?: unknown;

  constructor(
    message: string,
    statusCode: number,
    errors?: ValidationErrors,
    options: HttpErrorOptions = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = options.code;
    this.details = options.details;
    this.body = options.body;
    this.cause = options.cause;
  }
}

export class UndoError extends Error {
  constructor() {
    super('Mutation undone');
    this.name = 'UndoError';
  }
}

/** Raised when a delete-many fallback removed some records but not all. */
export class DeleteManyPartialError extends Error {
  readonly succeededIds: (string | number)[];
  readonly failedIds: (string | number)[];
  readonly causes: unknown[];

  constructor(
    succeededIds: (string | number)[],
    failedIds: (string | number)[],
    causes: unknown[] = [],
  ) {
    super(`Delete many partially failed: ${failedIds.length}/${succeededIds.length + failedIds.length} failed`);
    this.name = 'DeleteManyPartialError';
    this.succeededIds = [...succeededIds];
    this.failedIds = [...failedIds];
    this.causes = [...causes];
  }
}

// ─── Base Types ───────────────────────────────────────────────

export type BaseRecord = Record<string, unknown>;

// ─── DataProvider ─────────────────────────────────────────────

export interface Pagination {
  current?: number;
  pageSize?: number;
  mode?: 'server' | 'client' | 'off';
}

export interface Sort {
  field: string;
  order: 'asc' | 'desc';
}

export type CrudOperator =
  | 'eq' | 'ne' | 'lt' | 'gt' | 'lte' | 'gte'
  | 'contains' | 'ncontains'
  | 'startswith' | 'endswith'
  | 'in' | 'nin'
  | 'null' | 'nnull'
  | 'between' | 'nbetween';

export interface FieldFilter {
  field: string;
  operator: CrudOperator;
  value: unknown;
}

export type Filter = FieldFilter | LogicalFilter;

export interface LogicalFilter {
  operator: 'or' | 'and';
  value: Filter[];
}

export interface GetListParams {
  /** Query-owned cancellation signal. Never include it in a cache key or URL. */
  signal?: AbortSignal;
  resource: string;
  pagination?: Pagination;
  sorters?: Sort[];
  filters?: Filter[];
  meta?: Record<string, unknown>;
}

export interface GetListResult<TData extends BaseRecord = BaseRecord> {
  data: TData[];
  total: number;
  [key: string]: unknown;
}

export interface GetOneParams {
  signal?: AbortSignal;
  resource: string;
  id: string | number;
  meta?: Record<string, unknown>;
}

export interface GetOneResult<TData extends BaseRecord = BaseRecord> {
  data: TData;
}

export interface GetManyParams {
  signal?: AbortSignal;
  resource: string;
  ids: (string | number)[];
  meta?: Record<string, unknown>;
}

export interface GetManyResult<TData extends BaseRecord = BaseRecord> {
  data: TData[];
}

export interface CreateParams<TVariables = unknown> {
  resource: string;
  variables: TVariables;
  meta?: Record<string, unknown>;
}

export interface CreateResult<TData extends BaseRecord = BaseRecord> {
  data: TData;
}

export interface CreateManyParams<TVariables = unknown> {
  resource: string;
  variables: TVariables[];
  meta?: Record<string, unknown>;
}

export interface CreateManyResult<TData extends BaseRecord = BaseRecord> {
  data: TData[];
}

export interface UpdateParams<TVariables = unknown> {
  resource: string;
  id: string | number;
  variables: TVariables;
  meta?: Record<string, unknown>;
}

export interface UpdateResult<TData extends BaseRecord = BaseRecord> {
  data: TData;
}

export interface UpdateManyParams<TVariables = unknown> {
  resource: string;
  ids: (string | number)[];
  variables: TVariables;
  meta?: Record<string, unknown>;
}

export interface UpdateManyResult<TData extends BaseRecord = BaseRecord> {
  data: TData[];
}

export interface DeleteParams<TVariables = unknown> {
  resource: string;
  id: string | number;
  variables?: TVariables;
  meta?: Record<string, unknown>;
}

export interface DeleteResult<TData extends BaseRecord = BaseRecord> {
  data: TData;
}

export interface DeleteManyParams<TVariables = unknown> {
  resource: string;
  ids: (string | number)[];
  variables?: TVariables;
  meta?: Record<string, unknown>;
}

export interface DeleteManyResult<TData extends BaseRecord = BaseRecord> {
  data: TData[];
}

export interface CustomParams<TVariables = unknown> {
  signal?: AbortSignal;
  url: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  payload?: TVariables;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  sorters?: Sort[];
  filters?: Filter[];
  meta?: Record<string, unknown>;
}

export interface CustomResult<TData = unknown> {
  data: TData;
}

export interface DataProvider {
  // Required methods
  getList: (params: GetListParams) => Promise<GetListResult>;
  getOne: (params: GetOneParams) => Promise<GetOneResult>;
  create: (params: CreateParams) => Promise<CreateResult>;
  update: (params: UpdateParams) => Promise<UpdateResult>;
  deleteOne: (params: DeleteParams) => Promise<DeleteResult>;
  getApiUrl: () => string;

  // Optional bulk methods
  getMany?: (params: GetManyParams) => Promise<GetManyResult>;
  createMany?: (params: CreateManyParams) => Promise<CreateManyResult>;
  updateMany?: (params: UpdateManyParams) => Promise<UpdateManyResult>;
  deleteMany?: (params: DeleteManyParams) => Promise<DeleteManyResult>;

  // Optional custom method
  custom?: (params: CustomParams) => Promise<CustomResult>;
}

// ─── TaskProvider ─────────────────────────────────────────────

export interface TaskSubscription {
  unsubscribe(): void;
}

export interface TaskHandle<TTask extends TaskRecord = TaskRecord> {
  id: string;
  wait(): Promise<TTask>;
  subscribe?(callback: (task: TTask) => void, onError?: (error: TaskError) => void): TaskSubscription | (() => void);
  cancel?(): Promise<TTask>;
  retry?(): Promise<TTask>;
}

export interface TaskListResult<TTask extends TaskRecord = TaskRecord> {
  data: TTask[];
  total?: number;
}

export interface TaskProvider<TTask extends TaskRecord = TaskRecord> {
  submit(taskName: string, options?: SubmitTaskOptions): Promise<TaskHandle<TTask>>;
  get(taskId: string): Promise<TTask>;
  list?(params?: Record<string, unknown>): Promise<TaskListResult<TTask>>;
  listDlq?(params?: Record<string, unknown>): Promise<TaskListResult<TTask>>;
  cancel?(taskId: string): Promise<TTask>;
  retry?(taskId: string): Promise<TTask>;
  subscribe?(taskId: string, callback: (task: TTask) => void, onError?: (error: TaskError) => void): TaskSubscription | (() => void);
}

// ─── AuthProvider ─────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface AuthProvider {
  login: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  logout: (params?: Record<string, unknown>) => Promise<AuthActionResult>;
  check: (params?: Record<string, unknown>) => Promise<CheckResult>;
  getIdentity: () => Promise<Identity | null>;
  /**
   * Returns UI-only permission hints for labels, navigation, or disabled controls.
   * Browser-visible values are not authorization evidence: API, RLS, and action
   * handlers must authenticate and authorize the request independently.
   */
  getPermissions?: (params?: Record<string, unknown>) => Promise<unknown>;
  register?: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  forgotPassword?: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  updatePassword?: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  /** Update current user's identity fields such as name or email. */
  updateIdentity?: (params: Partial<Identity> & Record<string, unknown>) => Promise<AuthActionResult>;
  /** Update user profile (name, avatar, etc.) */
  updateProfile?: (params: { name?: string; avatar?: string | File; [key: string]: unknown }) => Promise<AuthActionResult>;
  /** Get list of system roles for RBAC mapping */
  getRoles?: () => Promise<Role[]>;
  /** Get specific role permissions as a matrix map, e.g. { "users": ["create", "read"] } */
  getRolePermissions?: (roleId: string) => Promise<Record<string, string[]>>;
  /** Update permissions for a specific role */
  updateRolePermissions?: (roleId: string, permissions: Record<string, string[]>) => Promise<AuthActionResult>;
  /** Get recent audit logs */
  getAuditLogs?: (params?: { page?: number; pageSize?: number }) => Promise<{ data: AuditLog[]; total: number }>;
  onError?: (error: unknown) => Promise<AuthErrorResult>;
}

export interface AuditLog {
  id: string | number;
  userId?: string | number;
  userName?: string;
  action: string;
  resource?: string;
  createdAt: string | Date;
  ipAddress?: string;
  details?: Record<string, unknown> | string;
}

// ─── NotificationProvider ─────────────────────────────────────

export interface NotificationProvider {
  open: (params: { type: 'success' | 'error' | 'warning' | 'info'; message: string; description?: string; key?: string }) => void;
  close: (key: string) => void;
}

// ─── MutationMode ─────────────────────────────────────────────

export type MutationMode = 'pessimistic' | 'optimistic' | 'undoable';

// ─── ResourceDefinition ───────────────────────────────────────

/** Declares a resource transport protocol; the corresponding provider owns URL and serialization behavior. */
export interface ResourceTransportConfig {
  readonly type: string;
  readonly endpoint?: string;
  readonly options?: Readonly<Record<string, unknown>>;
}

/** Declares a resource backend adapter without binding Core to a concrete runtime implementation. */
export interface ResourceAdapterConfig {
  readonly name: string;
  readonly version?: string;
  readonly options?: Readonly<Record<string, unknown>>;
}

/** Per-resource provider selection and declarative transport/adapter metadata. */
export interface ResourceProviderConfig {
  readonly dataProviderName?: string;
  readonly transport?: string | ResourceTransportConfig;
  readonly adapter?: string | ResourceAdapterConfig;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export interface ResourceDefinition {
  name: string;
  /** Runtime contract required by schema-bound metadata-driven data components. */
  contract?: ResourceContract;
  /** Unique identifier — use when multiple resources share the same `name` but target different DataProviders */
  identifier?: string;
  label: string;
  icon?: string;
  primaryKey?: string;
  fields: FieldDefinition[];
  defaultSort?: Sort;
  pageSize?: number;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canShow?: boolean;
  showInMenu?: boolean;
  parentName?: string;
  menuOrder?: number;
  /** Navigation group name — resources with the same group are displayed in a collapsible section */
  group?: string;
  /** DataProvider selection and declarative transport/adapter metadata. */
  provider?: ResourceProviderConfig;
  /** @deprecated New code should select the DataProvider through `provider.dataProviderName`. */
  meta?: Record<string, unknown> & { dataProviderName?: string; parent?: string };
}

// ─── MenuItem (Multi-Level Menu) ──────────────────────────────

export interface MenuItem {
  /** Unique identifier, also used as i18n fallback key: t(`menu.${name}`) */
  name: string;
  /** Display label. Falls back to `t('menu.${name}')` if omitted */
  label?: string;
  /** Icon name string (maps to lucide icon set) or Svelte component */
  icon?: string | Component;
  /** Navigation path — omit for parent-only menu nodes */
  href?: string;
  /** Open in new tab (useful for external links) */
  target?: '_blank' | '_self';
  /** Permission check metadata */
  meta?: {
    resource?: string;
    action?: string;
    /** Hide this item from the menu entirely */
    hidden?: boolean;
  };
  /** Sub-menu items — supports infinite nesting */
  children?: MenuItem[];
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'tags'
    | 'textarea' | 'richtext' | 'image' | 'images' | 'json' | 'relation' | 'color'
    | 'url' | 'email' | 'phone' | 'currency' | 'file' | 'markdown' | 'password' | 'array'
    | 'tree-select' | 'treeselect' | 'cascader' | 'transfer' | 'rate' | 'rating' | 'avatar' | 'copy' | 'code';
  required?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  showInList?: boolean;
  showInForm?: boolean;
  showInCreate?: boolean;
  showInEdit?: boolean;
  showInShow?: boolean;
  options?: { label: string; value: string | number; children?: unknown[]; disabled?: boolean }[];
  treeOptions?: { label: string; value: string | number; children?: unknown[]; disabled?: boolean }[];
  cascaderOptions?: { label: string; value: string | number; children?: unknown[]; disabled?: boolean }[];
  transferData?: { key: string | number; title: string; description?: string; disabled?: boolean }[];
  multiple?: boolean;
  changeOnSelect?: boolean;
  separator?: string;
  defaultValue?: unknown;
  // Relation support
  resource?: string;       // related resource name
  optionLabel?: string;    // field to use as label
  optionValue?: string;    // field to use as value
  // Array support
  subFields?: FieldDefinition[]; // nested fields for array types
  // Validation
  validate?: (value: unknown) => string | null;
  // Grouping
  group?: string;
}

// ─── Resource Type Registry ───────────────────────────────────

/**
 * Extend this interface via declaration merging to register resource types.
 * Query and mutation hooks infer data from explicit resource names.
 * Extend ResourceInputMap as well to infer mutation payloads.
 *
 * @example
 * ```ts
 * declare module '@svadmin/core' {
 *   interface ResourceTypeMap {
 *     users: { id: string; name: string; email: string }
 *     posts: { id: string; title: string; content: string }
 *   }
 * }
 *
 * // Now hooks auto-infer:
 * const list = useList({ resource: 'users' })
 * // list.data?.data -> { id: string; name: string; email: string }[] | undefined
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ResourceTypeMap {}

/** Extend alongside ResourceTypeMap to register create/update/delete payloads. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ResourceInputMap {}

export type ResourceInputOperation = 'create' | 'update' | 'delete';

/** Unregistered inputs retain the legacy dynamic payload contract. */
export type InferResourceInput<R extends string, O extends ResourceInputOperation> =
  R extends keyof ResourceInputMap
    ? O extends keyof ResourceInputMap[R] ? ResourceInputMap[R][O] : never
    : O extends 'delete' ? Record<string, unknown> | undefined : Record<string, unknown>;

/** When ResourceTypeMap is empty → string; otherwise → registered keys */
export type KnownResources = keyof ResourceTypeMap extends never
  ? string
  : Extract<keyof ResourceTypeMap, string>

/** Infer data type from resource name. Falls back to Record<string, unknown> for unregistered resources */
export type InferData<R extends string> = R extends keyof ResourceTypeMap
  ? ResourceTypeMap[R]
  : Record<string, unknown>

// Map interface models without adding an index signature; distribute over unions.
type RecordShape<T> = T extends object ? { [K in keyof T]: T[K] } : never;

/** @internal Normalized record shape for resource-aware hook signatures. */
export type ResourceRecord<R extends string> = RecordShape<InferData<R>>;
