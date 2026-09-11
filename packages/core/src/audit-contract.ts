import { Type, type Static, type TSchema } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';

const text = Type.String({ minLength: 1 });
const record = Type.Record(Type.String(), Type.Unknown());
const identifier = Type.Union([
  text, Type.Integer({ minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER }),
]);
const entrySchema = Type.Object({
  id: Type.Optional(identifier),
  timestamp: text,
  action: text,
  mutationId: Type.Optional(text),
  resource: Type.Optional(text),
  recordId: Type.Optional(identifier),
  userId: Type.Optional(text),
  details: Type.Optional(record),
  data: Type.Optional(record),
  previousData: Type.Optional(record),
  meta: Type.Optional(record),
  outcome: Type.Optional(Type.Union([Type.Literal('success'), Type.Literal('failure')])),
  tenantId: Type.Optional(identifier),
  requestId: Type.Optional(text),
  traceId: Type.Optional(text),
  ipAddress: Type.Optional(text),
  userAgent: Type.Optional(text),
  error: Type.Optional(Type.Object({ message: Type.String(), code: Type.Optional(text) }, { additionalProperties: false })),
}, { additionalProperties: false });
const draftSchema = Type.Omit(entrySchema, ['id', 'timestamp']);
const createSchema = Type.Omit(entrySchema, ['id']);
const querySchema = Type.Object({
  resource: Type.Optional(text), action: Type.Optional(text),
  meta: Type.Optional(record), author: Type.Optional(record),
}, { additionalProperties: false });
const entriesSchema = Type.Array(entrySchema);

export type AuditEntry = Static<typeof entrySchema>;
export type AuditDraft = Static<typeof draftSchema>;
export type AuditCreateParams = Static<typeof createSchema>;
export type AuditQueryParams = Static<typeof querySchema>;

const messages = {
  INVALID_AUDIT_INPUT: 'Invalid audit input.',
  INVALID_AUDIT_RESPONSE: 'Invalid audit response.',
  AUDIT_HANDLER_FAILED: 'Audit handler write could not be confirmed.',
  AUDIT_PROVIDER_FAILED: 'Audit provider request failed.',
  AUDIT_PROVIDER_REQUIRED: 'Strict audit logging requires an AuditLogProvider.',
} as const;

export class AuditError extends Error {
  constructor(readonly code: keyof typeof messages, readonly writeMayHaveSucceeded = false) {
    super(messages[code]);
    this.name = 'AuditError';
  }
}

function decode<S extends TSchema>(
  schema: S, value: unknown, phase: 'input' | 'response', write = false,
): Static<S> {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(schema, candidate)) return candidate;
  } catch {
    // Never retain the submitted record or a reflection exception.
  }
  throw new AuditError(phase === 'input' ? 'INVALID_AUDIT_INPUT' : 'INVALID_AUDIT_RESPONSE', write);
}

/** Audit timestamps are UTC ISO strings, with seconds or exactly three fractional digits. */
function validateTimestamp(value: string, phase: 'input' | 'response', write: boolean): void {
  const date = new Date(value);
  if (Number.isFinite(date.getTime())) {
    const iso = date.toISOString();
    if (iso === value || (iso.endsWith('.000Z') && iso.replace('.000Z', 'Z') === value)) return;
  }
  throw new AuditError(phase === 'input' ? 'INVALID_AUDIT_INPUT' : 'INVALID_AUDIT_RESPONSE', write);
}

export function decodeAuditEntry(value: unknown, phase: 'input' | 'response' = 'input', write = false): AuditEntry {
  const entry = decode(entrySchema, value, phase, write);
  validateTimestamp(entry.timestamp, phase, write);
  return entry;
}

export function createAuditEntry(value: unknown): AuditEntry {
  const draft = decode(draftSchema, value, 'input');
  return { ...draft, timestamp: new Date().toISOString() };
}

export function decodeAuditCreate(value: unknown): AuditCreateParams {
  const entry = decode(createSchema, value, 'input');
  validateTimestamp(entry.timestamp, 'input', false);
  return entry;
}

export function decodeAuditQuery(value: unknown): AuditQueryParams {
  return decode(querySchema, value, 'input');
}

export function decodeAuditEntries(value: unknown): AuditEntry[] {
  const entries = decode(entriesSchema, value, 'response');
  for (const entry of entries) validateTimestamp(entry.timestamp, 'response', false);
  return entries;
}
