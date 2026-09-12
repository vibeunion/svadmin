import type { useCreateMany, useList, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';
export interface CreateManyState {
  create: ReturnType<typeof useCreateMany>;
  list: ReturnType<typeof useList>;
}
export interface CreateManyAuthActions {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
  check: ReturnType<typeof useIsAuthenticated>;
}
