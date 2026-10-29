/**
 * Cerbos PDP adapter for svadmin AccessControlProvider.
 *
 * Uses the Cerbos REST API (`POST /api/check/resources`). Browser checks remain
 * UI hints; the backend must still enforce the same policy.
 */
import type { AccessControlProvider, CanParams } from '../permissions.svelte';
import { definedOptions } from '../defined-options';
import { accessControlFailure, decodeCanResult, snapshotCanParams } from '../access-control-contract';

export interface CerbosPrincipal {
  id: string;
  roles?: string[];
  attributes?: Record<string, unknown>;
}

export interface CerbosAdapterOptions {
  /** Cerbos PDP origin, for example `https://cerbos.internal:3592`. */
  endpoint: string;
  principal: () => CerbosPrincipal | Promise<CerbosPrincipal>;
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  /** Defaults to the svadmin resource name. */
  resourceKind?: (params: CanParams) => string;
  /** Defaults to `params.params.id` or `*`. */
  resourceId?: (params: CanParams) => string;
  fetch?: typeof fetch;
  providerOptions?: AccessControlProvider['options'];
}

interface CerbosResponse {
  results?: Array<{
    actions?: Record<string, string>;
    isAllowed?: boolean;
    meta?: { effectivePolicies?: unknown };
  }>;
}

export function createCerbosAccessControl(options: CerbosAdapterOptions): AccessControlProvider {
  const request = options.fetch ?? globalThis.fetch;
  if (typeof request !== 'function') throw new TypeError('Cerbos adapter requires fetch');
  const endpoint = options.endpoint.replace(/\/+$/, '');
  if (!endpoint) throw new TypeError('Cerbos adapter requires an endpoint');

  return {
    can: async (input) => {
      try {
        const params = snapshotCanParams(input);
        const principal = await options.principal();
        const id = options.resourceId?.(params) ?? String(params.params?.id ?? '*');
        const kind = options.resourceKind?.(params) ?? params.resource;
        const headers: Record<string, string> = {
          'content-type': 'application/json',
          ...(typeof options.headers === 'function' ? await options.headers() : options.headers ?? {}),
        };
        const response = await request(`${endpoint}/api/check/resources`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            requestId: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
            principal: {
              id: principal.id,
              ...(principal.roles === undefined ? {} : { roles: principal.roles }),
              ...(principal.attributes === undefined ? {} : { attr: principal.attributes }),
            },
            resources: [{
              resource: {
                kind,
                id,
                ...(params.meta === undefined ? {} : { attr: params.meta }),
              },
              actions: [params.action],
            }],
          }),
        });
        if (!response.ok) throw new Error(`Cerbos responded ${response.status}`);
        const body = await response.json() as CerbosResponse;
        const result = body.results?.[0];
        if (!result) throw new Error('Cerbos returned no result');
        const allowed = result.isAllowed === true || result.actions?.[params.action] === 'EFFECT_ALLOW';
        return decodeCanResult({
          can: allowed,
          ...definedOptions({ reason: allowed ? undefined : `Cerbos denied ${params.action} on ${kind}` }),
        });
      } catch (cause) {
        throw accessControlFailure(cause);
      }
    },
    ...definedOptions({ options: options.providerOptions }),
  };
}

export type CerbosOptions = CerbosAdapterOptions;