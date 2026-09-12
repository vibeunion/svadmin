export interface SSOAuthErrorOptions {
  code?: string;
  details?: unknown;
  body?: unknown;
  retryable?: boolean;
  cause?: unknown;
}

const RETRYABLE_STATUS_CODES = new Set([0, 408, 429, 500, 502, 503, 504]);
const TERMINAL_OAUTH_CODES = new Set([
  'invalid_grant',
  'invalid_token',
  'session_not_found',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'refresh_token_reuse_detected',
  'invalid_refresh_token',
  'session_expired',
  'session_persistence_failed',
  'auth_retry_exhausted',
  'session_refresh_failed',
]);

export class SSOAuthError extends Error {
  readonly statusCode: number;
  readonly code: string | undefined;
  readonly details?: unknown;
  readonly body?: unknown;
  readonly retryable: boolean;
  override readonly cause?: unknown;

  constructor(message: string, statusCode: number, options: SSOAuthErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'SSOAuthError';
    this.statusCode = statusCode;
    this.code = options.code;
    this.details = options.details;
    this.body = options.body;
    this.retryable = options.retryable ?? RETRYABLE_STATUS_CODES.has(statusCode);
    this.cause = options.cause;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string');
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    return text;
  }
}

export async function createSSOAuthResponseError(
  response: Response,
  fallbackMessage: string,
): Promise<SSOAuthError> {
  const body = await readResponseBody(response);
  const record = asRecord(body);
  const nestedError = asRecord(record?.['error']);
  const code = firstString(
    record?.['code'],
    record?.['error_code'],
    nestedError?.['code'],
    nestedError?.['error_code'],
    record?.['error'],
  );
  const description = firstString(
    record?.['error_description'],
    nestedError?.['error_description'],
  );
  const responseMessage = firstString(record?.['message'], nestedError?.['message']);
  const textMessage = typeof body === 'string' ? body : undefined;
  const statusMessage = response.statusText || `HTTP ${response.status}`;

  return new SSOAuthError(
    description ?? responseMessage ?? textMessage ?? `${fallbackMessage}: ${statusMessage}`,
    response.status,
    {
      ...(code === undefined ? {} : { code }),
      details: record?.['details'] ?? nestedError?.['details'],
      body,
    },
  );
}

export function createSSOAuthNetworkError(error: unknown, fallbackMessage: string): SSOAuthError {
  if (error instanceof SSOAuthError) return error;

  const isAbort = (
    typeof DOMException !== 'undefined'
    && error instanceof DOMException
    && error.name === 'AbortError'
  ) || (
    typeof error === 'object'
    && error !== null
    && 'name' in error
    && error.name === 'AbortError'
  );
  return new SSOAuthError(
    error instanceof Error ? error.message : fallbackMessage,
    0,
    {
      code: isAbort ? 'request_aborted' : 'network_error',
      retryable: !isAbort,
      cause: error,
    },
  );
}

export function isTerminalSessionError(error: unknown): boolean {
  const record = asRecord(error);
  const code = firstString(
    record?.['code'],
    record?.['error_code'],
    asRecord(record?.['error'])?.['code'],
    asRecord(record?.['error'])?.['error_code'],
  );
  return code !== undefined && TERMINAL_OAUTH_CODES.has(code);
}
