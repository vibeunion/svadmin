import type { useImport, useList, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';

export interface ImportState {
  importer: ReturnType<typeof useImport>;
  list: ReturnType<typeof useList>;
}
export interface ImportAuthActions {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
  check: ReturnType<typeof useIsAuthenticated>;
}
