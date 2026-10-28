<script lang="ts">
  import SavedViewsMenu from '../../src/components/SavedViewsMenu.svelte';
  import { createSavedListViews } from '../../src/components/saved-list-views.svelte.js';

  let { disabled = false }: { disabled?: boolean } = $props();

  let search = $state('');
  let appliedSearch = $state('');

  const savedViews = createSavedListViews({
    scope: () => ({ resourceName: 'saved-views-menu-harness', providerName: 'test' }),
    columns: () => new Set(['id', 'name']),
    provider: () => undefined,
    isScopeLoaded: () => true,
    readPreference: (_scope, key, legacyKey) => localStorage.getItem(key) ?? localStorage.getItem(legacyKey),
    hasExplicitURLState: false,
    canApplyRemoteDefault: () => false,
    captureState: () => ({
      search,
      filters: [],
      sorters: [],
      pagination: { current: 1, pageSize: 10 },
      columnVisibility: {},
      columnOrder: ['id', 'name'],
    }),
    applyState: (state) => {
      search = state.search;
      appliedSearch = state.search;
    },
  });
</script>

<label>Search <input aria-label="Harness search" bind:value={search} /></label>
<SavedViewsMenu {savedViews} {disabled} />
<output data-testid="applied-search">{appliedSearch}</output>
