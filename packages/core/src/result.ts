/**
 * High-rigor Result<T, E> algebraic data type for safe, typed error handling
 * without throwing exceptions.
 */

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
  readonly error?: never;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
  readonly value?: never;
}

export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

export function unwrapResult<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

export function mapResult<T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (result.ok) {
    return ok(fn(result.value));
  }
  return result;
}

export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (!result.ok) {
    return err(fn(result.error));
  }
  return result;
}

export function flatMapResult<T, E, U>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
  if (result.ok) {
    return fn(result.value);
  }
  return result;
}

export function matchResult<T, E, R>(
  result: Result<T, E>,
  patterns: {
    ok: (value: T) => R;
    err: (error: E) => R;
  },
): R {
  return result.ok ? patterns.ok(result.value) : patterns.err(result.error);
}

export function fromThrowable<T, E = unknown>(
  fn: () => T,
  onError: (cause: unknown) => E,
): Result<T, E> {
  try {
    return ok(fn());
  } catch (cause) {
    return err(onError(cause));
  }
}

export async function fromPromise<T, E = unknown>(
  promise: Promise<T>,
  onError: (cause: unknown) => E,
): Promise<Result<T, E>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (cause) {
    return err(onError(cause));
  }
}
