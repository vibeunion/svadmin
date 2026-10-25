<script lang="ts">
  import { Type } from 'typebox';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { defineResource, provideAdminContext, type AccessControlProvider, type DataProvider } from '@svadmin/core';
  import RelationPicker from '../../../packages/ui/src/components/RelationPicker.svelte';

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const contract = defineResource('relation-items', {
    record: Type.Object({ id: Type.Number(), title: Type.String() }),
  });
  const resources = [{ name: 'relation-items', label: 'Relation items', contract, fields: [] }];
  let tenant = $state('first');
  let access = $state<'allowed' | 'denied'>('allowed');
  const accessProvider: AccessControlProvider = { can: async () => ({ can: false, reason: 'list denied' }) };
  let providerVersion = $state(0);
  let selected = $state<(string | number)[]>([]);
  let changes = $state(0);
  let pageTwoMode = $state<'ok' | 'fail' | 'slow'>('ok');
  let pageTwoCalls = $state(0);
  let releasePageTwo: (() => void) | undefined;
  function makeProvider(prefix: string): DataProvider {
    return {
      getApiUrl: () => `/fixture/relation/${prefix}`,
      getList: async ({ pagination }) => {
        const current = pagination?.current ?? 1;
        if (current === 2) {
          pageTwoCalls += 1;
          if (pageTwoMode === 'fail') {
            pageTwoMode = 'ok';
            throw new Error('PRIVATE relation token');
          }
          if (pageTwoMode === 'slow') {
            await new Promise<void>(resolve => { releasePageTwo = resolve; });
          }
        }
        return { data: [{ id: current, title: `${prefix} ${current}` }], total: 2 };
      },
      getOne: async ({ id }) => ({ data: { id: Number(id), title: `${prefix} ${id}` } }),
      create: async () => ({ data: {} }),
      update: async () => ({ data: {} }),
      deleteOne: async () => ({ data: {} }),
    };
  }
  const firstProvider = makeProvider('Row');
  const secondProvider = makeProvider('Tenant row');
  provideAdminContext({
    get dataProvider() { return providerVersion === 0 ? firstProvider : secondProvider; },
    get resources() { return resources; },
    get accessControlProvider() { return access === 'denied' ? accessProvider : null; },
    get tenant() { return { tenantId: tenant }; },
  });
  function update(value: string | number | (string | number)[] | null): void {
    selected = Array.isArray(value) ? value : value == null ? [] : [value];
    changes += 1;
  }
</script>

<QueryClientProvider client={queryClient}>
  <main data-testid="relation-fixture">
    <button type="button" onclick={() => { tenant = 'second'; providerVersion = 1; }}>Switch tenant</button>
    <button type="button" data-testid="revoke-list" onclick={() => { access = 'denied'; }}>Revoke list permission</button>
    <button type="button" data-testid="restore-list" onclick={() => { access = 'allowed'; }}>Restore list permission</button>
    <button type="button" data-testid="fail-page-two" onclick={() => { pageTwoMode = 'fail'; }}>Fail next page two</button>
    <button type="button" data-testid="slow-page-two" onclick={() => { pageTwoMode = 'slow'; }}>Slow next page two</button>
    <button type="button" data-testid="release-page-two" onclick={() => {
      const release = releasePageTwo;
      releasePageTwo = undefined;
      pageTwoMode = 'ok';
      release?.();
    }}>Release page two</button>
    <RelationPicker resource="relation-items" value={selected} onchange={update}
      title="Choose records" multiple fetchSize={1} />
    <output data-testid="relation-value">{JSON.stringify(selected)}</output>
    <output data-testid="relation-changes">{changes}</output>
    <output data-testid="page-two-calls">{pageTwoCalls}</output>
  </main>
</QueryClientProvider>
