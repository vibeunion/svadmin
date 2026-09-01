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
  SupaCloudTaskLegacyClient,
  SupaCloudTaskSdkClient,
  SupaCloudTaskRecord,
  SupaCloudSdkTaskRecord,
  SupaCloudSdkTaskSubmitOptions,
  SupaCloudTaskReceipt,
  SupaCloudTaskSnapshot,
  SupaCloudTaskSubscribeState,
  SupaCloudTaskSubscribeOptions,
  SupaCloudSdkTaskWaitOptions,
  SupaCloudSdkTaskClient,
  CreateSupaCloudTaskProviderOptions,
  CreateSupaCloudTaskLiveProviderOptions,
} from './supacloud';
