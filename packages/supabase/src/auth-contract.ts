import { Type, type Static, type TSchema } from '@sinclair/typebox';
import { checkExact, snapshotPlainData } from '@svadmin/core/schema';

const nonempty = Type.String({ minLength: 1 });
const record = Type.Record(Type.String(), Type.Unknown());
const nullableText = Type.Union([Type.String(), Type.Null()]);
const username = Type.Optional(nonempty);

export const credentials = Type.Object({ email: nonempty, password: nonempty, username }, { additionalProperties: false });
export const registration = Type.Object({
  email: nonempty, password: nonempty, username, name: Type.Optional(Type.String()),
}, { additionalProperties: false });
export const resetRequest = Type.Object({ email: nonempty, username }, { additionalProperties: false });
export const passwordUpdate = Type.Object({
  password: nonempty, confirmPassword: Type.Optional(nonempty),
}, { additionalProperties: false });

export const identityMetadata = Type.Object({
  name: Type.Optional(nullableText), avatar_url: Type.Optional(nullableText),
});
export const userSchema = Type.Object({
  id: nonempty, aud: nonempty, created_at: nonempty,
  app_metadata: record, user_metadata: Type.Intersect([identityMetadata, record]),
  email: Type.Optional(Type.String()), phone: Type.Optional(Type.String()),
  role: Type.Optional(Type.String()),
  is_anonymous: Type.Optional(Type.Boolean()),
});
export type SupabaseAuthUser = Static<typeof userSchema>;

export const sessionSchema = Type.Object({
  access_token: nonempty, refresh_token: nonempty, token_type: Type.Literal('bearer'),
  expires_in: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
  expires_at: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
  user: userSchema,
});
export type SupabaseAuthSession = Static<typeof sessionSchema>;

export const loginResponse = Type.Object({
  data: Type.Object({ user: userSchema, session: sessionSchema }), error: Type.Null(),
});
export const registrationResponse = Type.Object({
  data: Type.Object({ user: userSchema, session: Type.Union([sessionSchema, Type.Null()]) }), error: Type.Null(),
});
export const sessionResponse = Type.Object({
  data: Type.Object({ session: Type.Union([sessionSchema, Type.Null()]) }), error: Type.Null(),
});
export const userResponse = Type.Object({
  data: Type.Object({ user: Type.Union([userSchema, Type.Null()]) }), error: Type.Null(),
});
export const updateResponse = Type.Object({
  data: Type.Object({ user: userSchema }), error: Type.Null(),
});
export const resetResponse = Type.Object({
  data: Type.Object({}, { additionalProperties: false }), error: Type.Null(),
});
export const signOutResponse = Type.Object({ error: Type.Null() });

const errorMessages = {
  INVALID_AUTH_INPUT: 'Invalid authentication input.',
  INVALID_AUTH_RESPONSE: 'Invalid authentication response.',
  INVALID_AUTH_SESSION: 'Invalid authentication session.',
  AUTH_SESSION_EXPIRED: 'Session expired, please sign in again.',
  AUTH_SESSION_CHANGED: 'Authentication session changed. Retry the operation.',
  AUTH_REJECTED: 'Authentication request was rejected.',
  AUTH_REQUEST_FAILED: 'Authentication request failed.',
  AUTH_CLEANUP_FAILED: 'Session cleanup could not be confirmed.',
  WRITE_OUTCOME_UNKNOWN: 'Authentication operation may have succeeded; its outcome could not be confirmed.',
  PERMISSION_LOOKUP_FAILED: 'Permission lookup failed.',
  INVALID_PERMISSIONS: 'Invalid permission response.',
} as const;

export class SupabaseAuthError extends Error {
  constructor(readonly code: keyof typeof errorMessages) {
    super(errorMessages[code]);
    this.name = 'SupabaseAuthError';
  }
}

type BoundaryPhase = 'input' | 'response' | 'session';

export function decodeAuth<S extends TSchema>(
  schema: S, value: unknown, phase: BoundaryPhase,
): Static<S> {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(schema, candidate)) return candidate;
  } catch {
    // Credential payloads and reflection errors must not become error details.
  }
  throw new SupabaseAuthError(phase === 'input' ? 'INVALID_AUTH_INPUT'
    : phase === 'session' ? 'INVALID_AUTH_SESSION' : 'INVALID_AUTH_RESPONSE');
}

/** Project only own data fields: SDK Error instances are not JSON records. */
function errorField(error: object, key: string): unknown {
  const property = Object.getOwnPropertyDescriptor(error, key);
  if (!property) return undefined;
  if (!('value' in property)) throw new TypeError('Invalid error descriptor');
  return property.value;
}

export function inspectAuthError(error: unknown): 'expired' | 'unauthorized' | 'rejected' | 'other' {
  try {
    if (typeof error !== 'object' || error === null) return 'other';
    const code = errorField(error, 'code');
    const status = errorField(error, 'status');
    const name = errorField(error, 'name');
    if ((code !== undefined && typeof code !== 'string') ||
        (name !== undefined && typeof name !== 'string') ||
        (status !== undefined && (typeof status !== 'number' || !Number.isInteger(status)))) return 'other';
    if (code === 'refresh_token_not_found' || code === 'refresh_token_already_used' ||
        code === 'session_not_found' || code === 'user_not_found' || code === 'bad_jwt' ||
        code === 'invalid_jwt' || name === 'AuthSessionMissingError') return 'expired';
    if (status === 401) return 'unauthorized';
    if (typeof status === 'number' && status >= 400 && status < 500) return 'rejected';
  } catch {
    // Ignore uninspectable errors, including throwing or revoked proxies.
  }
  return 'other';
}

function requestFailure(error: unknown, write: boolean, phase: 'response' | 'session'): SupabaseAuthError {
  switch (inspectAuthError(error)) {
    case 'expired': return new SupabaseAuthError('AUTH_SESSION_EXPIRED');
    case 'unauthorized': return new SupabaseAuthError(phase === 'session' ? 'AUTH_SESSION_EXPIRED' : 'AUTH_REJECTED');
    case 'rejected': return new SupabaseAuthError('AUTH_REJECTED');
    case 'other': return new SupabaseAuthError(write ? 'WRITE_OUTCOME_UNKNOWN' : 'AUTH_REQUEST_FAILED');
  }
}

/** Successful results must match a schema; failed results never expose SDK messages. */
export async function authRequest<S extends TSchema>(
  invoke: () => Promise<unknown>, schema: S, phase: 'response' | 'session', write = false,
): Promise<Static<S>> {
  let result: unknown;
  try { result = await invoke(); }
  catch (error) { throw requestFailure(error, write, phase); }

  let error: unknown;
  try {
    if (typeof result !== 'object' || result === null || Array.isArray(result)) {
      throw new TypeError('Invalid response');
    }
    const descriptor = Object.getOwnPropertyDescriptor(result, 'error');
    if (!descriptor || !('value' in descriptor)) throw new TypeError('Invalid response');
    error = descriptor.value;
  } catch {
    throw new SupabaseAuthError(write ? 'WRITE_OUTCOME_UNKNOWN'
      : phase === 'session' ? 'INVALID_AUTH_SESSION' : 'INVALID_AUTH_RESPONSE');
  }
  if (error !== null) {
    if (typeof error !== 'object' || error === null) {
      throw new SupabaseAuthError(write ? 'WRITE_OUTCOME_UNKNOWN'
        : phase === 'session' ? 'INVALID_AUTH_SESSION' : 'INVALID_AUTH_RESPONSE');
    }
    throw requestFailure(error, write, phase);
  }
  try { return decodeAuth(schema, result, phase); }
  catch {
    throw new SupabaseAuthError(write ? 'WRITE_OUTCOME_UNKNOWN'
      : phase === 'session' ? 'INVALID_AUTH_SESSION' : 'INVALID_AUTH_RESPONSE');
  }
}

export function validateIdentifier(input: { email: string; username?: string }): void {
  if (input.username !== undefined && input.username !== input.email) {
    throw new SupabaseAuthError('INVALID_AUTH_INPUT');
  }
}
