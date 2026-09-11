<script lang="ts">
  import { useCan, type UseCanOptions } from './useCan';
  import { useLogin, useLogout } from './auth-hooks.svelte';
  import type { AccessQueryState } from './useCan.test.types';

  let { options, onReady }: {
    options: UseCanOptions;
    onReady: (value: AccessQueryState) => void;
  } = $props();
  const can = useCan(() => options);
  const login = useLogin({ successNotification: false, errorNotification: false });
  const logout = useLogout();
  $effect(() => onReady({ can, login, logout }));
</script>
