import type { useCreate, useList, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';
export interface CreateState {
  create: ReturnType<typeof useCreate>;
  list: ReturnType<typeof useList>;
}
export interface CreateAuthActions {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
  check: ReturnType<typeof useIsAuthenticated>;
}
