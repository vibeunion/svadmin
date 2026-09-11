import type { useUpdateMany, useList, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';
export interface UpdateManyState {
  update: ReturnType<typeof useUpdateMany>;
  list: ReturnType<typeof useList>;
}
export interface UpdateManyAuthActions {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
  check: ReturnType<typeof useIsAuthenticated>;
}
