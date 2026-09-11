import type { useUpdate, useList, useOne, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';

export interface UpdateState {
  update: ReturnType<typeof useUpdate>;
  list: ReturnType<typeof useList>;
  one: ReturnType<typeof useOne>;
}

export interface UpdateAuthActions {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
  check: ReturnType<typeof useIsAuthenticated>;
}
