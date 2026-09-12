<script lang="ts">
  import {
    useGetIdentity, useIsAuthenticated, useLogout, useLogin, useUpdateIdentity, useUpdateProfile,
    useRegister, useForgotPassword, useUpdatePassword,
    useOnError,
  } from './auth-hooks.svelte';
  import type { AuthQueryState } from './auth-query.test.types';
  let { onReady }: { onReady: (value: AuthQueryState) => void } = $props();
  const identity = useGetIdentity();
  const check = useIsAuthenticated();
  const logout = useLogout();
  const login = useLogin();
  const register = useRegister();
  const forgotPassword = useForgotPassword();
  const updatePassword = useUpdatePassword();
  const updateIdentity = useUpdateIdentity();
  const updateProfile = useUpdateProfile();
  const onError = useOnError();
  $effect(() => onReady({
    identity, check, logout, login, register, forgotPassword, updatePassword, updateIdentity, updateProfile, onError,
  }));
</script>
