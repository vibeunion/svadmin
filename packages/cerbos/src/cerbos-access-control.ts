import type { AccessControlProvider, CanParams, CanResult } from '@svadmin/core';

export interface CerbosPrincipal {
  id: string;
  roles: string[];
  attr?: Record<string, unknown>;
}

export interface CerbosResource {
  kind: string;
  id: string;
  attr?: Record<string, unknown>;
}

export interface CerbosCheckResponseLike {
  isAllowed(action: string): boolean;
}

export interface CerbosClientLike {
  checkResource(params: {
    principal: CerbosPrincipal;
    resource: CerbosResource;
    actions: string[];
  }): Promise<CerbosCheckResponseLike>;
}

export interface CerbosAccessControlOptions {
  /** Initialized Cerbos Client instance */
  client?: CerbosClientLike;
  /** Cerbos PDP HTTP API base URL (e.g. 'http://localhost:3592') */
  apiUrl?: string;
  /** Optional bearer or access token for PDP communication */
  token?: string;
  /** Resolver returning current principal credentials and attributes */
  principal: () => CerbosPrincipal | Promise<CerbosPrincipal>;
  /** Optional custom fetch implementation */
  fetch?: typeof fetch;
}

interface CerbosHttpCheckResponse {
  results?: Array<{
    actions?: Record<string, 'EFFECT_ALLOW' | 'EFFECT_DENY'>;
  }>;
}

/**
 * Creates a Cerbos PDP AccessControl adapter for svadmin.
 * Evaluates fine-grained authorization against Cerbos policies.
 */
export function createCerbosAccessControl(
  options: CerbosAccessControlOptions,
): AccessControlProvider {
  const request = options.fetch ?? fetch;

  async function checkViaHttp(
    principal: CerbosPrincipal,
    resource: CerbosResource,
    action: string,
  ): Promise<boolean> {
    if (!options.apiUrl) {
      throw new Error('Cerbos adapter requires either options.client or options.apiUrl');
    }

    const endpoint = `${options.apiUrl.replace(/\/+$/, '')}/api/check/resources`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const bodyPayload = {
      principal: {
        id: principal.id,
        roles: principal.roles,
        attr: principal.attr ?? {},
      },
      resources: [
        {
          resource: {
            kind: resource.kind,
            id: resource.id,
            attr: resource.attr ?? {},
          },
          actions: [action],
        },
      ],
    };

    const res = await request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      throw new Error(`Cerbos PDP responded with status ${res.status}`);
    }

    const data = (await res.json()) as CerbosHttpCheckResponse;
    const actionResult = data.results?.[0]?.actions?.[action];
    return actionResult === 'EFFECT_ALLOW';
  }

  return {
    async can(params: CanParams): Promise<CanResult> {
      try {
        const principal = await options.principal();
        const resourceId = params.params?.id !== undefined ? String(params.params.id) : '*';
        const resource: CerbosResource = {
          kind: params.resource,
          id: resourceId,
        };
        if (params.params && typeof params.params === 'object') {
          resource.attr = params.params;
        }

        let allowed = false;

        if (options.client) {
          const checkRes = await options.client.checkResource({
            principal,
            resource,
            actions: [params.action],
          });
          allowed = checkRes.isAllowed(params.action);
        } else {
          allowed = await checkViaHttp(principal, resource, params.action);
        }

        if (allowed) {
          return { can: true };
        }

        return {
          can: false,
          reason: `Cerbos policy denied action "${params.action}" on resource "${params.resource}"`,
        };
      } catch {
        return {
          can: false,
          reason: 'Cerbos authorization error',
        };
      }
    },
  };
}
