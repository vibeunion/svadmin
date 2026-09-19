import {
  createPermissionAccessControlProvider,
  setAccessControlProvider,
  type AccessControlProvider,
  type PermissionProjectionOptions,
  type PermissionSnapshot,
} from '@svadmin/core';

export type SupabasePermissionSnapshot = PermissionSnapshot;
export type SupabasePermissionAdapterOptions = PermissionProjectionOptions;

/** Convert a backend-verified Supabase/SupAuth snapshot into the UI hint provider. */
export function createSupabasePermissionAccessControlProvider(
  snapshot: unknown,
  options: SupabasePermissionAdapterOptions = {},
): AccessControlProvider {
  return createPermissionAccessControlProvider(snapshot, options);
}

/** Register the adapter in one step; the result remains a UI-only projection. */
export function registerSupabasePermissionAccessControl(
  snapshot: unknown,
  options: SupabasePermissionAdapterOptions = {},
): AccessControlProvider {
  const provider = createSupabasePermissionAccessControlProvider(snapshot, options);
  setAccessControlProvider(provider);
  return provider;
}
