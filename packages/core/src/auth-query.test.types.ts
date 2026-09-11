import type {
  useGetIdentity, useIsAuthenticated, useLogout, useLogin, useUpdateIdentity, useUpdateProfile,
  useRegister, useForgotPassword, useUpdatePassword,
  useOnError,
} from './auth-hooks.svelte';

export interface AuthQueryState {
  identity: ReturnType<typeof useGetIdentity>;
  check: ReturnType<typeof useIsAuthenticated>;
  logout: ReturnType<typeof useLogout>;
  login: ReturnType<typeof useLogin>;
  register: ReturnType<typeof useRegister>;
  forgotPassword: ReturnType<typeof useForgotPassword>;
  updatePassword: ReturnType<typeof useUpdatePassword>;
  updateIdentity: ReturnType<typeof useUpdateIdentity>;
  updateProfile: ReturnType<typeof useUpdateProfile>;
  onError: ReturnType<typeof useOnError>;
}
