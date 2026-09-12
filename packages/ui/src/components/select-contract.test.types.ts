import type { ContractSchemas, UseSelectOptions, useSelect } from '@svadmin/core';
import type { useLogin, useLogout } from '../../../core/src/auth-hooks.svelte';

export type SelectSettings = Partial<Omit<UseSelectOptions<ContractSchemas>, 'resource'>>;
export type SelectState = ReturnType<typeof useSelect> & {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
};
