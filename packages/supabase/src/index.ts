// @svadmin/supabase — Supabase adapters

export { createSupabaseDataProvider } from './data-provider';
export type { CreateSupabaseDataProviderOptions } from './data-provider';
export { createSupabaseAuthProvider } from './auth-provider';
export type {
  SupabaseAuthProviderOptions,
  SupabasePermissionResolver,
  SupabasePermissionResolverContext,
} from './auth-provider';
export { createSupabaseLiveProvider } from './live-provider';
export { createSupabaseAuditHandler } from './audit-handler';
export { createSupabaseRpc } from './rpc';
export type {
  SupabaseRpcClient,
  SupabaseRpcOptions,
} from './rpc';
export {
  createSupaCloudTaskProvider,
  createSupaCloudTaskLiveProvider,
} from './supacloud';
export type {
  SupaCloudTaskClient,
  SupaCloudTaskRecord,
  CreateSupaCloudTaskProviderOptions,
  CreateSupaCloudTaskLiveProviderOptions,
} from './supacloud';
