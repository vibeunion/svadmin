<script lang="ts">
  import { onMount } from 'svelte';
  import SavedViewsMenu from '../../../packages/ui/src/components/SavedViewsMenu.svelte';
  import { createSavedListViews } from '../../../packages/ui/src/components/saved-list-views.svelte.js';

  let search = $state('');
  let density = $state<'compact' | 'comfortable'>('comfortable');

  const savedViews = createSavedListViews({
    scope: () => ({ resourceName: 'saved-views-menu-evidence', providerName: 'fixture' }),
    columns: () => new Set(['id', 'email', 'team']),
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
      columnOrder: ['id', 'email', 'team'],
      density,
    }),
    applyState: (state) => {
      search = state.search;
      if (state.density) density = state.density;
    },
  });

  onMount(() => {
    savedViews.savedViewName = '全部记录';
    savedViews.saveCurrentView();
    search = 'review';
    density = 'compact';
    savedViews.savedViewName = '待复核';
    savedViews.saveCurrentView();
    savedViews.clearActiveSavedView();
  });
</script>

<main data-testid="saved-views-menu-evidence">
  <h1>Saved view records</h1>
  <SavedViewsMenu {savedViews} />
  <p>Search: {search || '—'} · Density: {density}</p>
</main>

<style>
  main { min-width: 0; padding: 24px; }
  h1 { margin: 0 0 16px; font-size: 1.25rem; }
</style>
