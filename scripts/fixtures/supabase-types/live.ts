import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { createSupabaseLiveProvider, type SupabaseRealtimeClient } from '../../../packages/supabase/src/live-provider';

declare const sdk: SupabaseClient;
const client: SupabaseRealtimeClient<RealtimeChannel> = sdk;
const provider = createSupabaseLiveProvider(client);
createSupabaseLiveProvider(sdk);
// @ts-expect-error Arbitrary objects do not implement the SDK lifetime contract.
createSupabaseLiveProvider({});
// @ts-expect-error Channel creation without removal cannot satisfy ownership.
createSupabaseLiveProvider({ channel: sdk.channel });
// @ts-expect-error Optional callbacks cannot be explicitly undefined.
createSupabaseLiveProvider(sdk, { onError: undefined });
provider.subscribe({ resource: 'posts', callback(event) {
  // @ts-expect-error A transport event does not prove an application-specific field type.
  const count: number = event.payload['count'];
  void count;
} });
// @ts-expect-error Only supported mutation actions may be published.
provider.publish?.({ type: 'TRUNCATE', resource: 'posts', payload: {} });
