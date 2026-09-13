import { useQueryClient } from '@tanstack/svelte-query';
import { captureAdminContext } from './context.svelte';
import { captureQueryProvider } from './query-snapshot';
import { contractKey, requireContractCreateSchema, parseContractCreateInput, parseContractRecord, parseContractId,
  type ResourceContract, type ContractSchemas, type ContractCreateInput, type ContractRecord } from './resource-contract';
import { decodeBaseRecord } from './record-decoder';
import { snapshotPlainData } from './plain-data';
import { createInputId } from './create-contract';
import { definedOptions } from './defined-options';
import { invalidateOwnedQueries } from './query-invalidation';
import { captureAuthLiveScope, clearAuthQueries, handleAuthError } from './auth-hooks.svelte';
import { HttpError } from './types';
import { decodeImportReceipt, invalidImportInput, parseImportRows, snapshotImportFile,
  newImportProgress, snapshotImportProgress, type ImportOperationProgress, type ImportFormat } from './import-contract';

export type ImportProgress = Pick<ImportOperationProgress, 'totalAmount' | 'processedAmount'>;
export interface ImportResult<S extends ContractSchemas> {
  succeeded: ContractRecord<S>[];
  errored: { row: number; request: ContractCreateInput<S>; error: HttpError }[];
}
export interface UseImportOptions<S extends ContractSchemas> {
  resource: ResourceContract<S> & ([ContractCreateInput<NoInfer<S>>] extends [never] ? never : unknown);
  format?: ImportFormat;
  mapData?: (item: Record<string, unknown>) => NoInfer<ContractCreateInput<S>>;
  batchSize?: number;
  enabled?: boolean;
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  onFinish?: (result: ImportResult<NoInfer<S>>) => void | Promise<void>;
  onProgress?: (info: ImportProgress) => void | Promise<void>;
}

function cancelled(progress: ImportOperationProgress = newImportProgress()): HttpError {
  const checked = snapshotImportProgress(progress);
  return new HttpError('Import scope changed', 409, undefined, {
    code: 'IMPORT_CANCELLED', details: { writeMayHaveSucceeded: checked.attemptedAmount > 0, ...checked },
  });
}
function importFailure(cause: unknown, dispatched = false): HttpError {
  let code: unknown;
  let status: unknown;
  try {
    if (typeof cause === 'object' && cause !== null) {
      code = Object.getOwnPropertyDescriptor(cause, 'code')?.value;
      status = Object.getOwnPropertyDescriptor(cause, 'statusCode')?.value;
    }
  } catch {
    // Error objects are untrusted diagnostic sources.
  }
  const input = code === 'INVALID_RESOURCE_INPUT' && !dispatched;
  const contract = code === 'INVALID_RESOURCE_CONTRACT' && !dispatched;
  const response = code === 'INVALID_PROVIDER_RESPONSE';
  return new HttpError(input ? 'Invalid import input' : contract ? 'A create schema is required'
    : response ? 'Invalid provider response' : 'Import failed', input ? 422 : contract ? 400 : response ? 502
      : status === 401 || status === 403 ? status : 500, undefined, {
    code: input ? 'INVALID_RESOURCE_INPUT' : contract ? 'INVALID_RESOURCE_CONTRACT'
      : response ? 'INVALID_PROVIDER_RESPONSE' : 'IMPORT_FAILED',
    details: { phase: dispatched ? response ? 'response' : 'request' : 'input', writeMayHaveSucceeded: dispatched },
  });
}
function copyFailure(error: HttpError): HttpError {
  return new HttpError(error.message, error.statusCode, undefined, {
    ...definedOptions({ code: error.code }), details: snapshotPlainData(error.details ?? {}),
  });
}
function notify<T>(callback: ((value: T) => void | Promise<void>) | undefined, value: T): void {
  try { void Promise.resolve(callback?.(value)).catch(() => {}); }
  catch { /* Observers cannot turn completed writes into a second import attempt. */ }
}

/** A whole-file preflight precedes writes; each provider receipt remains untrusted until checked. */
export function useImport<S extends ContractSchemas>(options: UseImportOptions<S>) {
  const context = captureAdminContext();
  const client = useQueryClient();
  contractKey(options.resource);
  let isLoading = $state(false);
  let mutationResult = $state.raw<ImportResult<S> | null>(null);
  let progress = $state.raw<ImportProgress>({ totalAmount: 0, processedAmount: 0 });
  let error = $state.raw<HttpError | null>(null);
  let mounted = true;

  function captureOrigin() {
    const authProvider = context.authProvider;
    return { contract: options.resource, authProvider, authScope: captureAuthLiveScope(authProvider),
      router: context.routerProvider, tenant: context.tenantCacheKey?.__svadminTenant };
  }
  type Origin = ReturnType<typeof captureOrigin>;
  function targetOriginCurrent(origin: Origin): boolean {
    return mounted && options.enabled !== false && origin.contract === options.resource &&
      origin.authProvider === context.authProvider && origin.router === context.routerProvider &&
      origin.tenant === context.tenantCacheKey?.__svadminTenant;
  }
  function originCurrent(origin: Origin): boolean {
    return targetOriginCurrent(origin) && origin.authScope.isCurrent();
  }
  function captureScope() {
    const origin = captureOrigin();
    const contract = origin.contract;
    const captured = captureQueryProvider(context, {
      resource: contract.name, ...definedOptions({ dataProviderName: options.dataProviderName, meta: options.meta }),
    });
    const name = context.resolveDataProviderName(contract.name, options.dataProviderName);
    const raw = context.providers?.[name];
    if (!raw) throw new HttpError('Data provider is unavailable', 400, undefined, { code: 'DATA_PROVIDER_REQUIRED' });
    return {
      ...origin, source: captured.source, meta: captured.meta,
      create: raw.create.bind(raw), createMany: raw.createMany?.bind(raw),
      matcher: { ...context.queryKeyMatcher(contract.name, options.dataProviderName), contract: contractKey(contract) },
      key: JSON.stringify([contractKey(contract), name, captured.source, context.tenantCacheKey?.__svadminTenant, captured.meta]),
    };
  }
  type Scope = ReturnType<typeof captureScope>;
  let current: { token: object; scope: Scope; file: File; promise: Promise<ImportResult<S>>; progress: ImportOperationProgress } | undefined;
  let latest = $state.raw<{ token: object; origin: Origin; scope: Scope | undefined }>();
  let latestToken: object | undefined;
  function targetCurrent(scope: Scope): boolean {
    if (!targetOriginCurrent(scope)) return false;
    try { return captureScope().key === scope.key; }
    catch { return false; }
  }
  function sessionCurrent(scope: Scope): boolean {
    return context.authProvider === scope.authProvider && scope.authScope.isCurrent();
  }
  function isCurrent(token: object, scope: Scope): boolean {
    return latestToken === token && targetCurrent(scope) && sessionCurrent(scope);
  }
  function viewCurrent(): boolean {
    return latest !== undefined && latestToken === latest.token && originCurrent(latest.origin) &&
      (latest.scope === undefined || targetCurrent(latest.scope));
  }
  function clearState() {
    current = undefined;
    latest = undefined;
    isLoading = false;
    mutationResult = null;
    error = null;
    progress = { totalAmount: 0, processedAmount: 0 };
  }
  function reset() {
    latestToken = undefined;
    clearState();
  }
  $effect.pre(() => {
    if (latest && !viewCurrent()) {
      // Auth retirement alone must not cancel the delegate completing its own logout.
      if (!targetOriginCurrent(latest.origin) || (latest.scope && !targetCurrent(latest.scope))) latestToken = undefined;
      clearState();
    }
  });
  $effect(() => () => { mounted = false; reset(); });

  async function refresh(scope: Scope) {
    try {
      await invalidateOwnedQueries({
        client, matcher: { ...scope.matcher, resource: scope.contract.name },
        owner: { source: scope.source, authSession: scope.authScope.cacheKey },
        scopes: ['list', 'many'], current: () => sessionCurrent(scope),
      });
    } catch { /* Cache failures cannot change completed write receipts into failures. */ }
  }
  function copyResult(scope: Scope, result: ImportResult<S>): ImportResult<S> {
    return {
      succeeded: result.succeeded.map(row => parseContractRecord(scope.contract, row)),
      errored: result.errored.map(item => ({
        row: item.row, request: parseContractCreateInput(scope.contract, item.request),
        error: copyFailure(item.error),
      })),
    };
  }
  function detached(operation: NonNullable<typeof current>): Promise<ImportResult<S>> {
    return operation.promise.then(result => {
      if (!isCurrent(operation.token, operation.scope)) throw cancelled(operation.progress);
      return copyResult(operation.scope, result);
    }, (cause: unknown) => {
      if (!isCurrent(operation.token, operation.scope)) throw cancelled(operation.progress);
      throw cause instanceof HttpError ? copyFailure(cause) : importFailure(cause, operation.progress.attemptedAmount > 0);
    });
  }

  function handleChange(info: { file: File }): Promise<ImportResult<S>> {
    if (!mounted) return Promise.reject(cancelled());
    const origin = captureOrigin();
    const token = {};
    if (!originCurrent(origin)) {
      latestToken = token;
      return Promise.reject(cancelled());
    }
    let captured: Scope | undefined;
    try {
      const file = snapshotImportFile(info);
      const scope = captureScope();
      captured = scope;
      if (!originCurrent(origin)) return Promise.reject(cancelled());
      if (current && isCurrent(current.token, current.scope)) {
        if (current.file === file.file) return detached(current);
        return Promise.reject(new HttpError('Import is already running', 409, undefined, { code: 'IMPORT_BUSY' }));
      }
      requireContractCreateSchema(scope.contract);
      const batchSize = options.batchSize ?? 1;
      const format = options.format ?? 'auto';
      const mapData = options.mapData;
      const onFinish = options.onFinish;
      const onProgress = options.onProgress;
      if (!Number.isSafeInteger(batchSize) || batchSize < 1 || !['auto', 'csv', 'json'].includes(format) ||
          (options.enabled !== undefined && typeof options.enabled !== 'boolean') ||
          [mapData, onFinish, onProgress].some(callback => callback !== undefined && typeof callback !== 'function')) invalidImportInput();
      if (!originCurrent(origin)) return Promise.reject(cancelled());
      latestToken = token;
      latest = Object.freeze({ token, origin, scope });
      const tracked = newImportProgress();
      const ensureActive = () => { if (!isCurrent(token, scope) || current?.token !== token) throw cancelled(tracked); };
      isLoading = true;
      error = null;
      mutationResult = null;
      progress = { totalAmount: 0, processedAmount: 0 };
      const promise = Promise.resolve().then(async () => {
        const result: ImportResult<S> = { succeeded: [], errored: [] };
        try {
          ensureActive();
          const text = await file.read();
          ensureActive();
          const records = parseImportRows(text, file.name, format).map((row, index) => {
            ensureActive();
            try {
              const input = mapData ? mapData(decodeBaseRecord(snapshotPlainData(row))) : row;
              ensureActive();
              const checked = parseContractCreateInput(scope.contract, input);
              createInputId(scope.contract, checked);
              return checked;
            } catch { return invalidImportInput(index + 1); }
          });
          ensureActive();
          const seen = new Set<string | number>();
          tracked.totalAmount = records.length;
          progress = { totalAmount: records.length, processedAmount: 0 };
          for (let start = 0; start < records.length; start += scope.createMany ? batchSize : 1) {
            ensureActive();
            const batch = records.slice(start, start + (scope.createMany ? batchSize : 1));
            try {
              const request = { resource: scope.contract.name, ...definedOptions({
                meta: scope.meta === undefined ? undefined : decodeBaseRecord(snapshotPlainData(scope.meta)),
              }) };
              tracked.attemptedAmount += batch.length;
              const response = batchSize > 1 && scope.createMany
                ? await scope.createMany({ ...request, variables: batch.map(row => snapshotPlainData(row)) })
                : await scope.create({ ...request, variables: snapshotPlainData(batch[0]) });
              if (!sessionCurrent(scope)) throw cancelled(tracked);
              const rows = decodeImportReceipt(scope.contract, response, batch, batchSize > 1 && !!scope.createMany, seen);
              for (const row of rows) seen.add(parseContractId(scope.contract, row.id));
              result.succeeded.push(...rows);
            } catch (cause) {
              if (!sessionCurrent(scope)) throw cancelled(tracked);
              const failure = importFailure(cause, true);
              for (const [index, request] of batch.entries()) result.errored.push({ row: start + index + 1, request, error: failure });
            }
            tracked.processedAmount += batch.length;
            ensureActive();
            progress = { totalAmount: tracked.totalAmount, processedAmount: tracked.processedAmount };
            notify(onProgress, { ...progress });
            ensureActive();
          }
        } catch (cause) {
          if (!isCurrent(token, scope) || current?.token !== token) throw cancelled(tracked);
          const failure = importFailure(cause, tracked.attemptedAmount > 0);
          error = failure;
          throw failure;
        } finally {
          if (tracked.attemptedAmount > 0 && sessionCurrent(scope)) await refresh(scope);
        }
        ensureActive();
        mutationResult = copyResult(scope, result);
        error = result.errored[0] ? copyFailure(result.errored[0].error) : null;
        const authError = result.errored.find(item => item.error.statusCode === 401 || item.error.statusCode === 403)?.error ?? error;
        if (authError) notify(async () => {
          await handleAuthError(copyFailure(authError), context, () => targetCurrent(scope) && latestToken === token,
            () => clearAuthQueries(client, scope.authProvider), scope.authScope,
            () => mounted && latestToken !== token);
        }, undefined);
        if (isCurrent(token, scope)) notify(onFinish, copyResult(scope, result));
        ensureActive();
        return copyResult(scope, result);
      }).finally(() => {
        if (current?.token === token) { current = undefined; isLoading = false; }
      });
      current = { token, scope, file: file.file, promise, progress: tracked };
      return detached(current);
    } catch (cause) {
      const failure = importFailure(cause);
      if (current && isCurrent(current.token, current.scope)) return Promise.reject(copyFailure(failure));
      latestToken = token;
      latest = Object.freeze({ token, origin, scope: captured });
      error = failure;
      mutationResult = null;
      isLoading = false;
      progress = { totalAmount: 0, processedAmount: 0 };
      return Promise.resolve().then(() => {
        if (!originCurrent(origin) || latestToken !== token) throw cancelled();
        throw copyFailure(failure);
      });
    }
  }
  return {
    inputProps: { type: 'file' as const, accept: '.csv,.json' },
    handleChange, reset,
    get isLoading() { return viewCurrent() && isLoading; },
    get mutationResult() { return viewCurrent() && latest?.scope && mutationResult ? copyResult(latest.scope, mutationResult) : null; },
    get progress(): Readonly<ImportProgress> { return viewCurrent() ? { ...progress } : { totalAmount: 0, processedAmount: 0 }; },
    get error() { return viewCurrent() && error ? copyFailure(error) : null; },
  };
}
