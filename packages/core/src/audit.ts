// Audit logging — record admin operations
// Full AuditLogProvider interface

export interface AuditEntry {
  id?: string | number;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  resource?: string;
  recordId?: string | number;
  userId?: string;
  details?: Record<string, unknown>;
  data?: Record<string, unknown>;
  previousData?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  outcome?: 'success' | 'failure';
  tenantId?: string | number;
  requestId?: string;
  traceId?: string;
  ipAddress?: string;
  userAgent?: string;
  error?: { message: string; code?: string };
}

export type AuditHandler = (entry: AuditEntry) => void | Promise<void>;

/**
 * Full AuditLogProvider interface.
 * - create: log a new entry
 * - get: retrieve entries for a resource
 * - update: update an existing entry (e.g. mark as reviewed)
 */
export interface AuditLogProvider {
  create: (params: {
    resource: string;
    action: string;
    timestamp?: string;
    recordId?: string | number;
    userId?: string;
    outcome?: AuditEntry['outcome'];
    data?: Record<string, unknown>;
    previousData?: Record<string, unknown>;
    meta?: Record<string, unknown>;
  }) => Promise<AuditEntry>;
  get: (params: { resource: string; action?: string; meta?: Record<string, unknown>; author?: Record<string, unknown> }) => Promise<AuditEntry[]>;
  /** @deprecated 合规审计应保持追加写入；仅为旧实现兼容保留。 */
  update?: (params: { id: string | number; name: string; meta?: Record<string, unknown> }) => Promise<AuditEntry>;
}

let handler: AuditHandler = (entry) => {
  console.info('[audit]', entry.action, entry.resource, entry.recordId);
};

let auditLogProvider: AuditLogProvider | null = null;

export function setAuditHandler(fn: AuditHandler): void {
  handler = fn;
}

export function setAuditLogProvider(provider: AuditLogProvider): void {
  auditLogProvider = provider;
}

export function getAuditLogProvider(): AuditLogProvider | null {
  return auditLogProvider;
}

export function resetAuditLogProvider(): void {
  auditLogProvider = null;
  handler = (entry) => { console.info('[audit]', entry.action, entry.resource, entry.recordId); };
}

/** Record an entry through an explicitly scoped provider and the compatibility handler. */
export function auditWithProvider(
  entry: Omit<AuditEntry, 'timestamp'>,
  provider: AuditLogProvider | null | undefined,
): void {
  const fullEntry: AuditEntry = { ...entry, timestamp: new Date().toISOString() };
  try {
    const result = handler(fullEntry);
    if (result && typeof result === 'object' && 'then' in result) {
      (result as Promise<void>).catch(e => console.error('[audit] handler error:', e));
    }
  } catch (e) {
    console.error('[audit] handler error:', e);
  }
  if (provider) {
    provider.create({
      resource: entry.resource ?? '',
      action: entry.action,
      timestamp: fullEntry.timestamp,
      recordId: entry.recordId,
      userId: entry.userId,
      outcome: entry.outcome,
      data: entry.data ?? entry.details,
      previousData: entry.previousData,
      meta: entry.meta,
    }).catch(e => console.error('[audit] provider create error:', e));
  }
}

export function audit(entry: Omit<AuditEntry, 'timestamp'>): void {
  auditWithProvider(entry, auditLogProvider);
}

/**
 * 严格写入审计记录。与兼容的 best-effort `audit` 不同，此函数会等待所有
 * 写入并传播失败，适合权限、凭据、策略等必须和业务结果一起验证的流程。
 */
export async function writeAuditEntry(
  entry: Omit<AuditEntry, 'timestamp'>,
  provider: AuditLogProvider | null | undefined = auditLogProvider,
): Promise<AuditEntry> {
  const fullEntry: AuditEntry = { ...entry, timestamp: new Date().toISOString() };
  if (!provider) {
    throw new Error('Strict audit logging requires an AuditLogProvider.');
  }
  await handler(fullEntry);
  return provider.create({
    resource: entry.resource ?? '',
    action: entry.action,
    timestamp: fullEntry.timestamp,
    recordId: entry.recordId,
    userId: entry.userId,
    outcome: entry.outcome,
    data: entry.data ?? entry.details,
    previousData: entry.previousData,
    meta: {
      ...(entry.meta ?? {}),
      ...(entry.outcome === undefined ? {} : { outcome: entry.outcome }),
      ...(entry.tenantId === undefined ? {} : { tenantId: entry.tenantId }),
      ...(entry.requestId === undefined ? {} : { requestId: entry.requestId }),
      ...(entry.traceId === undefined ? {} : { traceId: entry.traceId }),
      ...(entry.ipAddress === undefined ? {} : { ipAddress: entry.ipAddress }),
      ...(entry.userAgent === undefined ? {} : { userAgent: entry.userAgent }),
      ...(entry.error === undefined ? {} : { error: entry.error }),
    },
  });
}
