import type { ContractSchemas, useInfiniteList } from '@svadmin/core';
import type { useLogin, useLogout } from '../../../core/src/auth-hooks.svelte';

export type InfiniteState = ReturnType<typeof useInfiniteList<ContractSchemas>> & {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
};
