<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { provideAdminContext } from './context.svelte';
  import type { DataProvider, ResourceDefinition, NotificationProvider, AuditLogProvider, LiveProvider, AuthProvider } from './index';
  import Probe, { type FeedbackOperation, type FeedbackState } from './mutation-feedback.test-probe.svelte';

  let { provider, resources, queryClient, operation, notification = null, audit, live, auth = null, ids = [1],
    silentSuccess = false, silentError = false, onReady, onSuccess, onError, onSettled }: {
    provider: DataProvider;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    operation: FeedbackOperation;
    notification?: NotificationProvider | null;
    audit: AuditLogProvider;
    live: LiveProvider;
    auth?: AuthProvider | null;
    ids?: number[];
    silentSuccess?: boolean;
    silentError?: boolean;
    onReady: (state: FeedbackState) => void;
    onSuccess: () => void;
    onError: () => void;
    onSettled: () => void;
  } = $props();
  provideAdminContext({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get notificationProvider() { return notification; },
    get auditLogProvider() { return audit; },
    get liveProvider() { return live; },
    get authProvider() { return auth; },
  });
</script>

<QueryClientProvider client={queryClient}>
  <Probe {operation} {ids} {silentSuccess} {silentError} {onReady} {onSuccess} {onError} {onSettled} />
</QueryClientProvider>
