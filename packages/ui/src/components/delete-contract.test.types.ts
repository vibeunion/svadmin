import type { ContractSchemas, useDelete, useList, useOne, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';
export interface DeleteState {
  remove: ReturnType<typeof useDelete<ContractSchemas>>;
  list: ReturnType<typeof useList<ContractSchemas>>;
  one: ReturnType<typeof useOne<ContractSchemas>>;
}
export interface DeleteAuthActions {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
  check: ReturnType<typeof useIsAuthenticated>;
}
