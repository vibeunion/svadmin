import type { SupabaseClient } from '@supabase/supabase-js';
import {
  withValidatedAuditProvider, type AuditLogProvider, type AuditLogTransport,
  type AuditCreateParams, type AuditEntry,
} from '../../../packages/core/src/audit';
import { snapshotPlainData, type JsonValue } from '../../../packages/core/src/schema';
import {
  createSupabaseAuditHandler, type SupabaseAuditClient,
} from '../../../packages/supabase/src/audit-handler';

type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string; resource: string | null; record_id: string | null;
          user_id: string | null; details: JsonValue; created_at: string;
        };
        Insert: {
          action: string; resource?: string | null; record_id: string | null;
          user_id?: string | null; details: JsonValue; created_at: string;
        };
        Update: { details?: JsonValue };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
  };
};

declare const sdk: SupabaseClient;
declare const typedSdk: SupabaseClient<Database>;
const client: SupabaseAuditClient = sdk;
createSupabaseAuditHandler(client);
createSupabaseAuditHandler(typedSdk);
// @ts-expect-error Invalid JSON column contracts cannot satisfy the audit transport.
createSupabaseAuditHandler({ from: () => ({ insert: async (_row: { details: string }) => null }) });
// @ts-expect-error A synchronous insert result cannot confirm an asynchronous write.
createSupabaseAuditHandler({ from: () => ({ insert: () => null }) });

declare const transport: AuditLogTransport;
const provider: AuditLogProvider = withValidatedAuditProvider(transport);
const params: AuditCreateParams = { timestamp: '2026-09-09T00:00:00Z', action: 'login' };
const record: Promise<AuditEntry> = provider.create(params);
// @ts-expect-error Audit entries are append-only.
provider.update(params);
// @ts-expect-error Creation requires a validated timestamp.
provider.create({ action: 'login' });
// @ts-expect-error Explicit undefined is not an omitted optional field.
provider.create({ ...params, resource: undefined });
// @ts-expect-error Caller-selected return types are not accepted.
provider.get<{ secret: string }>({});
// @ts-expect-error Unknown transport responses are not validated entries.
const unsafe: AuditLogProvider = transport;
const json: JsonValue = snapshotPlainData({ event: 'login' });
void [record, unsafe, json];
