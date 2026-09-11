<script lang="ts">
  import { provideAdminContext } from './context.svelte';
  import type { AuthProvider, DataProvider } from './types';
  import type { PermissionHintsState } from './permission-hints.test.types';
  import Probe from './permission-hints.test-probe.svelte';

  let { provider, tenant = 'first', onReady }: {
    provider: AuthProvider;
    tenant?: string;
    onReady: (value: PermissionHintsState) => void;
  } = $props();
  const dataProvider: DataProvider = {
    getApiUrl: () => '/api',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 1 } }),
    create: async () => ({ data: { id: 1 } }),
    update: async () => ({ data: { id: 1 } }),
    deleteOne: async () => ({ data: { id: 1 } }),
  };
  provideAdminContext({
    dataProvider,
    get authProvider() { return provider; },
    get tenant() { return { tenantId: tenant }; },
    resources: [],
  });
</script>

<Probe {onReady} />
