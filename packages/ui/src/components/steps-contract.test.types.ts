import type { UseStepsFormOptions, UseStepsFormReturn, useList, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';

export type StepSettings = Omit<UseStepsFormOptions, 'resource' | 'action' | 'id' | 'steps'>;
export interface StepDefinition { title: string; fields: string[] }
export interface StepState {
  form: UseStepsFormReturn;
  list: ReturnType<typeof useList>;
}
export interface StepAuthActions {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
  check: ReturnType<typeof useIsAuthenticated>;
}
