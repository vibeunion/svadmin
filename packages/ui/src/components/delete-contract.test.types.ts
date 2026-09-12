import type { useDelete, useList, useOne, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';
export interface DeleteState {
  remove: ReturnType<typeof useDelete>;
  list: ReturnType<typeof useList>;
  one: ReturnType<typeof useOne>;
}
export interface DeleteAuthActions {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
  check: ReturnType<typeof useIsAuthenticated>;
}
