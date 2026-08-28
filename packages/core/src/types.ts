// Core type definitions — DataProvider + AuthProvider + Providers

import type { Component } from 'svelte';

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
  errors?: ValidationErrors;
  code?: string;
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
  resource: string;
  id: string | number;
  meta?: Record<string, unknown>;
}

export interface GetOneResult<TData extends BaseRecord = BaseRecord> {
  data: TData;
}

export interface GetManyParams {
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
  getList: <TData extends BaseRecord = BaseRecord>(params: GetListParams) => Promise<GetListResult<TData>>;
  getOne: <TData extends BaseRecord = BaseRecord>(params: GetOneParams) => Promise<GetOneResult<TData>>;
  create: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(params: CreateParams<TVariables>) => Promise<CreateResult<TData>>;
  update: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(params: UpdateParams<TVariables>) => Promise<UpdateResult<TData>>;
  deleteOne: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(params: DeleteParams<TVariables>) => Promise<DeleteResult<TData>>;
  getApiUrl: () => string;

  // Optional bulk methods
  getMany?: <TData extends BaseRecord = BaseRecord>(params: GetManyParams) => Promise<GetManyResult<TData>>;
  createMany?: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(params: CreateManyParams<TVariables>) => Promise<CreateManyResult<TData>>;
  updateMany?: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(params: UpdateManyParams<TVariables>) => Promise<UpdateManyResult<TData>>;
  deleteMany?: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(params: DeleteManyParams<TVariables>) => Promise<DeleteManyResult<TData>>;

  // Optional custom method
  custom?: <TData = unknown, TVariables = unknown>(params: CustomParams<TVariables>) => Promise<CustomResult<TData>>;
}

// ─── TaskProvider ─────────────────────────────────────────────

export type TaskDateValue = string | Date | null;
export type TaskMessageValue = string | null;

export interface TaskRecord extends BaseRecord {
  id: string;
  name?: string;
  title?: string;
  status?: string;
  progress?: number;
  priority?: number;
  queueName?: string;
  queue_name?: string;
  message?: TaskMessageValue;
  payload?: unknown;
  /**
   * Task output payload. `result` is the canonical camelCase field used by
   * svadmin UI helpers; `result_data` is accepted for Supabase/Postgres-style
   * task mirrors. Consumers should prefer `result`, then fall back to
   * `result_data`, matching `resolveTaskResult`.
   */
  result?: unknown;
  result_data?: unknown;
  /**
   * Task lifecycle timestamps. Supabase/Postgres mirrors often expose nullable
   * columns for lifecycle phases that have not happened yet, and svadmin UI
   * helpers intentionally skip nullish values with `??` fallback ordering.
   */
  createdAt?: TaskDateValue;
  created_at?: TaskDateValue;
  updatedAt?: TaskDateValue;
  updated_at?: TaskDateValue;
  startedAt?: TaskDateValue;
  started_at?: TaskDateValue;
  finishedAt?: TaskDateValue;
  finished_at?: TaskDateValue;
  cancelledAt?: TaskDateValue;
  cancelled_at?: TaskDateValue;
  /**
   * Task failure payload/message. `error` carries structured error details
   * when available; `errorMessage` and `error_message` are string fallbacks for
   * camelCase and snake_case providers. Consumers should prefer `error`, then
   * `errorMessage`, then `error_message`, matching `resolveTaskError`.
   */
  error?: unknown;
  errorMessage?: TaskMessageValue;
  error_message?: TaskMessageValue;
}

export interface SubmitTaskOptions {
  body?: Record<string, unknown>;
  idempotencyKey?: string;
  headers?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export interface TaskSubscription {
  unsubscribe(): void;
}

export interface TaskHandle<TTask extends TaskRecord = TaskRecord> {
  id?: string;
  wait(): Promise<TTask>;
  subscribe?(callback: (task: TTask) => void): TaskSubscription | (() => void) | undefined;
  cancel?(): Promise<unknown>;
  retry?(): Promise<unknown>;
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
  cancel?(taskId: string): Promise<unknown>;
  retry?(taskId: string): Promise<unknown>;
  subscribe?(taskId: string, callback: (task: TTask) => void): TaskSubscription | (() => void) | undefined;
}

// ─── AuthProvider ─────────────────────────────────────────────

export interface Identity {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  [key: string]: unknown;
}

export interface AuthActionResult {
  success: boolean;
  redirectTo?: string;
  error?: { message: string; name?: string };
}

export interface CheckResult {
  authenticated: boolean;
  redirectTo?: string;
  error?: { message: string; name?: string };
  logout?: boolean;
}

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
  onError?: (error: unknown) => Promise<{ redirectTo?: string; logout?: boolean }>;
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

/** 声明资源使用的传输协议；具体 URL/序列化行为由对应 provider 实现。 */
export interface ResourceTransportConfig {
  readonly type: string;
  readonly endpoint?: string;
  readonly options?: Readonly<Record<string, unknown>>;
}

/** 声明资源使用的后端 adapter，不在 Core 内绑定具体运行时实现。 */
export interface ResourceAdapterConfig {
  readonly name: string;
  readonly version?: string;
  readonly options?: Readonly<Record<string, unknown>>;
}

/** 每资源的 provider 选择与声明性 transport/adapter 元数据。 */
export interface ResourceProviderConfig {
  readonly dataProviderName?: string;
  readonly transport?: string | ResourceTransportConfig;
  readonly adapter?: string | ResourceAdapterConfig;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export interface ResourceDefinition {
  name: string;
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
  /** DataProvider 选择及声明性 transport/adapter 元数据。 */
  provider?: ResourceProviderConfig;
  /** @deprecated 新代码优先使用 `provider.dataProviderName` 选择 DataProvider。 */
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
  type: 'text' | 'number' | 'boolean' | 'date' | 'daterange' | 'select' | 'multiselect' | 'tags'
    | 'textarea' | 'richtext' | 'image' | 'images' | 'json' | 'relation' | 'color'
    | 'url' | 'email' | 'phone' | 'currency' | 'percent' | 'rating' | 'code' | 'avatar' | 'copy' | 'file' | 'markdown' | 'password' | 'array';
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
  options?: { label: string; value: string | number }[];
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
 * When registered, all hooks automatically infer data types from resource names.
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
 * // list.data → { id: string; name: string; email: string }[]
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ResourceTypeMap {}

/** When ResourceTypeMap is empty → string; otherwise → registered keys */
export type KnownResources = keyof ResourceTypeMap extends never
  ? string
  : Extract<keyof ResourceTypeMap, string>

/** Infer data type from resource name. Falls back to Record<string, unknown> for unregistered resources */
export type InferData<R extends string> = R extends keyof ResourceTypeMap
  ? ResourceTypeMap[R]
  : Record<string, unknown>
