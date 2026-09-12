import type { useForm, useList, useLogin, useLogout, useIsAuthenticated, ContractSchemas, ContractFormAction } from '@svadmin/core';

export type FormSettings = Omit<Parameters<typeof useForm<ContractSchemas, ContractFormAction>>[0], 'resource' | 'action' | 'id'>;
export interface FormState {
  form: ReturnType<typeof useForm>;
  list: ReturnType<typeof useList>;
}
export interface FormAuthActions {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
  check: ReturnType<typeof useIsAuthenticated>;
}
