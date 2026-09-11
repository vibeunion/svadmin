import type { useList, useOne, useMany, useShow, useTable, useInvalidate } from './strict-hooks.svelte';
import type { useLogin, useLogout } from './auth-hooks.svelte';

export type ReadKind = 'list' | 'one' | 'many' | 'show' | 'table';
export interface ReadState {
  query: ReturnType<typeof useList> | ReturnType<typeof useOne> | ReturnType<typeof useMany>
    | ReturnType<typeof useShow> | ReturnType<typeof useTable>['query'];
  invalidate: ReturnType<typeof useInvalidate>;
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
}
