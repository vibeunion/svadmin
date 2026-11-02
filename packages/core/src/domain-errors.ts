import { HttpError, UndoError, type ValidationErrors, type HttpErrorOptions } from './types';
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
  statusCode?: number | undefined;
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
    const isTimeout = options.isTimeout ?? false;
    super(message, options.statusCode ?? (isTimeout ? 504 : 0), undefined, definedOptions({
      code: options.code ?? (isTimeout ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR'),
      details: options.details,
      body: options.body,
      cause: options.cause,
    }));
    this.name = 'NetworkError';
    this.isTimeout = isTimeout;
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

export class BadRequestError extends HttpError {
  readonly _tag = 'BadRequestError' as const;
  readonly fieldErrors: ValidationErrors;

  constructor(
    message: string = 'Bad request',
    fieldErrors: ValidationErrors = {},
    options: HttpErrorOptions = {},
  ) {
    super(message, 400, fieldErrors, definedOptions({
      code: options.code ?? 'BAD_REQUEST',
      details: options.details,
      body: options.body,
      cause: options.cause,
    }));
    this.name = 'BadRequestError';
    this.fieldErrors = fieldErrors;
  }
}

export class RateLimitError extends HttpError {
  readonly _tag = 'RateLimitError' as const;
  readonly retryable = true as const;

  constructor(
    message: string = 'Rate limit exceeded',
    options: HttpErrorOptions = {},
  ) {
    super(message, 429, undefined, definedOptions({
      code: options.code ?? 'RATE_LIMITED',
      details: options.details,
      body: options.body,
      cause: options.cause,
    }));
    this.name = 'RateLimitError';
  }
}

export class UnavailableError extends HttpError {
  readonly _tag = 'UnavailableError' as const;
  readonly retryable = true as const;

  constructor(
    message: string = 'Service unavailable',
    statusCode: number = 503,
    options: HttpErrorOptions = {},
  ) {
    super(message, statusCode, undefined, definedOptions({
      code: options.code ?? 'SERVICE_UNAVAILABLE',
      details: options.details,
      body: options.body,
      cause: options.cause,
    }));
    this.name = 'UnavailableError';
  }
}

export class CancelledError extends HttpError {
  readonly _tag = 'CancelledError' as const;
  readonly writeMayHaveSucceeded: boolean;

  constructor(
    message: string = 'Operation cancelled',
    statusCode: number = 409,
    options: HttpErrorOptions = {},
  ) {
    super(message, statusCode, undefined, definedOptions({
      code: options.code ?? 'OPERATION_CANCELLED',
      details: options.details,
      body: options.body,
      cause: options.cause,
    }));
    this.name = 'CancelledError';
    this.writeMayHaveSucceeded = writeMayHaveSucceeded(options.details);
  }
}

export class AbortedError extends HttpError {
  readonly _tag = 'AbortedError' as const;
  readonly retryable = false as const;

  constructor(
    message: string = 'Operation aborted',
    options: HttpErrorOptions = {},
  ) {
    super(message, 0, undefined, definedOptions({
      code: options.code ?? 'ABORTED',
      details: options.details,
      body: options.body,
      cause: options.cause,
    }));
    this.name = 'AbortedError';
  }
}

/** 用户撤销不是服务器失败，不能伪装成 500。 */
export class UndoneError extends Error {
  readonly _tag = 'UndoneError' as const;

  constructor(
    message: string = 'Mutation undone',
    options: { cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'UndoneError';
  }
}

export type DomainError =
  | ValidationError
  | ConflictError
  | AuthError
  | NetworkError
  | ContractDecodingError
  | NotFoundError
  | ServerInternalError
  | BadRequestError
  | RateLimitError
  | UnavailableError
  | CancelledError
  | AbortedError
  | UndoneError;

export type DomainErrorTag = DomainError['_tag'];

type ErrorHandlers<E extends { readonly _tag: string }, R> = {
  [K in E['_tag']]: (error: Extract<E, { readonly _tag: K }>) => R;
};

/** 要么覆盖全部分支，要么提供 `_` 兜底。缺分支在编译期失败。 */
export type ErrorPattern<E extends { readonly _tag: string }, R> =
  | ErrorHandlers<E, R>
  | (Partial<ErrorHandlers<E, R>> & { _: (error: E) => R });

export function matchError<E extends { readonly _tag: string }, R>(
  error: E,
  patterns: ErrorPattern<E, R>,
): R {
  const tag = error._tag as E['_tag'];
  const handler = (patterns as Partial<ErrorHandlers<E, R>>)[tag];
  if (typeof handler === 'function') {
    return handler(error as never);
  }
  if ('_' in patterns && typeof patterns._ === 'function') {
    return patterns._(error);
  }
  throw new Error(`Unhandled domain error tag: ${tag}`);
}

function writeMayHaveSucceeded(details: unknown): boolean {
  return typeof details === 'object'
    && details !== null
    && 'writeMayHaveSucceeded' in details
    && details.writeMayHaveSucceeded === true;
}

function carried(cause: HttpError): HttpErrorOptions {
  return definedOptions({
    code: cause.code,
    details: cause.details,
    body: cause.body,
    cause,
  });
}

function isDomainError(cause: unknown): cause is DomainError {
  return cause instanceof ValidationError
    || cause instanceof ConflictError
    || cause instanceof AuthError
    || cause instanceof NetworkError
    || cause instanceof ContractDecodingError
    || cause instanceof NotFoundError
    || cause instanceof ServerInternalError
    || cause instanceof BadRequestError
    || cause instanceof RateLimitError
    || cause instanceof UnavailableError
    || cause instanceof CancelledError
    || cause instanceof AbortedError
    || cause instanceof UndoneError;
}

/**
 * 保留 HttpError 的 code、details、body。
 * 取消和撤销不能改写成冲突或 500，否则 safeMutate 会丢掉 writeMayHaveSucceeded。
 */
export function toDomainError(cause: unknown): DomainError {
  if (isDomainError(cause)) return cause;

  if (cause instanceof UndoError) {
    return new UndoneError(cause.message, { cause });
  }

  if (cause instanceof HttpError) {
    const options = carried(cause);
    if (typeof cause.code === 'string' && cause.code.endsWith('_CANCELLED')) {
      return new CancelledError(cause.message, cause.statusCode, options);
    }
    const status = cause.statusCode;
    if (status === 422) return new ValidationError(cause.message, cause.errors ?? {}, options);
    if (status === 409) return new ConflictError(cause.message, options);
    if (status === 401) return new AuthError('unauthorized', cause.message, options);
    if (status === 403) return new AuthError('forbidden', cause.message, options);
    if (status === 404) return new NotFoundError(cause.message, options);
    if (status === 400) return new BadRequestError(cause.message, cause.errors ?? {}, options);
    if (status === 408 || status === 504 || status === 0) {
      return new NetworkError(cause.message, definedOptions({
        isTimeout: status === 408 || status === 504,
        statusCode: status,
        code: cause.code,
        details: cause.details,
        body: cause.body,
        cause,
      }));
    }
    if (status === 429) return new RateLimitError(cause.message, options);
    if (status === 503) return new UnavailableError(cause.message, status, options);
    return new ServerInternalError(cause.message, status, options);
  }

  if (cause instanceof Error) {
    if (cause.name === 'AbortError') return new AbortedError(cause.message, { cause });
    if (cause.name === 'TimeoutError') return new NetworkError(cause.message, { isTimeout: true, cause });
    return new ServerInternalError(cause.message, 500, { cause });
  }

  return new ServerInternalError(typeof cause === 'string' ? cause : 'Unknown system error', 500, { cause });
}
