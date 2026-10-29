/**
 * Refine AccessControlProvider → svadmin AccessControlProvider.
 *
 * Browser checks remain UI hints; the backend must enforce the same policy.
 */
import type { AccessControlProvider, CanParams, CanResult } from '@svadmin/core';
import { decodeCanResult } from '@svadmin/core/contracts';
import { definedOptions } from '@svadmin/core/options';

type RefineCan = (params: { resource: string; action: string; params?: CanParams['params']; meta?: Record<string, unknown> }) => Promise<unknown>;
type RefineAccessSource = {
  can?: RefineCan;
  canMany?: (params: readonly { resource: string; action: string; params?: CanParams['params']; meta?: Record<string, unknown> }[]) => Promise<unknown>;
  options?: unknown;
};

function normalizeParams(params: CanParams) {
  return {
    resource: params.resource,
    action: params.action,
    ...(params.params === undefined ? {} : { params: params.params }),
    ...(params.meta === undefined ? {} : { meta: params.meta }),
  };
}

/** Register the adapter with `setAccessControlProvider` after creation. */
export function createRefineAccessControlAdapter(source: unknown): AccessControlProvider {
  if (typeof source !== 'object' || source === null || typeof (source as RefineAccessSource).can !== 'function') {
    throw new TypeError('createRefineAccessControlAdapter: expected a can() method');
  }
  const input = source as RefineAccessSource;
  const can = input.can as RefineCan;
  const canMany = input.canMany;
  const options = typeof input.options === 'object' && input.options !== null
    ? input.options as NonNullable<AccessControlProvider['options']> : undefined;
  return {
    can: async (params: CanParams): Promise<CanResult> => decodeCanResult(await can.call(input, normalizeParams(params))),
    ...(typeof canMany === 'function' ? {
      canMany: async (params: readonly CanParams[]): Promise<CanResult[]> => {
        const results = await canMany.call(input, params.map(normalizeParams));
        if (!Array.isArray(results) || results.length !== params.length) {
          throw new TypeError('Invalid access control batch response');
        }
        return results.map((result) => decodeCanResult(result));
      },
    } : {}),
    ...definedOptions({ options }),
  };
}