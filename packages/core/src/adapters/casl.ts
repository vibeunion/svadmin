/**
 * CASL adapter for svadmin AccessControlProvider.
 *
 * Converts a CASL `Ability` instance into an `AccessControlProvider`.
 *
 * @example
 * ```ts
 * import { AbilityBuilder, createMongoAbility } from '@casl/ability';
 * import { createCaslAccessControl } from '@svadmin/core/adapters/casl';
 * import { setAccessControlProvider } from '@svadmin/core';
 *
 * const { can, build } = new AbilityBuilder(createMongoAbility);
 * can('read', 'Post');
 * can('create', 'Post');
 * can('manage', 'User');
 * const ability = build();
 *
 * setAccessControlProvider(createCaslAccessControl(ability));
 * ```
 */

import type { AccessControlProvider } from '../permissions.svelte';
import { definedOptions } from '../defined-options';
import { accessControlFailure, decodeCanResult, snapshotCanParams } from '../access-control-contract';
import { HttpError } from '../types';

/** CASL Ability interface (minimal, to avoid hard dependency on @casl/ability) */
interface CaslAbility {
  can: (action: string,subject: string,field?: string) => boolean;
  cannot: (action: string,subject: string,field?: string) => boolean;
}

/**
 * Create an AccessControlProvider from a CASL Ability.
 *
 * @param ability - A CASL Ability instance
 * @param options - Optional configuration
 */
export function createCaslAccessControl(
  ability: CaslAbility,
  options?: AccessControlProvider['options'],
): AccessControlProvider {
  return {
    can: async (input) => {
      try {
        const { resource, action, params: actionParams } = snapshotCanParams(input);
        const field=actionParams?.['field'];
        if(field!==undefined&&typeof field!=='string') {
          throw new HttpError('Invalid access control request', 422, undefined, { code: 'INVALID_ACCESS_CONTROL_INPUT' });
        }
        const allowed=ability.can(action,resource,field);
        return decodeCanResult({
          can: allowed,
          ...definedOptions({
            reason: allowed? undefined:`Cannot "${action}" on "${resource}"${field? ` (field: ${field})`:''}`,
          }),
        });
      } catch (error) {
        throw accessControlFailure(error);
      }
    },
    ...definedOptions({ options }),
  };
}
