import type { useLogin, useLogout } from './auth-hooks.svelte';
import type { UseCanResult } from './useCan';

export interface AccessQueryState {
  readonly can: UseCanResult;
  readonly login: ReturnType<typeof useLogin>;
  readonly logout: ReturnType<typeof useLogout>;
}
