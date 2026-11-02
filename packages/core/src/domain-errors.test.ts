import { describe, expect, it } from 'bun:test';
import {
  ValidationError,
  ConflictError,
  AuthError,
  NetworkError,
  ContractDecodingError,
  NotFoundError,
  ServerInternalError,
  BadRequestError,
  RateLimitError,
  UnavailableError,
  CancelledError,
  AbortedError,
  UndoneError,
  matchError,
  toDomainError,
  type DomainError,
} from './domain-errors';
import { HttpError, UndoError } from './types';

describe('Domain Errors', () => {
  it('instantiates specific domain errors with tags and statusCodes', () => {
    const valErr = new ValidationError('Invalid inputs', { title: 'Required' });
    expect(valErr._tag).toBe('ValidationError');
    expect(valErr.statusCode).toBe(422);
    expect(valErr.fieldErrors).toEqual({ title: 'Required' });
    expect(valErr).toBeInstanceOf(HttpError);
    expect(valErr).toBeInstanceOf(Error);

    const conflict = new ConflictError('Concurrent edit', { recordId: 10, currentVersion: 2, expectedVersion: 1 });
    expect(conflict._tag).toBe('ConflictError');
    expect(conflict.statusCode).toBe(409);
    expect(conflict.recordId).toBe(10);

    const auth = new AuthError('unauthorized');
    expect(auth._tag).toBe('AuthError');
    expect(auth.kind).toBe('unauthorized');
    expect(auth.statusCode).toBe(401);

    const forbidden = new AuthError('forbidden', 'No view permission', { resource: 'posts', action: 'read' });
    expect(forbidden.kind).toBe('forbidden');
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.resource).toBe('posts');

    const network = new NetworkError('Gateway timeout', { isTimeout: true });
    expect(network._tag).toBe('NetworkError');
    expect(network.isTimeout).toBe(true);
    expect(network.retryable).toBe(true);
    expect(network.statusCode).toBe(504);

    const decoding = new ContractDecodingError('Schema mismatch', { resource: 'users', issues: ['missing id'] });
    expect(decoding._tag).toBe('ContractDecodingError');
    expect(decoding.statusCode).toBe(502);

    const notFound = new NotFoundError('Item missing', { resource: 'products', id: 99 });
    expect(notFound._tag).toBe('NotFoundError');
    expect(notFound.statusCode).toBe(404);

    const serverErr = new ServerInternalError('Database crash', 500, { traceId: 'trace-123' });
    expect(serverErr._tag).toBe('ServerInternalError');
    expect(serverErr.traceId).toBe('trace-123');
  });

  it('matches errors with matchError', () => {
    const valErr: DomainError = new ValidationError('Bad request', { email: 'Invalid' });

    const message = matchError<DomainError, string>(valErr, {
      ValidationError: (err) => `Validation: ${Object.keys(err.fieldErrors).join(',')}`,
      ConflictError: () => 'Conflict',
      AuthError: () => 'Auth',
      NetworkError: () => 'Network',
      ContractDecodingError: () => 'Decoding',
      NotFoundError: () => 'Not found',
      ServerInternalError: () => 'Server',
      BadRequestError: () => 'Bad request',
      RateLimitError: () => 'Rate limit',
      UnavailableError: () => 'Unavailable',
      CancelledError: () => 'Cancelled',
      AbortedError: () => 'Aborted',
      UndoneError: () => 'Undone',
    });

    // @ts-expect-error 缺少分支且没有兜底时必须在编译期失败
    void matchError<DomainError, string>(valErr, { ValidationError: () => 'incomplete' });

    expect(message).toBe('Validation: email');

    // With wildcard fallback
    const notFoundErr: DomainError = new NotFoundError('Gone');
    const fallbackMessage = matchError<DomainError, string>(notFoundErr, {
      ValidationError: () => 'Validation',
      _: (err) => `Handled by fallback: ${err._tag}`,
    });
    expect(fallbackMessage).toBe('Handled by fallback: NotFoundError');
  });

  it('toDomainError normalizes unknown and HttpError instances', () => {
    const rawHttp422 = new HttpError('Schema error', 422, { name: 'Too short' });
    const normalized422 = toDomainError(rawHttp422);
    expect(normalized422._tag).toBe('ValidationError');
    expect((normalized422 as ValidationError).fieldErrors).toEqual({ name: 'Too short' });

    const rawHttp409 = new HttpError('Version conflict', 409);
    expect(toDomainError(rawHttp409)._tag).toBe('ConflictError');

    const rawHttp401 = new HttpError('Token expired', 401);
    expect(toDomainError(rawHttp401)._tag).toBe('AuthError');

    const rawHttp404 = new HttpError('Not found', 404);
    expect(toDomainError(rawHttp404)._tag).toBe('NotFoundError');

    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    const normalizedAbort = toDomainError(abortErr);
    expect(normalizedAbort._tag).toBe('AbortedError');
    expect(normalizedAbort).toBeInstanceOf(AbortedError);
    expect((normalizedAbort as AbortedError).retryable).toBe(false);

    const timeoutErr = new Error('timed out');
    timeoutErr.name = 'TimeoutError';
    const normalizedTimeout = toDomainError(timeoutErr);
    expect(normalizedTimeout._tag).toBe('NetworkError');
    expect((normalizedTimeout as NetworkError).isTimeout).toBe(true);

    const unknownString = toDomainError('Unknown crash');
    expect(unknownString._tag).toBe('ServerInternalError');
    expect(unknownString.message).toBe('Unknown crash');
  });

  it('preserves transport metadata and does not relabel control flow', () => {
    const conflict = new HttpError('Version conflict', 409, undefined, {
      code: 'RESOURCE_CONFLICT',
      details: { currentVersion: 2 },
      body: { ok: false },
    });
    const normalizedConflict = toDomainError(conflict);
    expect(normalizedConflict).toBeInstanceOf(ConflictError);
    if (!(normalizedConflict instanceof ConflictError)) throw new Error('expected conflict');
    expect(normalizedConflict.details).toEqual({ currentVersion: 2 });
    expect(normalizedConflict.body).toEqual({ ok: false });
    expect(normalizedConflict.code).toBe('RESOURCE_CONFLICT');

    const cancelled = new HttpError('Update scope changed', 409, undefined, {
      code: 'UPDATE_CANCELLED',
      details: { writeMayHaveSucceeded: true, id: 7 },
    });
    const normalizedCancel = toDomainError(cancelled);
    expect(normalizedCancel).toBeInstanceOf(CancelledError);
    if (normalizedCancel instanceof CancelledError) {
      expect(normalizedCancel.writeMayHaveSucceeded).toBe(true);
      expect(normalizedCancel.code).toBe('UPDATE_CANCELLED');
      expect(normalizedCancel.details).toEqual({ writeMayHaveSucceeded: true, id: 7 });
      expect(normalizedCancel.statusCode).toBe(409);
    }

    const undone = toDomainError(new UndoError());
    expect(undone).toBeInstanceOf(UndoneError);
    expect(undone._tag).toBe('UndoneError');
    expect(undone.message).toBe('Mutation undone');

    const rate = new HttpError('slow down', 429, undefined, {
      code: 'RATE_LIMIT',
      details: { retryAfter: 3 },
      body: { a: 1 },
    });
    const normalizedRate = toDomainError(rate);
    expect(normalizedRate).toBeInstanceOf(RateLimitError);
    if (!(normalizedRate instanceof RateLimitError)) throw new Error('expected rate limit');
    expect(normalizedRate.statusCode).toBe(429);
    expect(normalizedRate.code).toBe('RATE_LIMIT');
    expect(normalizedRate.details).toEqual({ retryAfter: 3 });
    expect(normalizedRate.body).toEqual({ a: 1 });

    const bad = new HttpError('missing field', 400, { title: 'Required' }, { details: { field: 'title' } });
    const normalizedBad = toDomainError(bad);
    expect(normalizedBad).toBeInstanceOf(BadRequestError);
    if (!(normalizedBad instanceof BadRequestError)) throw new Error('expected bad request');
    expect(normalizedBad.fieldErrors).toEqual({ title: 'Required' });
    expect(normalizedBad.details).toEqual({ field: 'title' });

    const timedOut = new HttpError('request timeout', 408, undefined, { details: { attempt: 2 } });
    const normalizedTimedOut = toDomainError(timedOut);
    expect(normalizedTimedOut).toBeInstanceOf(NetworkError);
    if (normalizedTimedOut instanceof NetworkError) {
      expect(normalizedTimedOut.isTimeout).toBe(true);
      expect(normalizedTimedOut.statusCode).toBe(408);
      expect(normalizedTimedOut.details).toEqual({ attempt: 2 });
    }

    const unavailable = new HttpError('down', 503, undefined, { body: { maintenance: true } });
    const normalizedUnavailable = toDomainError(unavailable);
    expect(normalizedUnavailable).toBeInstanceOf(UnavailableError);
    if (!(normalizedUnavailable instanceof UnavailableError)) throw new Error('expected unavailable');
    expect(normalizedUnavailable.statusCode).toBe(503);
    expect(normalizedUnavailable.body).toEqual({ maintenance: true });
  });
});
