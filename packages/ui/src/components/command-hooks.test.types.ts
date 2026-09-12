import { Type } from '@sinclair/typebox';
import { defineCommand, type useCustom, type useCustomMutation, type useLogin,
  type useLogout, type useIsAuthenticated } from '@svadmin/core';

export const commandInput = Type.Object({ filter: Type.Object({ year: Type.Number() }), labels: Type.Array(Type.String()) });
export const commandOutput = Type.Object({ rows: Type.Array(Type.Object({ count: Type.Number() })) });
export const readCommand = defineCommand('report', {
  url: '/report', method: 'get', input: commandInput, output: commandOutput,
});
export const writeCommand = defineCommand('report', {
  url: '/report', method: 'post', input: commandInput, output: commandOutput,
});
export interface CommandSettings {
  readCommand?: typeof readCommand;
  writeCommand?: typeof writeCommand;
  input?: { filter: { year: number }; labels: string[] };
  dataProviderName?: string;
  enabled?: boolean;
  staleTime?: number;
}
export interface CommandState {
  query: ReturnType<typeof useCustom<typeof commandInput, typeof commandOutput>>['query'];
  mutation: ReturnType<typeof useCustomMutation<typeof commandInput, typeof commandOutput>>['mutation'];
}
export interface CommandAuthActions {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
  check: ReturnType<typeof useIsAuthenticated>;
}
