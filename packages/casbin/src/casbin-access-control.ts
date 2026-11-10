import type { AccessControlProvider, CanParams, CanResult } from '@svadmin/core';

export interface CasbinEnforcerLike {
  enforce: (...args: unknown[]) => Promise<boolean> | boolean;
}

export interface CasbinAdapterOptions {
  /** Initialized casbin enforcer instance */
  enforcer?: CasbinEnforcerLike;
  /** Remote Casbin REST service endpoint URL */
  apiUrl?: string;
  /** Authorization bearer token for remote API */
  token?: string;
  /** Function returning the current subject user or role string, e.g. () => 'alice' */
  user: () => string | Promise<string>;
  /** Optional function returning tenant/domain string for domain-based RBAC */
  domain?: () => string | Promise<string | undefined> | undefined;
  /** Custom action mapping from svadmin actions ('list', 'edit', etc.) to Casbin actions ('read', 'write', etc.) */
  actionMap?: (action: string) => string;
  /** Custom resource mapping from svadmin resource names to Casbin object names */
  resourceMap?: (resource: string) => string;
  /** Custom argument builder if using advanced PERM schemas */
  buildParams?: (ctx: {
    user: string;
    domain?: string | undefined;
    resource: string;
    action: string;
    params?: unknown;
  }) => unknown[] | Promise<unknown[]>;
  fetch?: typeof fetch;
}

const defaultActionMap: Record<string, string> = {
  list: 'read',
  show: 'read',
  create: 'write',
  edit: 'write',
  delete: 'delete',
};

export function createCasbinAccessControl(options: CasbinAdapterOptions): AccessControlProvider {
  const request = options.fetch ?? fetch;

  async function checkPermission(args: unknown[]): Promise<boolean> {
    if (options.enforcer) {
      return Boolean(await options.enforcer.enforce(...args));
    }

    if (!options.apiUrl) {
      throw new Error('Casbin adapter requires either options.enforcer or options.apiUrl');
    }

    const endpoint = `${options.apiUrl.replace(/\/+$/, '')}/api/enforce`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const response = await request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ params: args }),
    });

    if (!response.ok) {
      throw new Error(`Casbin enforce check failed with status ${response.status}`);
    }

    const result = await response.json() as { allowed?: boolean; result?: boolean };
    return Boolean(result.allowed ?? result.result);
  }

  return {
    async can(params: CanParams): Promise<CanResult> {
      try {
        const user = await options.user();
        const domain = options.domain ? await options.domain() : undefined;
        const action = options.actionMap
          ? options.actionMap(params.action)
          : defaultActionMap[params.action] ?? params.action;
        const resource = options.resourceMap
          ? options.resourceMap(params.resource)
          : params.resource;

        let enforceArgs: unknown[];
        if (options.buildParams) {
          enforceArgs = await options.buildParams({
            user,
            domain,
            resource,
            action,
            params: params.params,
          });
        } else if (domain) {
          // Standard domain-based RBAC: enforce(sub, dom, obj, act)
          enforceArgs = [user, domain, resource, action];
        } else {
          // Standard RBAC / ACL: enforce(sub, obj, act)
          enforceArgs = [user, resource, action];
        }

        const allowed = await checkPermission(enforceArgs);

        if (allowed) {
          return { can: true };
        }

        return {
          can: false,
          reason: `Casbin policy denied [${enforceArgs.join(', ')}]`,
        };
      } catch (err: unknown) {
        return {
          can: false,
          reason: err instanceof Error ? err.message : 'Casbin authorization check failed',
        };
      }
    },
  };
}
