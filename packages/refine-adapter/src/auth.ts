/**
 * Refine AuthProvider → svadmin AuthProvider.
 *
 * Refine's auth contract is structurally close to svadmin's, so this adapter only
 * normalizes results through the same validated decoders used by first-party
 * providers. Optional methods are forwarded only when the source implements them.
 */
import type {
  AuthActionResult,
  AuthErrorResult,
  AuthProvider,
  CheckResult,
  Identity,
} from '@svadmin/core';
import {
  decodeAuthAction,
  decodeAuthCheck,
  decodeAuthErrorResult,
  decodeIdentity,
} from '@svadmin/core/contracts';

type RefineAuthSource = Partial<Record<
  | 'login' | 'logout' | 'check' | 'getIdentity' | 'getPermissions'
  | 'register' | 'forgotPassword' | 'updatePassword' | 'onError',
  (...args: never[]) => unknown
>>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function method<T extends (...args: never[]) => unknown>(source: RefineAuthSource, name: keyof RefineAuthSource): T | undefined {
  const value = source[name];
  return typeof value === 'function' ? value as T : undefined;
}

function actionResult(value: unknown): AuthActionResult {
  if (isObject(value) && value['success'] === true) {
    return decodeAuthAction({
      success: true,
      ...(typeof value['redirectTo'] === 'string' ? { redirectTo: value['redirectTo'] } : {}),
    });
  }
  const rawError = isObject(value) ? value['error'] : undefined;
  const error = isObject(rawError)
    ? {
      message: typeof rawError['message'] === 'string' ? rawError['message'] : 'Authentication failed',
      ...(typeof rawError['name'] === 'string' ? { name: rawError['name'] } : {}),
    }
    : { message: 'Authentication failed' };
  return decodeAuthAction({ success: false, error });
}

function call<A extends unknown[], R>(source: RefineAuthSource, name: keyof RefineAuthSource, args: A): Promise<R> {
  const fn = method<(...input: A) => Promise<R> | R>(source, name);
  if (!fn) throw new TypeError(`Refine AuthProvider is missing "${String(name)}"`);
  return Promise.resolve(fn.apply(source, args));
}

/** Validate that the source exposes the methods svadmin requires before mounting it. */
export function createRefineAuthAdapter(source: unknown): AuthProvider {
  if (!isObject(source) || typeof source['login'] !== 'function' ||
    typeof source['logout'] !== 'function' || typeof source['check'] !== 'function' ||
    typeof source['getIdentity'] !== 'function') {
    throw new TypeError('createRefineAuthAdapter: expected login, logout, check, and getIdentity');
  }
  const input = source as RefineAuthSource;
  const register = method(input, 'register');
  const forgotPassword = method(input, 'forgotPassword');
  const updatePassword = method(input, 'updatePassword');
  const getPermissions = method(input, 'getPermissions');
  const onError = method(input, 'onError');

  return {
    login: async (params): Promise<AuthActionResult> => actionResult(await call(input, 'login', [params])),
    logout: async (params): Promise<AuthActionResult> => actionResult(await call(input, 'logout', [params ?? {}])),
    check: async (params): Promise<CheckResult> => decodeAuthCheck(await call(input, 'check', [params ?? {}])),
    getIdentity: async (): Promise<Identity | null> => decodeIdentity(await call(input, 'getIdentity', [])),
    ...(register ? { register: async (params: Record<string, unknown>) => actionResult(await call(input, 'register', [params])) } : {}),
    ...(forgotPassword ? { forgotPassword: async (params: Record<string, unknown>) => actionResult(await call(input, 'forgotPassword', [params])) } : {}),
    ...(updatePassword ? { updatePassword: async (params: Record<string, unknown>) => actionResult(await call(input, 'updatePassword', [params])) } : {}),
    ...(getPermissions ? { getPermissions: async (params?: Record<string, unknown>) => call(input, 'getPermissions', [params]) } : {}),
    ...(onError ? { onError: async (error: unknown): Promise<AuthErrorResult> => decodeAuthErrorResult(await call(input, 'onError', [error])) } : {}),
  };
}