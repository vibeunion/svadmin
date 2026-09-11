import type { SupabaseClient } from '@supabase/supabase-js';
import { Type } from '@sinclair/typebox';
import { checkExact, snapshotPlainData } from '../../../packages/core/src/schema';
import { createSupabaseAuthProvider, type SupabaseAuthClient } from '../../../packages/supabase/src/auth-provider';
import { SupabaseAuthError } from '../../../packages/supabase/src/auth-contract';

declare const sdk: SupabaseClient;
const client: SupabaseAuthClient = sdk;
createSupabaseAuthProvider(client);
createSupabaseAuthProvider(sdk, {
  getPermissions({ client, user }) {
    const sameClient: SupabaseClient = client;
    const id: string = user.id;
    const name: string | null | undefined = user.user_metadata.name;
    // @ts-expect-error User-editable metadata does not carry caller-selected field types.
    const role: string = user.user_metadata['role'];
    void [sameClient, id, name, role];
    return null;
  },
});
// @ts-expect-error Unknown objects cannot masquerade as SDK auth clients.
createSupabaseAuthProvider({});
// @ts-expect-error A partial client without logout/session verification is not accepted.
createSupabaseAuthProvider({ auth: { signInWithPassword: sdk.auth.signInWithPassword } });
// @ts-expect-error Optional callbacks must be omitted rather than explicitly undefined.
createSupabaseAuthProvider(sdk, { getPermissions: undefined });
// @ts-expect-error Error codes cannot contain arbitrary SDK messages.
new SupabaseAuthError('Secret SDK failure details');

const grantsResponse = Type.Object({
  data: Type.Array(Type.Object({ permission: Type.String() })),
  error: Type.Null(),
});
createSupabaseAuthProvider(sdk, {
  async getPermissions({ client }) {
    const response: unknown = await client.from('effective_permission_grants').select('permission');
    const candidate = snapshotPlainData(response);
    if (!checkExact(grantsResponse, candidate)) throw new Error('Permission lookup failed.');
    return candidate.data.map(grant => grant.permission);
  },
});
