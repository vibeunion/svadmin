import { afterEach,describe,expect,mock,test } from 'bun:test';
import { createFetchWithInterceptor } from './http';
import { HttpError } from './types';
import { requireValue } from '../test/assertions';

interface MutableLocation {
  href: string;
  pathname: string;
}

interface TestWindow {
  location: MutableLocation;
}

const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');

afterEach(() => {
  const globalScope = globalThis as { window?: TestWindow };
  if (originalWindow) {
    // Restore the original VALUE (not the descriptor object) so `window`
    // keeps its pre-test shape; resetting through defineProperty keeps the
    // property writable for tests that still need to redefine it.
    Object.defineProperty(globalScope, 'window', {
      value: originalWindow.value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  } else {
    Reflect.deleteProperty(globalScope, 'window');
  }
});

function mockFetchWithStatus(status: number) {
  const calls: Array<{ url: string; init: RequestInit|undefined }>=[];
  const fetchImpl=mock(async (url: string,init?: RequestInit) => {
    calls.push({ url,init });
    return new Response(null,{ status });
  });

  return { calls,fetchImpl };
}

describe('createFetchWithInterceptor',() => {
  test('adds CSRF header for mutating requests',async () => {
    const { calls,fetchImpl }=mockFetchWithStatus(200);
    const fetcher=createFetchWithInterceptor({ fetchImpl });

    await fetcher('/api/users',{
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(calls).toHaveLength(1);
    const headers=new Headers(requireValue(calls[0]).init?.headers);
    expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  test('does not add CSRF header for safe requests',async () => {
    const { calls,fetchImpl }=mockFetchWithStatus(200);
    const fetcher=createFetchWithInterceptor({ fetchImpl });

    await fetcher('/api/users',{ method: 'GET' });

    const headers=new Headers(requireValue(calls[0]).init?.headers);
    expect(headers.get('X-Requested-With')).toBeNull();
  });

  test('throws configured forbidden message for 403',async () => {
    const { fetchImpl }=mockFetchWithStatus(403);
    const fetcher=createFetchWithInterceptor({
      fetchImpl,
      forbiddenMessage: 'No access',
    });

    await expect(fetcher('/api/admin')).rejects.toThrow('No access');
  });

  test('preserves structured error fields from JSON responses',async () => {
    const fetcher=createFetchWithInterceptor({
      fetchImpl: async () => new Response(JSON.stringify({
        message: 'Token expired',
        code: 'token_expired',
        details: { expiredAt: '2026-07-18T00:00:00Z' },
      }),{
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
      onUnauthorized: () => undefined,
    });

    try {
      await fetcher('/api/private');
      throw new Error('Expected request to fail');
    } catch(error) {
      expect(error).toBeInstanceOf(HttpError);
      if(!(error instanceof HttpError)) throw error;
      const httpError=error;
      expect(httpError.statusCode).toBe(401);
      expect(httpError.code).toBe('token_expired');
      expect(httpError.details).toEqual({ expiredAt: '2026-07-18T00:00:00Z' });
      expect(httpError.body).toEqual({
        message: 'Token expired',
        code: 'token_expired',
        details: { expiredAt: '2026-07-18T00:00:00Z' },
      });
    }
  });

  test('parses nested BFF error envelopes',async () => {
    const fetcher=createFetchWithInterceptor({
      fetchImpl: async () => new Response(JSON.stringify({
        error: {
          message: 'Session expired',
          code: 'session_expired',
          details: { reason: 'idle_timeout' },
        },
      }),{ status: 401 }),
      onUnauthorized: () => undefined,
    });

    try {
      await fetcher('/api/private');
      throw new Error('Expected request to fail');
    } catch(error) {
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({
        message: 'Session expired',
        statusCode: 401,
        code: 'session_expired',
        details: { reason: 'idle_timeout' },
      });
    }
  });

  test('preserves non-auth HTTP responses for caller-owned handling',async () => {
    const fetcher=createFetchWithInterceptor({
      fetchImpl: async () => new Response(JSON.stringify({
        error_code: 'refresh_token_not_found',
        message: 'Refresh Token Not Found',
      }),{ status: 400 }),
    });

    const response=await fetcher('/oauth/token');
    expect(response.status).toBe(400);
  });

  test('marks an exhausted authenticated retry as terminal without starting another refresh',async () => {
    const fetcher=createFetchWithInterceptor({
      fetchImpl: async () => new Response(null,{
        status: 401,
        headers: { 'X-Svadmin-Auth-Retry': 'exhausted' },
      }),
      onUnauthorized: () => undefined,
    });

    await expect(fetcher('/api/private')).rejects.toMatchObject({
      statusCode: 401,
      code: 'auth_retry_exhausted',
    });
  });

  test('preserves structured auth errors thrown by an authenticated fetch layer',async () => {
    const authError=Object.assign(new Error('Refresh Token Not Found'),{
      statusCode: 400,
      code: 'refresh_token_not_found',
      details: { source: 'gotrue' },
    });
    const fetcher=createFetchWithInterceptor({
      fetchImpl: async () => { throw authError; },
    });

    await expect(fetcher('/api/private')).rejects.toMatchObject({
      statusCode: 400,
      code: 'refresh_token_not_found',
      details: { source: 'gotrue' },
    });
  });

  test('does not invoke unauthorized handling for 403',async () => {
    const onUnauthorized=mock(() => undefined);
    const fetcher=createFetchWithInterceptor({
      fetchImpl: async () => new Response(null,{ status: 403 }),
      onUnauthorized,
    });

    await expect(fetcher('/api/admin')).rejects.toBeInstanceOf(HttpError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  test('uses injected fetch implementation',async () => {
    const { fetchImpl }=mockFetchWithStatus(204);
    const fetcher=createFetchWithInterceptor({ fetchImpl });

    const response=await fetcher('/api/ping');

    expect(response.status).toBe(204);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('redirects to login on browser 401',async () => {
    const { fetchImpl }=mockFetchWithStatus(401);
    const testWindow: TestWindow={
      location: { href: 'https://app.test/current',pathname: '/projects/list' },
    };
    Object.defineProperty(globalThis,'window',{ value: testWindow,configurable: true });
    const fetcher=createFetchWithInterceptor({ fetchImpl,loginPath: '/login' });

    await expect(fetcher('/api/private')).rejects.toThrow('Unauthorized');

    expect(testWindow.location.href).toBe(
      '/login?returnTo=%2Fprojects%2Flist',
    );
  });

  test('throws unauthorized without redirecting when window is unavailable',async () => {
    const { fetchImpl }=mockFetchWithStatus(401);
    Reflect.deleteProperty(globalThis,'window');
    const fetcher=createFetchWithInterceptor({ fetchImpl });

    await expect(fetcher('/api/private')).rejects.toThrow('Unauthorized');
  });

  test('preserves unstructured network failures',async () => {
    const cause=new TypeError('socket closed');
    const fetcher=createFetchWithInterceptor({
      fetchImpl: async () => { throw cause; },
    });

    await expect(fetcher('/api/private')).rejects.toBe(cause);
  });
});
