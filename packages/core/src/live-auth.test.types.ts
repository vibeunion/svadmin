import type {
  useLogin, useLogout, useRegister, useForgotPassword, useUpdatePassword,
  useUpdateIdentity, useUpdateProfile, useIsAuthenticated, useOnError,
} from './auth-hooks.svelte';

export interface LiveAuthTestActions {
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
  register: ReturnType<typeof useRegister>;
  forgotPassword: ReturnType<typeof useForgotPassword>;
  updatePassword: ReturnType<typeof useUpdatePassword>;
  updateIdentity: ReturnType<typeof useUpdateIdentity>;
  updateProfile: ReturnType<typeof useUpdateProfile>;
  check: ReturnType<typeof useIsAuthenticated>;
  onError: ReturnType<typeof useOnError>;
}
