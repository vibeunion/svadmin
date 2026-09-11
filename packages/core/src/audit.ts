import { definedOptions } from './defined-options';
import { Value } from '@sinclair/typebox/value';
import {
  AuditError, createAuditEntry, decodeAuditCreate, decodeAuditEntries, decodeAuditEntry, decodeAuditQuery,
  type AuditCreateParams, type AuditDraft, type AuditEntry, type AuditQueryParams,
} from './audit-contract';

export type { AuditEntry, AuditDraft, AuditCreateParams, AuditQueryParams } from './audit-contract';
export { AuditError } from './audit-contract';
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'rollback' | 'undo' | (string & {});
export type AuditHandler = (entry: AuditEntry) => void | Promise<void>;

export interface AuditLogTransport {
  create(params: AuditCreateParams): Promise<unknown>;
  get(params: AuditQueryParams): Promise<unknown>;
}

/** Audit records are append-only. Response types come from runtime validation. */
export interface AuditLogProvider {
  create(params: AuditCreateParams): Promise<AuditEntry>;
  get(params: AuditQueryParams): Promise<AuditEntry[]>;
}

export function withValidatedAuditProvider(transport: AuditLogTransport): AuditLogProvider {
  return {
    async create(params) {
      return callProvider(transport, decodeAuditCreate(params));
    },
    async get(params) {
      const input = decodeAuditQuery(params);
      let result: unknown;
      try { result = await transport.get(input); }
      catch { throw new AuditError('AUDIT_PROVIDER_FAILED'); }
      return decodeAuditEntries(result);
    },
  };
}

const defaultHandler: AuditHandler = entry => {
  console.info('[audit]', entry.action, entry.resource, entry.recordId);
};
let handler = defaultHandler;
let auditLogProvider: AuditLogProvider | null = null;

export function setAuditHandler(fn: AuditHandler): void { handler = fn; }

export function setAuditLogProvider(provider: AuditLogTransport): void {
  auditLogProvider = withValidatedAuditProvider(provider);
}

export function getAuditLogProvider(): AuditLogProvider | null { return auditLogProvider; }

export function resetAuditLogProvider(): void {
  auditLogProvider = null;
  handler = defaultHandler;
}

function providerInput(entry: AuditEntry): AuditCreateParams {
  const { id: _id, ...input } = entry;
  return decodeAuditCreate(input);
}

async function callHandler(target: AuditHandler, entry: AuditEntry): Promise<void> {
  try { await target(decodeAuditEntry(entry)); }
  catch { throw new AuditError('AUDIT_HANDLER_FAILED', true); }
}

async function callProvider(provider: AuditLogTransport, input: AuditCreateParams): Promise<AuditEntry> {
  let result: unknown;
  try { result = await provider.create(decodeAuditCreate(input)); }
  catch { throw new AuditError('AUDIT_PROVIDER_FAILED', true); }
  const receipt = decodeAuditEntry(result, 'response', true);
  for (const [key, expected] of Object.entries(input)) {
    const descriptor = Object.getOwnPropertyDescriptor(receipt, key);
    const actual: unknown = descriptor && 'value' in descriptor ? descriptor.value : undefined;
    if (!descriptor || !Value.Equal(expected, actual)) throw new AuditError('INVALID_AUDIT_RESPONSE', true);
  }
  return receipt;
}

/** Best-effort delivery still validates input and receipts and omits raw failure details. */
export function auditWithProvider(
  entry: AuditDraft, provider: AuditLogTransport | null | undefined, current: () => boolean = () => true,
): void {
  if (!current()) return;
  let snapshot: AuditEntry;
  let input: AuditCreateParams;
  try {
    snapshot = createAuditEntry(entry);
    input = providerInput(snapshot);
  } catch {
    console.error(new AuditError('INVALID_AUDIT_INPUT'));
    return;
  }
  void callHandler(handler, snapshot).catch(error => console.error(error));
  if (provider && current()) void callProvider(provider, input).catch(error => console.error(error));
}

export function audit(entry: AuditDraft): void { auditWithProvider(entry, auditLogProvider); }

/** Wait for every sink and reject malformed receipts; earlier writes may already have committed. */
export async function writeAuditEntry(
  entry: AuditDraft, provider: AuditLogTransport | null | undefined = auditLogProvider,
): Promise<AuditEntry> {
  if (!provider) throw new AuditError('AUDIT_PROVIDER_REQUIRED');
  const snapshot = createAuditEntry(entry);
  const input = providerInput(snapshot);
  await callHandler(handler, snapshot);
  return callProvider(provider, input);
}

export async function recordMutationRollback(
  params: {
    resource: string;
    recordId?: string | number;
    mutationId?: string;
    previousData?: Record<string, unknown>;
    currentData?: Record<string, unknown>;
    reason?: string;
    userId?: string;
    tenantId?: string | number;
    requestId?: string;
    traceId?: string;
  },
  provider: AuditLogTransport | null | undefined = auditLogProvider,
): Promise<AuditEntry> {
  return writeAuditEntry({
    action: 'rollback',
    resource: params.resource,
    ...definedOptions({
      recordId: params.recordId, mutationId: params.mutationId,
      userId: params.userId, tenantId: params.tenantId,
      requestId: params.requestId, traceId: params.traceId,
      previousData: params.previousData, data: params.currentData,
    }),
    outcome: 'success',
    meta: { actionType: 'mutation_rollback', ...definedOptions({ reason: params.reason }) },
  }, provider);
}
