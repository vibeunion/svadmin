import type { AccessControlProvider, CanParams, CanResult } from '@svadmin/core';

export interface OpenFgaTuple {
  user: string;
  relation: string;
  object: string;
}

export interface OpenFgaClientLike {
  check: (tuple: OpenFgaTuple) => Promise<{ allowed?: boolean }>;
}

export interface OpenFgaAdapterOptions {
  /** Initialized OpenFGA client instance */
  client?: OpenFgaClientLike;
  /** OpenFGA HTTP endpoint if calling via HTTP directly */
  apiUrl?: string;
  /** OpenFGA Store ID */
  storeId?: string;
  /** Authorization bearer token */
  token?: string;
  /** Function returning the current subject user string, e.g. () => 'user:anne' */
  user: () => string | Promise<string>;
  /** Map svadmin action (e.g. 'list', 'edit', 'delete') to OpenFGA relation */
  relationMap?: (action: string) => string;
  /** Map svadmin resource name to OpenFGA object type */
  objectTypeMap?: (resource: string) => string;
  fetch?: typeof fetch;
}

const defaultActionToRelation: Record<string, string> = {
  list: 'viewer',
  show: 'viewer',
  edit: 'editor',
  create: 'creator',
  delete: 'owner',
};

export function createOpenFgaAccessControl(options: OpenFgaAdapterOptions): AccessControlProvider {
  const request = options.fetch ?? fetch;

  async function checkPermission(tuple: OpenFgaTuple): Promise<boolean> {
    if (options.client) {
      const res = await options.client.check(tuple);
      return Boolean(res.allowed);
    }

    if (!options.apiUrl || !options.storeId) {
      throw new Error('OpenFGA adapter requires either options.client or options.apiUrl and options.storeId');
    }

    const endpoint = `${options.apiUrl.replace(/\/+$/, '')}/stores/${options.storeId}/check`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const response = await request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tuple_key: tuple }),
    });

    if (!response.ok) {
      throw new Error(`OpenFGA check failed with status ${response.status}`);
    }

    const body = await response.json() as { allowed?: boolean };
    return Boolean(body.allowed);
  }

  return {
    async can(params: CanParams): Promise<CanResult> {
      try {
        const user = await options.user();
        const relation = options.relationMap
          ? options.relationMap(params.action)
          : defaultActionToRelation[params.action] ?? params.action;

        const objectType = options.objectTypeMap
          ? options.objectTypeMap(params.resource)
          : params.resource;

        const recordId = (params.params as { id?: string | number } | undefined)?.id ?? '*';
        const object = `${objectType}:${recordId}`;

        const allowed = await checkPermission({
          user,
          relation,
          object,
        });

        if (allowed) {
          return { can: true };
        }
        return {
          can: false,
          reason: `OpenFGA denied ${params.action} on ${object}`,
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        return {
          can: false,
          reason: error.message,
        };
      }
    },
  };
}
