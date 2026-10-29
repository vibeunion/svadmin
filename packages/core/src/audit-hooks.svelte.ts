import { createQuery } from '@tanstack/svelte-query';
import { captureAdminContext } from './context.svelte';
import { captureAuthLiveScope } from './auth-hooks.svelte';
import { auditWithProvider, writeAuditEntry, type AuditDraft, type AuditEntry } from './audit';
import type { AuditQueryParams } from './audit-contract';
import { definedOptions } from './defined-options';
import { HttpError } from './types';

export interface UseLogOptions {
  /** 为 false 时不写入 provider，只调用本地 audit handler。 */
  enabled?: boolean;
}

export interface UseLogMutation {
  log: (params: AuditDraft) => Promise<void>;
  logAsync: (params: AuditDraft) => Promise<void>;
  mutate: (params: AuditDraft, options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => void;
  mutateAsync: (params: AuditDraft) => Promise<void>;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: unknown;
}

/**
 * 写一条自定义审计记录。
 *
 * 有 `auditLogProvider` 时等待 provider 回执；没有时退化为本地 handler，
 * 与框架内部 mutation 审计保持同一份输入校验。
 */
export function useLog(options: UseLogOptions = {}): UseLogMutation {
  const context = captureAdminContext();
  let pending = $state(0);
  let error = $state<unknown>(null);

  async function log(params: AuditDraft): Promise<void> {
    if (options.enabled === false) return;
    const provider = context.auditLogProvider;
    pending++;
    error = null;
    try {
      if (provider) await writeAuditEntry(params, provider);
      else auditWithProvider(params, null);
    } catch (cause) {
      error = cause;
      throw cause;
    } finally {
      pending--;
    }
  }

  return {
    log,
    logAsync: log,
    mutate(params, callbacks) {
      void log(params).then(
        () => callbacks?.onSuccess?.(),
        (cause) => callbacks?.onError?.(cause),
      );
    },
    mutateAsync: log,
    get isLoading() { return pending > 0; },
    get isError() { return error !== null; },
    get error() { return error; },
  };
}

export interface UseLogListOptions {
  resource?: string;
  action?: string;
  meta?: Record<string, unknown>;
  queryOptions?: { enabled?: boolean; staleTime?: number };
}

export interface UseLogListResult {
  readonly data: AuditEntry[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: unknown;
  refetch: () => Promise<unknown>;
}

/**
 * 读取审计记录列表。审计是追加写模型；查询结果不缓存跨租户/会话。
 */
export function useLogList(options: UseLogListOptions = {}): UseLogListResult {
  const context = captureAdminContext();
  const authScope = captureAuthLiveScope(context.authProvider);
  const tenant = context.tenantCacheKey?.__svadminTenant;
  const enabled = options.queryOptions?.enabled !== false && context.auditLogProvider !== null;

  const query = createQuery<AuditEntry[], unknown>(() => ({
    queryKey: ['svadmin-audit-log-list', {
      resource: options.resource ?? null,
      action: options.action ?? null,
      meta: options.meta ?? null,
      tenant: tenant ?? null,
      auth: authScope.cacheKey,
      provider: context.auditLogProvider !== null,
    }],
    queryFn: async () => {
      const provider = context.auditLogProvider;
      if (!provider) throw new HttpError('Audit log provider unavailable', 400, undefined, { code: 'AUDIT_PROVIDER_REQUIRED' });
      const params: AuditQueryParams = {
        ...definedOptions({ resource: options.resource, action: options.action, meta: options.meta }),
      };
      return provider.get(params);
    },
    enabled,
    staleTime: options.queryOptions?.staleTime ?? 0,
  }));

  return {
    get data() { return query.data ?? []; },
    get isLoading() { return query.isPending && enabled; },
    get isError() { return query.isError; },
    get error() { return query.error; },
    refetch: () => query.refetch(),
  };
}