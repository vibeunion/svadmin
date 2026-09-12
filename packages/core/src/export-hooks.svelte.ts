import { captureAdminContext } from './context.svelte';
import { definedOptions } from './defined-options';
import { HttpError } from './types';
import { contractKey, parseContractRecord, type ResourceContract, type ContractSchemas, type ContractRecord } from './resource-contract';
import type { ContractFilter, ContractSort } from './strict-hooks.svelte';
import { captureQueryProvider, snapshotListParams } from './query-snapshot';
import { decodeBaseRecord, decodeListResult } from './record-decoder';
import { snapshotPlainData } from './plain-data';
import { downloadData, type ExportFormat } from './export-format';

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

  function captureScope() {
    const contract = options.resource;
    const key = contractKey(contract);
    const captured = captureQueryProvider(context, {
      resource: contract.name, contract,
      ...definedOptions({ dataProviderName: options.dataProviderName, meta: options.meta }),
    });
    return {
      contract, ...captured,
      key: JSON.stringify([key, captured.source, context.tenantCacheKey?.__svadminTenant, captured.meta]),
    };
  }
  type Scope = ReturnType<typeof captureScope>;
  let current: { token: object; scope: Scope; promise: Promise<ContractRecord<S>[]> } | undefined;

  function isActive(token: object, scope: Scope): boolean {
    if (!mounted || current?.token !== token) return false;
    try { return captureScope().key === scope.key; }
    catch { return false; }
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

  function triggerExport(): Promise<ContractRecord<S>[]> {
    if (!mounted) return Promise.reject(cancelled());
    let onError: UseExportOptions<S>['onError'];
    try {
      const scope = captureScope();
      if (current?.scope.key === scope.key) return current.promise;
      previousScope = scope.key;
      initialized = true;
      const batchSize = options.pageSize ?? 20;
      const maxItems = options.maxItemCount ?? Infinity;
      const format = options.format ?? 'csv';
      const download = options.download ?? true;
      const mapData = options.mapData;
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

  return { triggerExport, get isLoading() { return isLoading; }, get error() { return error; } };
}
