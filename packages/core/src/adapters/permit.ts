/**
 * Permit.io PDP adapter for svadmin AccessControlProvider.
 *
 * Uses Permit's v2 enforcement endpoint. Verify the response contract against
 * your Permit deployment; browser checks are never authorization evidence.
 */
import type { AccessControlProvider, CanParams } from '../permissions.svelte';
import { definedOptions } from '../defined-options';
import { accessControlFailure, decodeCanResult, snapshotCanParams } from '../access-control-contract';

export interface PermitAdapterOptions {
  /** Permit API origin; defaults to `https://api.permit.io`. */
  endpoint?: string;
  token: string;
  /** Permit user key for the signed-in subject. */
  user: (params: CanParams) => string | Promise<string>;
  /** Permit resource type; defaults to the svadmin resource name. */
  resourceType?: (params: CanParams) => string;
  /** Permit resource instance key; defaults to `params.params.id` when present. */
  resourceKey?: (params: CanParams) => string | undefined;
  /** Permit action; defaults to the svadmin action. */
  action?: (params: CanParams) => string;
  context?: (params: CanParams) => Record<string, unknown> | undefined;
  tenant?: string;
  fetch?: typeof fetch;
  providerOptions?: AccessControlProvider['options'];
}

interface PermitResponse {
  allow?: boolean;
  result?: boolean;
  reason?: string;
}

export function createPermitAccessControl(options: PermitAdapterOptions): AccessControlProvider {
  const request = options.fetch ?? globalThis.fetch;
  if (typeof request !== 'function') throw new TypeError('Permit adapter requires fetch');
  if (!options.token) throw new TypeError('Permit adapter requires a token');
  const endpoint = (options.endpoint ?? 'https://api.permit.io').replace(/\/+$/, '');

  return {
    can: async (input) => {
      try {
        const params = snapshotCanParams(input);
        const type = options.resourceType?.(params) ?? params.resource;
        const key = options.resourceKey?.(params) ?? (params.params?.id === undefined ? undefined : String(params.params.id));
        const action = options.action?.(params) ?? params.action;
        const context = options.context?.(params);
        const response = await request(`${endpoint}/api/v2/enforcement/check`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${options.token}`,
          },
          body: JSON.stringify({
            user: { key: await options.user(params) },
            action,
            resource: { type, ...(key === undefined ? {} : { key }) },
            ...(context === undefined ? {} : { context }),
            ...(options.tenant === undefined ? {} : { tenant: options.tenant }),
          }),
        });
        if (!response.ok) throw new Error(`Permit responded ${response.status}`);
        const body = await response.json() as PermitResponse;
        const allowed = body.allow === true || body.result === true;
        return decodeCanResult({
          can: allowed,
          ...definedOptions({ reason: body.reason ?? (allowed ? undefined : `Permit denied ${action} on ${type}`) }),
        });
      } catch (cause) {
        throw accessControlFailure(cause);
      }
    },
    ...definedOptions({ options: options.providerOptions }),
  };
}

export type PermitOptions = PermitAdapterOptions;