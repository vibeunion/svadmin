import { captureAdminContext } from './context.svelte';
import { definedOptions, definedReactiveOptions } from './defined-options';
import { HttpError, type TaskProvider, type TaskRecord } from './types';
import { untrack } from 'svelte';
import { captureAuthLiveScope } from './auth-hooks.svelte';
import { contractKey, parseContractRecord, type ResourceContract, type ContractSchemas, type ContractRecord } from './resource-contract';
import type { ContractFilter, ContractSort } from './strict-hooks.svelte';
import { captureQueryProvider, snapshotListParams } from './query-snapshot';
import { decodeBaseRecord, decodeListResult } from './record-decoder';
import { snapshotPlainData } from './plain-data';
import { downloadData, downloadExportArtifact, snapshotExportTaskResult, safeArtifactUrl, type ExportFormat } from './export-format';
import { useSubmitTask, useTask } from './task-hooks.svelte';

export interface UseExportOptions<S extends ContractSchemas> {
  resource: ResourceContract<S>;
  mapData?: (item: NoInfer<ContractRecord<S>>) => Record<string, unknown>;
  sorters?: ContractSort<NoInfer<ContractRecord<S>>>[];
  filters?: ContractFilter<NoInfer<ContractRecord<S>>>[];
  maxItemCount?: number;
  pageSize?: number;
  download?: boolean;
  format?: ExportFormat;
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  enabled?: boolean;
  taskName?: string;
  taskProvider?: TaskProvider;
  taskIdempotencyKey?: string;
  initialTaskId?: string;
  onTaskSubmitted?: (taskId: string) => void | Promise<void>;
  onError?: (error: HttpError) => void | Promise<void>;
}

function cancelled(): HttpError {
  return new HttpError('Export scope changed', 409, undefined, { code: 'EXPORT_CANCELLED' });
}

function invalidInput(): never {
  throw new HttpError('Invalid export input', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
}

function exportFailure(cause: unknown): HttpError {
  let code: unknown;
  try {
    if (typeof cause === 'object' && cause !== null) code = Object.getOwnPropertyDescriptor(cause, 'code')?.value;
  } catch {
    // Revoked proxies and accessor-backed errors are not trusted diagnostic sources.
  }
  if (code === 'INVALID_RESOURCE_INPUT') {
    return new HttpError('Invalid export input', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
  }
  if (code === 'INVALID_PROVIDER_RESPONSE') {
    return new HttpError('Invalid provider response', 502, undefined, { code: 'INVALID_PROVIDER_RESPONSE' });
  }
  return new HttpError('Export failed', 500, undefined, { code: 'EXPORT_FAILED' });
}

/** Export only records proven by the bound business schema, within one captured scope. */
export function useExport<S extends ContractSchemas>(options: UseExportOptions<S>) {
  const context = captureAdminContext();
  contractKey(options.resource);
  let isLoading = $state(false);
  let error = $state<HttpError | null>(null);
  let mounted = true;
  let taskId = $state<string | undefined>(untrack(() => options.initialTaskId));
  let taskHandledId = $state<string | undefined>();
  const submitTask = useSubmitTask();
  const taskMode = $derived(options.taskName !== undefined);

  function captureScope() {
    const contract = options.resource;
    const key = contractKey(contract);
    const captured = captureQueryProvider(context, {
      resource: contract.name, contract,
      ...definedOptions({ dataProviderName: options.dataProviderName, meta: options.meta }),
    });
    return {
      contract, ...captured,
      authProvider: context.authProvider, auth: captureAuthLiveScope(context.authProvider),
      router: context.routerProvider, access: context.accessControlProvider,
      taskProvider: options.taskProvider ?? context.taskProvider,
      taskName: options.taskName, idempotencyKey: options.taskIdempotencyKey, format: options.format ?? 'csv',
      taskQueryKey: options.taskName === undefined ? undefined : JSON.stringify(snapshotPlainData({
        filters: options.filters ?? [], sorters: options.sorters ?? [],
        maxItemCount: options.maxItemCount ?? null,
      })),
      key: JSON.stringify([key, captured.source, context.tenantCacheKey?.__svadminTenant, captured.meta]),
    };
  }
  type Scope = ReturnType<typeof captureScope>;
  let taskOrigin = $state.raw<Scope | undefined>(
    untrack(() => {
      try { return taskId && taskMode ? captureScope() : undefined; }
      catch { return undefined; }
    }),
  );
  let taskPolling = $state(true);
  let current: { token: object; scope: Scope; promise: Promise<ContractRecord<S>[]> } | undefined;
  const taskProvider = $derived(options.taskProvider ?? context.taskProvider);
  const ownedTaskId = $derived(taskOrigin && scopeCurrent(taskOrigin) ? taskId : undefined);
  const taskQuery = useTask(definedReactiveOptions({
    get taskId() { return ownedTaskId; },
    get taskProvider() { return taskProvider; },
    get queryOptions() {
      return { enabled: taskMode && !!ownedTaskId && !!taskProvider,
        refetchInterval: ownedTaskId && taskPolling ? 2000 : false as const };
    },
  }));

  function scopeCurrent(scope: Scope, requireEnabled = true): boolean {
    if (!mounted || (requireEnabled && options.enabled === false) || !scope.auth.isCurrent()) return false;
    try {
      const next = captureScope();
      return next.key === scope.key && next.authProvider === scope.authProvider &&
        next.router === scope.router && next.access === scope.access &&
        next.taskName === scope.taskName &&
        (scope.taskName === undefined || (next.taskProvider === scope.taskProvider &&
          next.taskName === scope.taskName && next.idempotencyKey === scope.idempotencyKey &&
          next.format === scope.format && next.taskQueryKey === scope.taskQueryKey));
    } catch { return false; }
  }

  function isActive(token: object, scope: Scope): boolean {
    return current?.token === token && scopeCurrent(scope);
  }

  let initialized = false;
  let previousScope: string | undefined;
  $effect(() => {
    let nextScope: string | undefined;
    try { nextScope = captureScope().key; }
    catch { nextScope = undefined; }
    if (initialized && previousScope !== nextScope) {
      current = undefined;
      isLoading = false;
      error = null;
    }
    previousScope = nextScope;
    initialized = true;
  });
  let wasEnabled = untrack(() => options.enabled !== false);
  $effect.pre(() => {
    const enabled = options.enabled !== false;
    const revoked = wasEnabled && !enabled;
    wasEnabled = enabled;
    if (current && !scopeCurrent(current.scope)) {
      current = undefined;
      isLoading = false;
      error = null;
    }
    if (taskOrigin && (revoked || !scopeCurrent(taskOrigin, false))) {
      taskOrigin = undefined;
      taskId = undefined;
      taskHandledId = undefined;
      error = null;
    }
  });
  $effect(() => () => {
    mounted = false;
    current = undefined;
  });

  function report(failure: HttpError, handler: UseExportOptions<S>['onError']): void {
    error = failure;
    try {
      void Promise.resolve(handler?.(failure)).catch(() => {
        // Async notification failures must not become unhandled rejections.
      });
    }
    catch {
      // Consumer callback failures must not replace the sanitized export failure.
    }
  }

  function taskStatus(value: TaskRecord | undefined): 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'unknown' {
    const status = String(value?.status ?? '').trim().toLowerCase();
    if (['pending', 'queued', 'scheduled', 'retry_scheduled'].includes(status)) return 'queued';
    if (['running', 'processing', 'active', 'leased'].includes(status)) return 'processing';
    if (['completed', 'complete', 'success', 'succeeded', 'done'].includes(status)) return 'completed';
    if (['failed', 'error', 'dead_lettered'].includes(status)) return 'failed';
    if (['cancelled', 'canceled', 'aborted'].includes(status)) return 'cancelled';
    return 'unknown';
  }

  const artifact = $derived.by(() => {
    const task = taskQuery.data;
    if (!ownedTaskId || !task || taskStatus(task) !== 'completed') return undefined;
    const result = snapshotExportTaskResult(task.result ?? task.result_data);
    return result && result.format === taskOrigin?.format && safeArtifactUrl(result.downloadUrl) ? result : undefined;
  });

  $effect(() => {
    const task = taskQuery.data;
    if (!taskMode || !task || !ownedTaskId || taskHandledId === ownedTaskId) return;
    const status = taskStatus(task);
    if (status === 'queued' || status === 'processing' || status === 'unknown') return;
    taskHandledId = ownedTaskId;
    taskPolling = false;
    if (status === 'completed' && !artifact) report(new HttpError(
      'Invalid export task result', 502, undefined, { code: 'INVALID_PROVIDER_RESPONSE' }), options.onError);
    else if (status === 'failed') report(exportFailure(undefined), options.onError);
  });

  function downloadTask(): boolean {
    if (!artifact || !taskOrigin || !scopeCurrent(taskOrigin)) return false;
    try {
      downloadExportArtifact(artifact, taskOrigin.contract.name);
      return true;
    } catch {
      report(new HttpError('Invalid export artifact', 502, undefined, { code: 'INVALID_PROVIDER_RESPONSE' }), options.onError);
      return false;
    }
  }

  function triggerExport(): Promise<ContractRecord<S>[]> {
    if (!mounted) return Promise.reject(cancelled());
    let onError: UseExportOptions<S>['onError'];
    try {
      const scope = captureScope();
      if (!scopeCurrent(scope)) return Promise.reject(cancelled());
      if (current && scopeCurrent(current.scope)) return current.promise;
      if (scope.taskName !== undefined && ownedTaskId) return Promise.resolve([]);
      previousScope = scope.key;
      initialized = true;
      const batchSize = options.pageSize ?? 20;
      const maxItems = options.maxItemCount ?? Infinity;
      const format = options.format ?? 'csv';
      const download = options.download ?? true;
      const mapData = options.mapData;
      const taskName = scope.taskName;
      const taskSource = scope.taskProvider;
      const idempotencyKey = scope.idempotencyKey;
      const onTaskSubmitted = options.onTaskSubmitted;
      onError = options.onError;
      if (!Number.isSafeInteger(batchSize) || batchSize <= 0 ||
          (maxItems !== Infinity && (!Number.isSafeInteger(maxItems) || maxItems < 0)) ||
          !['csv', 'json', 'xlsx'].includes(format) || typeof download !== 'boolean' ||
          (mapData !== undefined && typeof mapData !== 'function') ||
          (onError !== undefined && typeof onError !== 'function')) invalidInput();
      const handler = onError;
      const params = snapshotListParams({
        resource: scope.contract.name,
        ...definedOptions({
          pagination: { current: 1, pageSize: batchSize },
          filters: options.filters, sorters: options.sorters, meta: scope.meta,
        }),
      });
      const token = {};
      const ensureActive = () => { if (!isActive(token, scope)) throw cancelled(); };
      isLoading = true;
      error = null;
      // Install the invocation before transport code or user callbacks can re-enter it.
      const promise = Promise.resolve().then(async () => {
        try {
          ensureActive();
          if (taskName !== undefined) {
            if (!taskName.trim() || !taskSource || !idempotencyKey?.trim() || mapData !== undefined) invalidInput();
            const task = await submitTask.mutation.mutateAsync({
              taskName: taskName.trim(),
              taskProvider: taskSource,
              successNotification: false,
              errorNotification: false,
              options: {
                idempotencyKey,
                body: {
                  protocolVersion: 1,
                  resource: scope.contract.name,
                  format,
                  filters: params.filters ?? [],
                  sorters: params.sorters ?? [],
                  ...definedOptions(maxItems === Infinity ? {} : { maxItemCount: maxItems }),
                },
                ...definedOptions(scope.meta === undefined ? {} : { meta: scope.meta }),
              },
            });
            ensureActive();
            taskId = task.id;
            taskOrigin = scope;
            taskHandledId = undefined;
            taskPolling = true;
            try { void Promise.resolve(onTaskSubmitted?.(task.id)).catch(() => {}); } catch { /* Observer failures do not re-submit. */ }
            return [];
          }
          const records: ContractRecord<S>[] = [];
          let page = 1;
          while (records.length < maxItems) {
            const response = await scope.provider.getList(snapshotListParams({
              ...params, pagination: { current: page, pageSize: batchSize },
            }));
            ensureActive();
            const result = decodeListResult(response, value => parseContractRecord(scope.contract, value));
            records.push(...result.data.slice(0, maxItems - records.length));
            if (result.data.length < batchSize || records.length >= result.total) break;
            page++;
          }
          ensureActive();
          const mapped = mapData ? records.map(record => {
            ensureActive();
            // Mapping receives its own checked copy, never the records returned to the caller.
            return decodeBaseRecord(snapshotPlainData(mapData(parseContractRecord(scope.contract, record))));
          }) : records;
          ensureActive();
          if (download && mapped.length > 0) downloadData(mapped, scope.contract.name, format);
          return records;
        } catch (cause) {
          if (!isActive(token, scope)) throw cancelled();
          const failure = exportFailure(cause);
          current = undefined;
          isLoading = false;
          report(failure, handler);
          throw failure;
        } finally {
          if (current?.token === token) {
            current = undefined;
            isLoading = false;
          }
        }
      });
      current = { token, scope, promise };
      return promise;
    } catch (cause) {
      current = undefined;
      isLoading = false;
      const failure = exportFailure(cause);
      report(failure, typeof onError === 'function' ? onError : undefined);
      return Promise.reject(failure);
    }
  }

  return {
    triggerExport,
    get isLoading() { return isLoading; },
    get error() { return error; },
    get taskId() { return ownedTaskId; },
    get task() { return ownedTaskId ? taskQuery.data : undefined; },
    get artifact() { return artifact; },
    get taskError() { return ownedTaskId ? taskQuery.error : null; },
    get isTaskPending() {
      return !!ownedTaskId && !['completed', 'failed', 'cancelled'].includes(taskStatus(taskQuery.data));
    },
    get refetchTask() {
      const origin = taskOrigin;
      const id = ownedTaskId;
      const refetch = taskQuery.refetch;
      return () => {
        if (!origin || !id || id !== ownedTaskId || !scopeCurrent(origin)) return Promise.reject(cancelled());
        return refetch();
      };
    },
    downloadTask,
  };
}
