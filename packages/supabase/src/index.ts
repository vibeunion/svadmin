// @svadmin/supabase — Supabase adapters

export { createSupabaseDataProvider } from './data-provider';
export type { CreateSupabaseDataProviderOptions } from './data-provider';
export { createSupabaseAuthProvider } from './auth-provider';
export type {
  SupabaseAuthProviderOptions,
  SupabaseAuthClient,
  SupabasePermissionResolver,
  SupabasePermissionResolverContext,
} from './auth-provider';
export { SupabaseAuthError } from './auth-contract';
export type { SupabaseAuthUser } from './auth-contract';
export { createSupabaseLiveProvider, SupabaseLiveError } from './live-provider';
export type { SupabaseRealtimeChannel, SupabaseRealtimeClient, SupabaseLiveOptions } from './live-provider';
export { createSupabaseAuditHandler, SupabaseAuditError } from './audit-handler';
export type { SupabaseAuditClient, SupabaseAuditRow } from './audit-handler';
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
  SupaCloudTaskHandle,
  SupaCloudTaskProvider,
  SupaCloudTaskListParams,
  SupaCloudTaskDlqParams,
  SupaCloudTaskSubscribeOptions,
  CreateSupaCloudTaskProviderOptions,
  CreateSupaCloudTaskLiveProviderOptions,
} from './supacloud';
