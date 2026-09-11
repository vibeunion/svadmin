import { Type, type Static, type TSchema } from '@sinclair/typebox';
import { snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';

export const authErrorSchema = Type.Object({
  message: Type.String(),
  name: Type.Optional(Type.String()),
}, { additionalProperties: false });

// Auth hooks navigate within this application; external redirects belong to the provider.
export const authRedirectSchema = Type.String({ pattern: '^/(?![/\\\\])[^\\\\\\x00-\\x20\\x7f]*$' });
const identitySchema = Type.Intersect([
  Type.Object({
    id: Type.Optional(Type.String()),
    name: Type.Optional(Type.String()),
    email: Type.Optional(Type.String()),
    avatar: Type.Optional(Type.String()),
  }),
  Type.Record(Type.String(), Type.Unknown()),
]);
const checkResultSchema = Type.Object({
  authenticated: Type.Boolean(),
  redirectTo: Type.Optional(authRedirectSchema),
  error: Type.Optional(authErrorSchema),
  logout: Type.Optional(Type.Boolean()),
}, { additionalProperties: false });
const errorResultSchema = Type.Object({
  redirectTo: Type.Optional(authRedirectSchema),
  logout: Type.Optional(Type.Boolean()),
}, { additionalProperties: false });

export type Identity = Static<typeof identitySchema>;
export type CheckResult = Static<typeof checkResultSchema>;
export type AuthErrorResult = Static<typeof errorResultSchema>;

export class AuthErrorHandlingError extends Error {
  constructor(readonly code: 'AUTH_ERROR_HANDLER_FAILED' | 'INVALID_AUTH_ERROR_RESULT' | 'AUTH_LOGOUT_FAILED') {
    super({
      AUTH_ERROR_HANDLER_FAILED: 'Authentication error handling failed.',
      INVALID_AUTH_ERROR_RESULT: 'Invalid authentication error handling result.',
      AUTH_LOGOUT_FAILED: 'Authentication logout could not be confirmed.',
    }[code]);
    this.name = 'AuthErrorHandlingError';
  }
}

export type AuthErrorHandlingResult =
  | { status: 'ignored' | 'handled' | 'superseded' }
  | { status: 'failed'; error: AuthErrorHandlingError };

export function decodeAuthErrorResult(value: unknown): AuthErrorResult {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(errorResultSchema, candidate)) return Object.freeze(candidate);
  } catch {
    // Invalid provider instructions never become navigation or logout requests.
  }
  throw new AuthErrorHandlingError('INVALID_AUTH_ERROR_RESULT');
}

export class AuthQueryError extends Error {
  constructor(readonly code: 'AUTH_QUERY_FAILED' | 'INVALID_AUTH_IDENTITY' | 'INVALID_AUTH_CHECK') {
    super({
      AUTH_QUERY_FAILED: 'Authentication query failed.',
      INVALID_AUTH_IDENTITY: 'Invalid authentication identity.',
      INVALID_AUTH_CHECK: 'Invalid authentication check result.',
    }[code]);
    this.name = 'AuthQueryError';
  }
}

function decode<S extends TSchema>(schema: S, value: unknown, code: AuthQueryError['code']): Static<S> {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(schema, candidate)) return candidate;
  } catch {
    // Provider values and reflection errors must not escape the boundary.
  }
  throw new AuthQueryError(code);
}

export function decodeIdentity(value: unknown): Identity | null {
  if (value === null) return null;
  return Object.freeze(decode(identitySchema, value, 'INVALID_AUTH_IDENTITY'));
}

export function decodeAuthCheck(value: unknown): CheckResult {
  const result = decode(checkResultSchema, value, 'INVALID_AUTH_CHECK');
  if (result.authenticated && (result.logout === true || result.error !== undefined)) {
    throw new AuthQueryError('INVALID_AUTH_CHECK');
  }
  // A validated string can still contain upstream credentials or private diagnostics.
  if (result.error !== undefined) {
    result.error = Object.freeze({ message: 'Authentication check failed.', name: 'AUTH_CHECK_REJECTED' });
  }
  return Object.freeze(result);
}
