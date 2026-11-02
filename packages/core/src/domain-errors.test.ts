import { describe, expect, it } from 'bun:test';
import {
  ValidationError,
  ConflictError,
  AuthError,
  NetworkError,
  ContractDecodingError,
  NotFoundError,
  ServerInternalError,
  matchError,
  toDomainError,
  type DomainError,
} from './domain-errors';
import { HttpError } from './types';

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

    const message = matchError(valErr, {
      ValidationError: (err) => `Validation: ${Object.keys(err.fieldErrors).join(',')}`,
      ConflictError: () => 'Conflict',
      AuthError: () => 'Auth',
      NetworkError: () => 'Network',
      ContractDecodingError: () => 'Decoding',
      NotFoundError: () => 'Not found',
      ServerInternalError: () => 'Server',
    });

    expect(message).toBe('Validation: email');

    // With wildcard fallback
    const notFoundErr: DomainError = new NotFoundError('Gone');
    const fallbackMessage = matchError(notFoundErr, {
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
    expect(normalizedAbort._tag).toBe('NetworkError');
    expect((normalizedAbort as NetworkError).isTimeout).toBe(true);

    const unknownString = toDomainError('Unknown crash');
    expect(unknownString._tag).toBe('ServerInternalError');
    expect(unknownString.message).toBe('Unknown crash');
  });
});
