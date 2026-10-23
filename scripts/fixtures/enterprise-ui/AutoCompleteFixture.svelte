<script lang="ts">
  import { Type } from 'typebox';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { defineResource, provideAdminContext, type DataProvider } from '@svadmin/core';
  import AutoComplete from '../../../packages/ui/src/components/AutoComplete.svelte';

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const contract = defineResource('autocomplete-items', {
    record: Type.Object({ id: Type.String(), title: Type.String() }),
  });
  const resources = [{ name: 'autocomplete-items', label: 'Autocomplete items', contract, fields: [] }];
  const catalog = [
    { id: 'one', title: 'Record One' },
    { id: 'two', title: 'Record Two' },
    { id: 'three', title: 'Record Three' },
  ];
  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture/autocomplete',
    getList: async ({ filters }) => {
      const filter = filters?.find(candidate => 'field' in candidate && candidate.field === 'title');
      const term = filter && 'value' in filter && typeof filter.value === 'string' ? filter.value : '';
      const matched = term
        ? catalog.filter(option => option.title.toLowerCase().includes(term.toLowerCase())) : catalog;
      return { data: matched, total: matched.length };
    },
    getMany: async ({ ids }) => ({
      data: ids.map(id => catalog.find(option => option.id === String(id)) ?? { id: String(id), title: `Selected ${id}` }),
    }),
    getOne: async ({ id }) => ({ data: catalog.find(option => option.id === String(id)) ?? catalog[0] }),
    create: async () => ({ data: catalog[0] }),
    update: async () => ({ data: catalog[0] }),
    deleteOne: async () => ({ data: {} }),
  };
  let selected = $state<string | number | null>(null);
  let changes = $state(0);
  provideAdminContext({ dataProvider, resources });
</script>

<QueryClientProvider client={queryClient}>
  <main data-testid="autocomplete-fixture" style="display:flex;flex-direction:column;gap:12px;">
    <div style="display:flex;gap:8px;">
      <button type="button" data-testid="autocomplete-set-external" onclick={() => { selected = 'two'; }}>
        Set external value
      </button>
      <button type="button" data-testid="autocomplete-clear-external" onclick={() => { selected = null; }}>
        Clear external value
      </button>
    </div>
    <AutoComplete resource="autocomplete-items" value={selected}
      onchange={(value) => { selected = value; changes += 1; }}
      placeholder="Type a record" aria-label="Async record" debounce={0} />
    <output data-testid="autocomplete-value">{String(selected)}</output>
    <output data-testid="autocomplete-changes">{changes}</output>
  </main>
</QueryClientProvider>