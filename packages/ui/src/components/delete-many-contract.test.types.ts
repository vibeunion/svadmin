import type { useDeleteMany, useList, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';
export interface DeleteManyState {
  remove: ReturnType<typeof useDeleteMany>;
  list: ReturnType<typeof useList>;
}
export interface DeleteManyAuthActions {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
  check: ReturnType<typeof useIsAuthenticated>;
}
