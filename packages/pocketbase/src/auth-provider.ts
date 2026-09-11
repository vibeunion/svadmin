import { Type } from '@sinclair/typebox';
import { definedOptions } from '@svadmin/core/options';
import type { AuthProvider, Identity, AuthActionResult, CheckResult } from '@svadmin/core';
import { authRecord, collectionName, decode, nonempty, PocketBaseBoundaryError } from './boundary';

export interface PocketBaseAuthClient {
  readonly authStore: {
    readonly isValid: unknown;
    readonly record: unknown;
    readonly token: unknown;
    clear(): void;
  };
  collection(name: string): {
    authWithPassword(email: string, password: string): Promise<unknown>;
    create(data: Record<string, unknown>): Promise<unknown>;
    requestPasswordReset(email: string): Promise<unknown>;
    confirmPasswordReset(token: string, password: string, passwordConfirm: string): Promise<unknown>;
  };
}

export interface PocketBaseAuthOptions {
  pb: PocketBaseAuthClient;
}

const collection = Type.Optional(collectionName);
const username = Type.Optional(nonempty);
const credentials = Type.Object({ email: nonempty, password: nonempty, username, collection }, { additionalProperties: false });
const registration = Type.Object({
  email: nonempty, password: nonempty, username,
  confirmPassword: Type.Optional(nonempty), name: Type.Optional(Type.String()), collection,
}, { additionalProperties: false });
const resetRequest = Type.Object({ email: nonempty, username, collection }, { additionalProperties: false });
const resetConfirmation = Type.Object({
  token: nonempty, password: nonempty, confirmPassword: Type.Optional(nonempty), collection,
}, { additionalProperties: false });
const authResponse = Type.Object({ record: authRecord, token: nonempty });
const session = Type.Object({ isValid: Type.Literal(true), record: authRecord, token: nonempty });
const confirmed = Type.Literal(true);

function validateIdentifier(input: { email: string; username?: string }): void {
  if (input.username !== undefined && input.username !== input.email) throw new PocketBaseBoundaryError('input');
}

function failure(operation: string, error: unknown, write = false): AuthActionResult {
  if (error instanceof PocketBaseBoundaryError) {
    return {
      success: false,
      error: {
        name: write && error.phase === 'response' ? 'WRITE_OUTCOME_UNKNOWN' : 'INVALID_AUTH_DATA',
        message: write && error.phase === 'response'
          ? `${operation} response was invalid; the operation may have succeeded.`
          : error.message,
      },
    };
  }
  return { success: false, error: { message: `${operation} failed.` } };
}

/** SDK return values and auth-store records enter the application only after validation. */
export function createPocketBaseAuthProvider({ pb }: PocketBaseAuthOptions): AuthProvider {
  function currentRecord() {
    try {
      const isValid: unknown = pb.authStore.isValid;
      if (isValid === false) return null;
      return decode(session, {
        isValid, record: pb.authStore.record, token: pb.authStore.token,
      }, 'session').record;
    } catch {
      pb.authStore.clear();
      return null;
    }
  }

  return {
    async login(params): Promise<AuthActionResult> {
      try {
        const input = decode(credentials, params, 'input');
        validateIdentifier(input);
        const result: unknown = await pb.collection(input.collection ?? 'users')
          .authWithPassword(input.email, input.password);
        try {
          decode(authResponse, result, 'response');
        } catch (error) {
          pb.authStore.clear();
          throw error;
        }
        return { success: true, redirectTo: '/' };
      } catch (error) {
        return failure('Login', error);
      }
    },

    async logout(): Promise<AuthActionResult> {
      try {
        pb.authStore.clear();
        return { success: true, redirectTo: '/login' };
      } catch (error) {
        return failure('Logout', error);
      }
    },

    async check(): Promise<CheckResult> {
      return currentRecord()
        ? { authenticated: true }
        : { authenticated: false, redirectTo: '/login', logout: true };
    },

    async getIdentity(): Promise<Identity | null> {
      const record = currentRecord();
      if (!record) return null;
      return definedOptions({
        id: record.id,
        name: record.name || record.email?.split('@')[0] || record.id,
        email: record.email,
        avatar: record.avatar,
      });
    },

    async register(params): Promise<AuthActionResult> {
      try {
        const input = decode(registration, params, 'input');
        validateIdentifier(input);
        if (input.confirmPassword !== undefined && input.confirmPassword !== input.password) {
          throw new PocketBaseBoundaryError('input');
        }
        const result: unknown = await pb.collection(input.collection ?? 'users').create(definedOptions({
          email: input.email, password: input.password,
          passwordConfirm: input.confirmPassword ?? input.password, name: input.name,
        }));
        decode(authRecord, result, 'response');
        return { success: true, redirectTo: '/login' };
      } catch (error) {
        return failure('Registration', error, true);
      }
    },

    async forgotPassword(params): Promise<AuthActionResult> {
      try {
        const input = decode(resetRequest, params, 'input');
        validateIdentifier(input);
        const result: unknown = await pb.collection(input.collection ?? 'users').requestPasswordReset(input.email);
        decode(confirmed, result, 'response');
        return { success: true };
      } catch (error) {
        return failure('Password reset request', error, true);
      }
    },

    async updatePassword(params): Promise<AuthActionResult> {
      try {
        const input = decode(resetConfirmation, params, 'input');
        if (input.confirmPassword !== undefined && input.confirmPassword !== input.password) {
          throw new PocketBaseBoundaryError('input');
        }
        const result: unknown = await pb.collection(input.collection ?? 'users').confirmPasswordReset(
          input.token, input.password, input.confirmPassword ?? input.password,
        );
        decode(confirmed, result, 'response');
        return { success: true, redirectTo: '/' };
      } catch (error) {
        return failure('Password reset', error, true);
      }
    },

    async onError(error): Promise<{ redirectTo?: string; logout?: boolean }> {
      // SDK errors are class instances. Only the numeric status is projected.
      let status: unknown;
      try {
        const descriptor = typeof error === 'object' && error !== null
          ? Object.getOwnPropertyDescriptor(error, 'status') : undefined;
        status = descriptor && 'value' in descriptor ? descriptor.value : undefined;
      } catch {
        return {};
      }
      if (status === 401 || status === 403) {
        pb.authStore.clear();
        return { redirectTo: '/login', logout: true };
      }
      return {};
    },
  };
}
