import { HttpError, type ValidationErrors, type HttpErrorOptions } from './types';
import { definedOptions } from './defined-options';

export class ValidationError extends HttpError {
  readonly _tag = 'ValidationError' as const;
  readonly fieldErrors: ValidationErrors;

  constructor(
    message: string = 'Validation failed',
    fieldErrors: ValidationErrors = {},
    options: HttpErrorOptions = {},
  ) {
    super(message, 422, fieldErrors, definedOptions({
      code: options.code ?? 'VALIDATION_FAILED',
      details: options.details,
      body: options.body,
      cause: options.cause,
    }));
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export interface ConflictErrorOptions extends HttpErrorOptions {
  resource?: string | undefined;
  recordId?: string | number | undefined;
  currentVersion?: string | number | undefined;
  expectedVersion?: string | number | undefined;
}

export class ConflictError extends HttpError {
  readonly _tag = 'ConflictError' as const;
  readonly resource?: string | undefined;
  readonly recordId?: string | number | undefined;
  readonly currentVersion?: string | number | undefined;
  readonly expectedVersion?: string | number | undefined;

  constructor(
    message: string = 'Resource conflict detected',
    options: ConflictErrorOptions = {},
  ) {
    super(message, 409, undefined, definedOptions({
      code: options.code ?? 'RESOURCE_CONFLICT',
      details: options.details,
      body: options.body,
      cause: options.cause,
    }));
    this.name = 'ConflictError';
    this.resource = options.resource;
    this.recordId = options.recordId;
    this.currentVersion = options.currentVersion;
    this.expectedVersion = options.expectedVersion;
  }
}

export interface AuthErrorOptions extends HttpErrorOptions {
  resource?: string | undefined;
  action?: string | undefined;
}

export class AuthError extends HttpError {
  readonly _tag = 'AuthError' as const;
  readonly kind: 'unauthorized' | 'forbidden';
  readonly resource?: string | undefined;
  readonly action?: string | undefined;

  constructor(
    kind: 'unauthorized' | 'forbidden',
    message?: string,
    options: AuthErrorOptions = {},
  ) {
    const statusCode = kind === 'unauthorized' ? 401 : 403;
    const defaultMsg = kind === 'unauthorized' ? 'Authentication required' : 'Permission denied';
    super(message ?? defaultMsg, statusCode, undefined, definedOptions({
      code: options.code ?? (kind === 'unauthorized' ? 'UNAUTHORIZED' : 'FORBIDDEN'),
      details: options.details,
      body: options.body,
      cause: options.cause,
    }));
    this.name = 'AuthError';
    this.kind = kind;
    this.resource = options.resource;
    this.action = options.action;
  }
}

export interface NetworkErrorOptions extends HttpErrorOptions {
  isTimeout?: boolean | undefined;
  isOffline?: boolean | undefined;
}

export class NetworkError extends HttpError {
  readonly _tag = 'NetworkError' as const;
  readonly isTimeout: boolean;
  readonly isOffline: boolean;
  readonly retryable = true as const;

  constructor(
    message: string = 'Network communication failure',
    options: NetworkErrorOptions = {},
  ) {
    super(message, options.isTimeout ? 504 : 0, undefined, definedOptions({
      code: options.code ?? (options.isTimeout ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR'),
      details: options.details,
      body: options.body,
      cause: options.cause,
    }));
    this.name = 'NetworkError';
    this.isTimeout = options.isTimeout ?? false;
    this.isOffline = options.isOffline ?? false;
  }
}

export interface ContractDecodingErrorOptions extends HttpErrorOptions {
  resource?: string | undefined;
  issues?: readonly unknown[] | undefined;
}

export class ContractDecodingError extends HttpError {
  readonly _tag = 'ContractDecodingError' as const;
  readonly resource?: string | undefined;
  readonly issues?: readonly unknown[] | undefined;

  constructor(
    message: string = 'Contract decoding mismatch',
    options: ContractDecodingErrorOptions = {},
  ) {
    super(message, 502, undefined, definedOptions({
      code: options.code ?? 'CONTRACT_DECODING_ERROR',
      details: options.details ?? options.issues,
      body: options.body,
      cause: options.cause,
    }));
    this.name = 'ContractDecodingError';
    this.resource = options.resource;
    this.issues = options.issues;
  }
}

export interface NotFoundErrorOptions extends HttpErrorOptions {
  resource?: string | undefined;
  id?: string | number | undefined;
}

export class NotFoundError extends HttpError {
  readonly _tag = 'NotFoundError' as const;
  readonly resource?: string | undefined;
  readonly id?: string | number | undefined;

  constructor(
    message: string = 'Resource not found',
    options: NotFoundErrorOptions = {},
  ) {
    super(message, 404, undefined, definedOptions({
      code: options.code ?? 'RESOURCE_NOT_FOUND',
      details: options.details,
      body: options.body,
      cause: options.cause,
    }));
    this.name = 'NotFoundError';
    this.resource = options.resource;
    this.id = options.id;
  }
}

export interface ServerInternalErrorOptions extends HttpErrorOptions {
  traceId?: string | undefined;
}

export class ServerInternalError extends HttpError {
  readonly _tag = 'ServerInternalError' as const;
  readonly traceId?: string | undefined;

  constructor(
    message: string = 'Internal server failure',
    statusCode: number = 500,
    options: ServerInternalErrorOptions = {},
  ) {
    super(message, statusCode, undefined, definedOptions({
      code: options.code ?? 'INTERNAL_SERVER_ERROR',
      details: options.details,
      body: options.body,
      cause: options.cause,
    }));
    this.name = 'ServerInternalError';
    this.traceId = options.traceId;
  }
}

export type DomainError =
  | ValidationError
  | ConflictError
  | AuthError
  | NetworkError
  | ContractDecodingError
  | NotFoundError
  | ServerInternalError;

export type DomainErrorTag = DomainError['_tag'];

export type ErrorPattern<E extends { readonly _tag: string }, R> = {
  [K in E['_tag']]?: (error: Extract<E, { readonly _tag: K }>) => R;
} & {
  [key: string]: ((error: never) => R) | undefined;
} & {
  _?: (error: E) => R;
};

export function matchError<E extends { readonly _tag: string }, R>(
  error: E,
  patterns: ErrorPattern<E, R>,
): R {
  const tag = error._tag as string;
  const handler = (patterns as Record<string, ((err: unknown) => R) | undefined>)[tag];
  if (typeof handler === 'function') {
    return handler(error);
  }
  const fallback = patterns._;
  if (typeof fallback === 'function') {
    return fallback(error);
  }
  throw new Error(`Unhandled domain error tag: ${tag}`);
}

export function toDomainError(cause: unknown): DomainError {
  if (
    cause instanceof ValidationError
    || cause instanceof ConflictError
    || cause instanceof AuthError
    || cause instanceof NetworkError
    || cause instanceof ContractDecodingError
    || cause instanceof NotFoundError
    || cause instanceof ServerInternalError
  ) {
    return cause;
  }

  if (cause instanceof HttpError) {
    const status = cause.statusCode;
    if (status === 422) {
      return new ValidationError(cause.message, cause.errors ?? {}, definedOptions({ code: cause.code, cause }));
    }
    if (status === 409) {
      return new ConflictError(cause.message, definedOptions({ code: cause.code, cause }));
    }
    if (status === 401) {
      return new AuthError('unauthorized', cause.message, definedOptions({ code: cause.code, cause }));
    }
    if (status === 403) {
      return new AuthError('forbidden', cause.message, definedOptions({ code: cause.code, cause }));
    }
    if (status === 404) {
      return new NotFoundError(cause.message, definedOptions({ code: cause.code, cause }));
    }
    if (status === 504 || status === 0) {
      return new NetworkError(cause.message, definedOptions({ isTimeout: status === 504, code: cause.code, cause }));
    }
    return new ServerInternalError(cause.message, status, definedOptions({ code: cause.code, cause }));
  }

  if (cause instanceof Error) {
    if (cause.name === 'AbortError' || cause.name === 'TimeoutError') {
      return new NetworkError(cause.message, { isTimeout: true, cause });
    }
    return new ServerInternalError(cause.message, 500, { cause });
  }

  return new ServerInternalError(typeof cause === 'string' ? cause : 'Unknown system error', 500, { cause });
}
