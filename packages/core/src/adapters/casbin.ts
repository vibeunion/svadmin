/**
 * Casbin adapter for svadmin AccessControlProvider.
 *
 * Converts a Casbin `Enforcer` instance into an `AccessControlProvider`.
 *
 * @example
 * ```ts
 * import { newEnforcer } from 'casbin';
 * import { createCasbinAccessControl } from '@svadmin/core/adapters/casbin';
 * import { setAccessControlProvider } from '@svadmin/core';
 *
 * const enforcer = await newEnforcer('model.conf', 'policy.csv');
 * const currentUser = 'alice';
 *
 * setAccessControlProvider(
 *   createCasbinAccessControl(enforcer, { getUser: () => currentUser })
 * );
 * ```
 */

import type { AccessControlProvider } from '../permissions.svelte';
import { definedOptions } from '../defined-options';
import { accessControlFailure, decodeCanResult, snapshotCanParams } from '../access-control-contract';
import { HttpError } from '../types';

/** Casbin Enforcer interface (minimal, to avoid hard dependency on casbin) */
interface CasbinEnforcer {
  enforce: (...args: string[]) => Promise<boolean>;
}

export interface CasbinAdapterOptions {
  /** Function to get the current user/subject for enforcement. */
  getUser: () => string;
  /** Provider-level options */
  providerOptions?: AccessControlProvider['options'];
}

/**
 * Create an AccessControlProvider from a Casbin Enforcer.
 *
 * Uses the standard (sub, obj, act) enforcement model:
 * - sub = current user (from `getUser()`)
 * - obj = resource name
 * - act = action
 *
 * @param enforcer - A Casbin Enforcer instance
 * @param options - Configuration with user getter
 */
export function createCasbinAccessControl(
  enforcer: CasbinEnforcer,
  options: CasbinAdapterOptions,
): AccessControlProvider {
  return {
    can: async (input) => {
      try {
        const { resource, action } = snapshotCanParams(input);
        const user=options.getUser();
        if (typeof user !== 'string') {
          throw new HttpError('Invalid access control provider', 502, undefined, { code: 'INVALID_ACCESS_CONTROL_PROVIDER' });
        }
        const allowed=await enforcer.enforce(user,resource,action);
        return decodeCanResult({
          can: allowed,
          ...definedOptions({
            reason: allowed? undefined:`User "${user}" cannot "${action}" on "${resource}"`,
          }),
        });
      } catch (error) {
        throw accessControlFailure(error);
      }
    },
    ...definedOptions({ options: options.providerOptions }),
  };
}
