<script lang="ts">
  import { Type } from 'typebox';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import {
    defineResource, provideAdminContext, type AuthProvider, type DataProvider, type Filter,
  } from '@svadmin/core';
  import ComboboxField from '../../../packages/ui/src/components/ComboboxField.svelte';
  import ComboboxAuthControls from './ComboboxAuthControls.svelte';

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const contract = defineResource('combobox-items', {
    record: Type.Object({ id: Type.String(), title: Type.String() }),
    create: Type.Object({ title: Type.String() }),
    update: Type.Partial(Type.Object({ title: Type.String() })),
  });
  const resources = [{ name: 'combobox-items', label: 'Combobox items', contract, fields: [] }];
  const scenario = new URLSearchParams(window.location.search).get('scenario') ?? '';
  const timeoutParam = Number(new URLSearchParams(window.location.search).get('timeout'));
  const requestTimeout = Number.isSafeInteger(timeoutParam) && timeoutParam > 0 ? timeoutParam : undefined;
  const baseCatalog = [
    { id: 'one', title: 'Record One' },
    { id: 'two', title: 'Record Two' },
    { id: 'three', title: 'Record Three' },
    ...Array.from({ length: 22 }, (_, index) => ({
      id: `item-${index + 4}`,
      title: `Record ${String(index + 4).padStart(2, '0')}`,
    })),
    { id: 'new-result', title: 'New result' },
  ];
  const largeCatalog = Array.from({ length: 1200 }, (_, index) => ({
    id: `large-${index + 1}`,
    title: `Record ${String(index + 1).padStart(4, '0')}`,
  }));
  const catalog = scenario === 'large' ? largeCatalog : baseCatalog;
  let searches = $state<string[]>([]);
  let lateResponses = $state(0);
  let abortedRequests = $state(0);

  function searchTerm(filters: Filter[] | undefined): string {
    const filter = filters?.find(candidate => 'field' in candidate && candidate.field === 'title');
    return filter && 'value' in filter && typeof filter.value === 'string' ? filter.value : '';
  }

  const authProvider: AuthProvider = {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: 'fixture-user', name: 'Fixture User' }),
  };
  const routerProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ pathname: '/', params: {} }),
  };

  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture/combobox',
    getList: async (params) => {
      const signal = (params as { signal?: AbortSignal }).signal;
      if (signal) {
        signal.addEventListener('abort', () => { abortedRequests += 1; }, { once: true });
      }
      const term = searchTerm(params.filters);
      searches = [...searches, term];
      if (term === 'old') {
        // 旧搜索比新搜索晚返回，真实复现迟到响应窗口。
        await new Promise<void>(resolve => setTimeout(resolve, 1200));
        lateResponses += 1;
        return { data: [{ id: 'old-late', title: 'Old late result' }], total: 1 };
      }
      if (term === 'stall') {
        await new Promise<void>((_, reject) => {
          const abort = () => reject(new Error('stalled request aborted'));
          if (signal?.aborted) abort();
          else signal?.addEventListener('abort', abort, { once: true });
        });
      }
      if (term === 'slow') await new Promise<void>(resolve => setTimeout(resolve, 500));
      const matched = term
        ? catalog.filter(option => option.title.toLowerCase().includes(term.toLowerCase()))
        : catalog;
      const page = params.pagination?.current ?? 1;
      const size = params.pagination?.pageSize ?? 10;
      const start = (page - 1) * size;
      return { data: matched.slice(start, start + size), total: matched.length };
    },
    getMany: async ({ ids }) => ({
      data: ids.map(id => catalog.find(option => option.id === String(id))
        ?? { id: String(id), title: `Selected ${id}` }),
    }),
    getOne: async ({ id }) => ({ data: catalog.find(option => option.id === String(id)) ?? catalog[0] }),
    create: async () => ({ data: catalog[0] }),
    update: async () => ({ data: catalog[0] }),
    deleteOne: async () => ({ data: {} }),
  };
  let primary = $state<string | number | null>(null);
  let secondary = $state<string | number | null>(null);
  let changes = $state(0);
  provideAdminContext({ dataProvider, resources, authProvider, routerProvider });
  function update(which: 'primary' | 'secondary', value: string | number | null): void {
    if (which === 'primary') primary = value;
    else secondary = value;
    changes += 1;
  }
</script>

<QueryClientProvider client={queryClient}>
  <main data-testid="combobox-fixture">
    <ComboboxField resource="combobox-items" value={primary} onchange={value => update('primary', value)}
      placeholder="Choose record" aria-label="Primary record"
      fetchSize={scenario === 'large' ? 200 : 10} {requestTimeout} />
    <ComboboxField resource="combobox-items" value={secondary} onchange={value => update('secondary', value)}
      placeholder="Choose record" aria-label="Secondary record" />
    <ComboboxAuthControls />
    <output data-testid="primary-value">{String(primary)}</output>
    <output data-testid="secondary-value">{String(secondary)}</output>
    <output data-testid="combobox-changes">{changes}</output>
    <output data-testid="combobox-search-log">{JSON.stringify(searches)}</output>
    <output data-testid="combobox-old-response-count">{lateResponses}</output>
    <output data-testid="combobox-aborted-count">{abortedRequests}</output>
    <output data-testid="combobox-request-count">{searches.length}</output>
  </main>
</QueryClientProvider>