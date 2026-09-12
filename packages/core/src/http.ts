/**
 * HTTP fetch utilities with CSRF protection, automatic 401 redirects, and structured error semantics.
 */

import { HttpError,type ValidationErrors } from './types';
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { definedOptions } from './defined-options';

export interface FetchWithInterceptorOptions {
  /** Login path used for 401 redirects. */
  loginPath?: string;
  /** Error message used when a 403 response has no server-provided message. */
  forbiddenMessage?: string;
  /** Whether to add the X-Requested-With header automatically for CSRF protection. */
  csrfProtection?: boolean;
  /** Custom fetch implementation for testing or SSR injection. */
  fetchImpl?: FetchWithInterceptor;
  /** Custom 401 redirect handler for testing or SSR injection. */
  onUnauthorized?: (loginPath: string,returnTo: string) => void;
}

export type FetchWithInterceptor=(url: string,init?: RequestInit) => Promise<Response>;

const DEFAULT_OPTIONS: Required<Omit<FetchWithInterceptorOptions,'fetchImpl'|'onUnauthorized'>>&{
  fetchImpl: FetchWithInterceptor;
  onUnauthorized: (loginPath: string,returnTo: string) => void;
}={
  loginPath: '/auth/login',
  forbiddenMessage: 'Forbidden: 该操作已被安全策略拒绝',
  csrfProtection: true,
  get fetchImpl() {
    if(typeof globalThis!=='undefined'&&typeof globalThis.fetch==='function') {
      return (url: string,init?: RequestInit) => globalThis.fetch(url,init);
    }
    return async () => {
      throw new Error('No fetch implementation found. Pass fetchImpl in options.');
    };
  },
  onUnauthorized: (loginPath,returnTo) => {
    if(typeof window!=='undefined') {
      window.location.href=`${loginPath}?returnTo=${returnTo}`;
    }
  },
};

function asRecord(value: unknown): Record<string,unknown>|null {
  return Value.Check(Type.Record(Type.String(),Type.Unknown()),value)? value:null;
}

function asStructuredHttpError(error: unknown): HttpError|null {
  const record=asRecord(error);
  const status=record?.['statusCode'];
  if(!record||typeof status!=='number'||!Number.isInteger(status)||status<100||status>599) return null;
  const message=typeof record['message']==='string'? record['message']:'HTTP request failed';
  const errors=asValidationErrors(record['errors']);
  return new HttpError(message,status,errors,definedOptions({
    code: typeof record['code']==='string'? record['code']:undefined,
    details: record['details'],
    body: record['body'],
    cause: error,
  }));
}

function firstString(...values: unknown[]): string|undefined {
  return values.find((value): value is string => typeof value==='string');
}

function asValidationErrors(value: unknown): ValidationErrors|undefined {
  const schema=Type.Record(Type.String(),Type.Union([Type.String(),Type.Array(Type.String())]));
  return Value.Check(schema,value)? value:undefined;
}

async function readErrorBody(response: Response): Promise<unknown> {
  const text=await response.text();
  if(!text) return undefined;
  try {
    const parsed: unknown=JSON.parse(text);
    return parsed;
  } catch {
    return text;
  }
}

async function createResponseError(
  response: Response,
  forbiddenMessage: string,
): Promise<HttpError> {
  const body=await readErrorBody(response);
  const record=asRecord(body);
  const nestedError=asRecord(record?.['error']);
  const code=response.headers.get('X-Svadmin-Auth-Retry')==='exhausted'
    ? 'auth_retry_exhausted'
    :firstString(
      record?.['code'],
      record?.['error_code'],
      nestedError?.['code'],
      nestedError?.['error_code'],
      record?.['error'],
    );
  const details=record?.['details']??nestedError?.['details'];
  const message=firstString(
    record?.['message'],
    nestedError?.['message'],
    record?.['error_description'],
    nestedError?.['error_description'],
    body,
  )??(response.status===401? 'Unauthorized':forbiddenMessage);

  return new HttpError(
    message,
    response.status,
    asValidationErrors(record?.['errors']??nestedError?.['errors']),
    definedOptions({
      code,
      details,
      body,
    }),
  );
}

/**
 * Fetch with interceptors. Core owns error semantics; the auth provider handles refresh and request replay.
 */
export function createFetchWithInterceptor(
  options: FetchWithInterceptorOptions={},
): FetchWithInterceptor {
  const opts={ ...DEFAULT_OPTIONS,...options };

  return async (url: string,init: RequestInit={}): Promise<Response> => {
    const headers=new Headers(init.headers||{});
    if(
      opts.csrfProtection
      &&init.method
      &&['POST','PUT','DELETE','PATCH'].includes(init.method.toUpperCase())
    ) {
      headers.set('X-Requested-With','XMLHttpRequest');
    }

    let response: Response;
    try {
      response=await opts.fetchImpl(url,{ ...init,headers });
    } catch(error) {
      if(error instanceof HttpError) throw error;
      const structuredError=asStructuredHttpError(error);
      if(structuredError) throw structuredError;
      throw error;
    }

    if(response.ok||(response.status!==401&&response.status!==403)) {
      return response;
    }

    const httpError=await createResponseError(response,opts.forbiddenMessage);
    if(response.status===401) {
      // Some test/embedded environments expose a partial `window` without
      // `location`; only build a returnTo when both are available.
      const returnTo=typeof window!=='undefined'&&typeof window.location?.pathname==='string'
        ? encodeURIComponent(window.location.pathname)
        :'';
      try {
        opts.onUnauthorized(opts.loginPath,returnTo);
      } catch {
        // Redirect adapter failures must not replace the server's structured 401 error.
      }
    }
    throw httpError;
  };
}

/** Convenient global instance using the default configuration. */
export const fetchWithInterceptor=createFetchWithInterceptor();
