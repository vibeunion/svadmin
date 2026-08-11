// Audit logging — record admin operations
// Full AuditLogProvider interface

export interface AuditEntry {
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  resource?: string;
  recordId?: string | number;
  userId?: string;
  details?: Record<string, unknown>;
  data?: Record<string, unknown>;
  previousData?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export type AuditHandler = (entry: AuditEntry) => void | Promise<void>;

/**
 * Full AuditLogProvider interface.
 * - create: log a new entry
 * - get: retrieve entries for a resource
 * - update: update an existing entry (e.g. mark as reviewed)
 */
export interface AuditLogProvider {
  create: (params: { resource: string; action: string; data?: Record<string, unknown>; previousData?: Record<string, unknown>; meta?: Record<string, unknown> }) => Promise<AuditEntry>;
  get: (params: { resource: string; action?: string; meta?: Record<string, unknown>; author?: Record<string, unknown> }) => Promise<AuditEntry[]>;
  update: (params: { id: string | number; name: string; meta?: Record<string, unknown> }) => Promise<AuditEntry>;
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
      data: entry.data ?? entry.details,
      previousData: entry.previousData,
      meta: entry.meta,
    }).catch(e => console.error('[audit] provider create error:', e));
  }
}

export function audit(entry: Omit<AuditEntry, 'timestamp'>): void {
  auditWithProvider(entry, auditLogProvider);
}
