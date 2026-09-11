import type { AuditHandler, AuditEntry } from '@svadmin/core';
import { definedOptions } from '@svadmin/core/options';
import { decodeAuditEntry, snapshotPlainData, checkExact, type JsonValue } from '@svadmin/core/schema';
import { Type } from '@sinclair/typebox';

export interface SupabaseAuditRow {
  action: AuditEntry['action'];
  resource?: string;
  record_id: string | null;
  user_id?: string;
  details: JsonValue;
  created_at: AuditEntry['timestamp'];
}

export interface SupabaseAuditClient {
  from(table: 'audit_log'): {
    insert(row: SupabaseAuditRow): PromiseLike<unknown>;
  };
}

export class SupabaseAuditError extends Error {
  constructor(readonly code: 'WRITE_REJECTED' | 'WRITE_OUTCOME_UNKNOWN') {
    super(code === 'WRITE_REJECTED' ? 'Audit write was rejected.' : 'Audit write outcome could not be confirmed.');
    this.name = 'SupabaseAuditError';
  }
}

const receiptSchema = Type.Object({
  data: Type.Null(), error: Type.Null(), count: Type.Null(),
  status: Type.Union([Type.Literal(201), Type.Literal(204)]), statusText: Type.String(),
});
const rejectedSchema = Type.Object({
  data: Type.Null(), count: Type.Null(),
  error: Type.Object({
    code: Type.String({ minLength: 1 }), message: Type.String(),
    details: Type.Union([Type.String(), Type.Null()]),
    hint: Type.Union([Type.String(), Type.Null()]),
  }),
  status: Type.Union([
    Type.Literal(400), Type.Literal(401), Type.Literal(403),
    Type.Literal(404), Type.Literal(405), Type.Literal(409),
    Type.Literal(413), Type.Literal(415), Type.Literal(422), Type.Literal(429),
  ]),
  statusText: Type.String(),
});

/** Preserve the full validated event in JSON while retaining indexed query columns. */
export function createSupabaseAuditHandler(client: SupabaseAuditClient): AuditHandler {
  return async value => {
    const entry = decodeAuditEntry(value);
    const row = {
      action: entry.action,
      ...definedOptions({ resource: entry.resource, user_id: entry.userId }),
      record_id: entry.recordId === undefined ? null : String(entry.recordId),
      details: snapshotPlainData(entry),
      created_at: entry.timestamp,
    } satisfies SupabaseAuditRow;
    let result: unknown;
    try { result = snapshotPlainData(await client.from('audit_log').insert(row)); }
    catch { throw new SupabaseAuditError('WRITE_OUTCOME_UNKNOWN'); }
    if (checkExact(receiptSchema, result)) return;
    if (checkExact(rejectedSchema, result)) throw new SupabaseAuditError('WRITE_REJECTED');
    throw new SupabaseAuditError('WRITE_OUTCOME_UNKNOWN');
  };
}
