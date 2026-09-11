import { Type, type Static } from '@sinclair/typebox';
import type { AuthProvider } from './types';
import { authErrorSchema, authRedirectSchema, decodeIdentity } from './auth-query-contract';
import { snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';

const actionResultSchema = Type.Object({
  success: Type.Boolean(),
  redirectTo: Type.Optional(authRedirectSchema),
  error: Type.Optional(authErrorSchema),
}, { additionalProperties: false });
const parametersSchema = Type.Record(Type.String(), Type.Unknown());
const profileSchema = Type.Object({
  name: Type.Optional(Type.String()),
  avatar: Type.Optional(Type.String()),
});

export type AuthActionResult = Static<typeof actionResultSchema>;
export type AuthMutationMethod =
  | 'login' | 'logout' | 'register' | 'forgotPassword'
  | 'updatePassword' | 'updateIdentity' | 'updateProfile';
export type AuthMutationArgs<M extends AuthMutationMethod> = Parameters<NonNullable<AuthProvider[M]>>;

export class AuthMutationError extends Error {
  constructor(readonly code:
    | 'INVALID_AUTH_INPUT' | 'AUTH_METHOD_UNAVAILABLE' | 'AUTH_REQUEST_FAILED'
    | 'INVALID_AUTH_RESULT' | 'AUTH_REJECTED' | 'AUTH_RESULT_SUPERSEDED',
  ) {
    super({
      INVALID_AUTH_INPUT: 'Invalid authentication input.',
      AUTH_METHOD_UNAVAILABLE: 'Authentication method is unavailable.',
      AUTH_REQUEST_FAILED: 'Authentication request failed; its outcome could not be confirmed.',
      INVALID_AUTH_RESULT: 'Invalid authentication result; its outcome could not be confirmed.',
      AUTH_REJECTED: 'Authentication request was rejected.',
      AUTH_RESULT_SUPERSEDED: 'Authentication result belongs to an inactive request.',
    }[code]);
    this.name = 'AuthMutationError';
  }
}

export function authMutationFailure(code: AuthMutationError['code']): AuthActionResult {
  const error = new AuthMutationError(code);
  return Object.freeze({ success: false, error: Object.freeze({ name: error.code, message: error.message }) });
}

export function decodeAuthAction(value: unknown): AuthActionResult {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(actionResultSchema, candidate) && !(candidate.success && candidate.error !== undefined)) {
      return candidate.success ? Object.freeze(candidate) : authMutationFailure('AUTH_REJECTED');
    }
  } catch {
    // Never expose provider payloads, exception text, or reflection failures.
  }
  throw new AuthMutationError('INVALID_AUTH_RESULT');
}

export function decodeAuthParameters(value: unknown): Record<string, unknown> {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(parametersSchema, candidate)) return candidate;
  } catch {
    // Business-specific fields are validated by the selected provider.
  }
  throw new AuthMutationError('INVALID_AUTH_INPUT');
}

function decodeProfile(value: unknown): Parameters<NonNullable<AuthProvider['updateProfile']>>[0] {
  try {
    if (typeof value !== 'object' || value === null) throw new Error();
    const descriptor = Object.getOwnPropertyDescriptor(value, 'avatar');
    const avatar: unknown = descriptor && 'value' in descriptor ? descriptor.value : undefined;
    if (typeof File !== 'undefined' && avatar instanceof File) {
      // File is immutable upload data. Validate every other field without reading accessors.
      const descriptors = Object.getOwnPropertyDescriptors(value);
      delete descriptors['avatar'];
      if (Object.getOwnPropertySymbols(value).length > 0 ||
          (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) ||
          descriptor?.enumerable !== true) throw new Error();
      const rest: unknown = Object.defineProperties({}, descriptors);
      const candidate = decodeAuthParameters(rest);
      if (checkExact(profileSchema, candidate)) return { ...candidate, avatar };
    } else {
      const candidate = decodeAuthParameters(value);
      if (checkExact(profileSchema, candidate)) return candidate;
    }
  } catch {
    // Invalid metadata must not turn into a partial profile update.
  }
  throw new AuthMutationError('INVALID_AUTH_INPUT');
}

function captureMethod<P>(
  provider: AuthProvider,
  select: () => ((params: P) => Promise<AuthActionResult>) | undefined,
): (params: P) => Promise<unknown> {
  try {
    const method = select();
    if (typeof method === 'function') return params => method.call(provider, params);
  } catch {
    // A throwing method accessor is unavailable, not an input or server error.
  }
  throw new AuthMutationError('AUTH_METHOD_UNAVAILABLE');
}

/** Validate and snapshot before dispatch, retaining the exact method and receiver. */
export function prepareAuthMutation(provider: AuthProvider, method: AuthMutationMethod, value: unknown): () => Promise<unknown> {
  switch (method) {
    case 'logout': {
      const invoke = captureMethod(provider, () => provider.logout);
      const input = value === undefined ? undefined : decodeAuthParameters(value);
      return () => invoke(input);
    }
    case 'updateProfile': {
      const invoke = captureMethod(provider, () => provider.updateProfile);
      const input = decodeProfile(value);
      return () => invoke(input);
    }
    case 'updateIdentity': {
      const invoke = captureMethod(provider, () => provider.updateIdentity);
      try {
        const input = decodeIdentity(value);
        if (input !== null) return () => invoke(input);
      } catch {
        // Query decoder errors are normalized to this input boundary.
      }
      throw new AuthMutationError('INVALID_AUTH_INPUT');
    }
    case 'login':
    case 'register':
    case 'forgotPassword':
    case 'updatePassword': {
      const invoke = captureMethod(provider, () => provider[method]);
      const input = decodeAuthParameters(value);
      return () => invoke(input);
    }
    default: {
      const invalid: never = method;
      void invalid;
      throw new AuthMutationError('AUTH_METHOD_UNAVAILABLE');
    }
  }
}
