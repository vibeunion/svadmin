import { untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import {
  activeSavedListViewStorageKey,
  cloneSavedListViewState,
  decodeRemoteSavedListViews,
  decodeSavedListViewAccess,
  decodeSavedListViewMutationResult,
  decodeSavedListViewRemoveResult,
  decodeSavedListViewSubjects,
  legacyActiveSavedListViewStorageKey,
  legacySavedListViewsStorageKey,
  listPreferenceScopeId,
  readSavedListViews,
  savedListViewsStorageKey,
  serializeSavedListViews,
  type ListPreferenceScope,
  type SavedListView,
  type SavedListViewAccess,
  type SavedListViewMutation,
  type SavedListViewProvider,
  type SavedListViewState,
  type SavedListViewSubject,
} from './saved-list-views.js';

interface SavedListViewsOptions {
  scope: () => ListPreferenceScope;
  columns: () => Set<string>;
  provider: () => SavedListViewProvider | undefined;
  isScopeLoaded: () => boolean;
  readPreference: (scope: ListPreferenceScope, key: string, legacyKey: string) => string | null;
  hasExplicitURLState: boolean;
  canApplyRemoteDefault: () => boolean;
  captureState: () => SavedListViewState;
  applyState: (state: SavedListViewState) => void;
}

export function createSavedListViews(options: SavedListViewsOptions) {
  const listPreferenceScope = $derived(options.scope());
  const savedViewColumnIds = $derived(options.columns());
  const savedViewProvider = $derived(options.provider());
  const preferenceScopeIsLoaded = options.isScopeLoaded;
  const hasExplicitURLState = options.hasExplicitURLState;

  function readPreferences(scope: ListPreferenceScope) {
    const savedViews = readSavedListViews(options.readPreference(
      scope, savedListViewsStorageKey(scope), legacySavedListViewsStorageKey(scope.resourceName),
    ), savedViewColumnIds);
    const candidate = options.readPreference(
      scope, activeSavedListViewStorageKey(scope), legacyActiveSavedListViewStorageKey(scope.resourceName),
    );
    const activeSavedView = savedViews.find(view => view.id === candidate);
    return { savedViews, activeSavedView };
  }

  const initial = untrack(() => readPreferences(listPreferenceScope));
  const initialSavedView = hasExplicitURLState ? undefined : initial.activeSavedView;
  let savedViews = $state<SavedListView[]>(initial.savedViews);
  let activeSavedViewId = $state<string | undefined>(initialSavedView?.id);
  let savedViewName = $state('');
  let savedViewsOpen = $state(false);
  let savedViewSource = $state<'local' | 'team' | 'system'>('local');
  let remoteSavedViews = $state<SavedListView[]>([]);
  let remoteViewsLoading = $state(false);
  let remoteViewsFailed = $state(false);
  let remoteViewsReload = $state(0);
  let remoteDefaultEligible = true;
  let savedViewMutationPending = $state(false);
  let savedViewMutationError = $state<'failure' | 'conflict' | undefined>();
  let savedViewMutationEpoch = 0;
  let remoteViewEpoch = 0;
  const accessDrafts = new SvelteMap<string, SavedListViewAccess>();
  const accessSubjects = new SvelteMap<string, SavedListViewSubject[]>();
  const accessSubjectsLoading = new SvelteMap<string, boolean>();
  const accessSubjectsFailed = new SvelteMap<string, boolean>();
  const accessSubjectQueries = new SvelteMap<string, string>();
  const accessSubjectRequests = new Map<string, object>();
  const availableSavedViews = $derived.by(() => {
    const ids = new Set<string>();
    return [...remoteSavedViews, ...savedViews].filter(view => {
      if (ids.has(view.id)) return false;
      ids.add(view.id);
      return true;
    });
  });
  const activeSavedViewName = $derived(availableSavedViews.find(view => view.id === activeSavedViewId)?.name);

  function persistSavedViews(): void {
    if (typeof window === 'undefined' || !preferenceScopeIsLoaded()) return;
    try {
      localStorage.setItem(savedListViewsStorageKey(listPreferenceScope), serializeSavedListViews(savedViews));
    } catch { /* ignore quota errors */ }
  }

  function persistActiveSavedView(): void {
    if (typeof window === 'undefined' || !preferenceScopeIsLoaded()) return;
    try {
      const key = activeSavedListViewStorageKey(listPreferenceScope);
      if (activeSavedViewId) localStorage.setItem(key, activeSavedViewId);
      else localStorage.removeItem(key);
    } catch { /* ignore quota errors */ }
  }

  function markSavedViewDirty(): void {
    remoteDefaultEligible = false;
    if (!activeSavedViewId) return;
    clearActiveSavedView();
  }

  function clearActiveSavedView(): void {
    remoteDefaultEligible = false;
    activeSavedViewId = undefined;
    persistActiveSavedView();
  }

  function applySavedView(view: SavedListView): void {
    remoteDefaultEligible = false;
    const state = cloneSavedListViewState(view.state);
    activeSavedViewId = view.id;
    persistActiveSavedView();
    options.applyState(state);
  }

  // 表格完成列偏好和查询恢复后才打开持久化门，避免把旧租户状态写入新作用域。
  function restoreScope(scope: ListPreferenceScope): SavedListView | undefined {
    remoteDefaultEligible = true;
    const preferences = readPreferences(scope);
    savedViewName = '';
    savedViewsOpen = false;
    savedViews = preferences.savedViews;
    remoteSavedViews = [];
    activeSavedViewId = preferences.activeSavedView?.id;
    return preferences.activeSavedView;
  }

  $effect(() => {
    const provider = savedViewProvider;
    const scope = listPreferenceScope;
    const columns = savedViewColumnIds;
    void remoteViewsReload;
    remoteSavedViews = [];
    remoteViewsLoading = false;
    remoteViewsFailed = false;
    accessDrafts.clear();
    accessSubjects.clear();
    accessSubjectsLoading.clear();
    accessSubjectsFailed.clear();
    accessSubjectQueries.clear();
    accessSubjectRequests.clear();
    savedViewMutationEpoch += 1;
    savedViewMutationPending = false;
    savedViewMutationError = undefined;
    savedViewSource = 'local';
    if (!provider || !preferenceScopeIsLoaded()) return;
    const epoch = ++remoteViewEpoch;
    remoteViewsLoading = true;
    void Promise.resolve().then(() => provider.list({ ...scope })).then(value => {
      if (epoch !== remoteViewEpoch || !preferenceScopeIsLoaded()) return;
      remoteSavedViews = decodeRemoteSavedListViews(value, columns, !!(provider.save || provider.remove || provider.setDefault || provider.updateAccess));
      if (options.canApplyRemoteDefault() && remoteDefaultEligible) {
        const defaults = remoteSavedViews.filter(view => view.default === true);
        if (!hasExplicitURLState && !activeSavedViewId && defaults.length === 1 && defaults[0]) {
          applySavedView(defaults[0]);
          remoteDefaultEligible = false;
        }
      }
    }).catch(() => {
      if (epoch === remoteViewEpoch) {
        remoteSavedViews = [];
        remoteViewsFailed = true;
      }
    }).finally(() => {
      if (epoch === remoteViewEpoch) remoteViewsLoading = false;
    });
    return () => {
      remoteViewEpoch += 1;
      savedViewMutationEpoch += 1;
      accessSubjectRequests.clear();
    };
  });

  function saveCurrentView(): void {
    if (!preferenceScopeIsLoaded() || savedViewMutationPending) return;
    remoteDefaultEligible = false;
    const name = savedViewName.trim().slice(0, 60);
    if (!name) return;
    const state = options.captureState();
    if (savedViewSource !== 'local') {
      const existing = remoteSavedViews.find(view => view.source === savedViewSource
        && view.name.toLocaleLowerCase() === name.toLocaleLowerCase());
      if (!savedViewProvider?.save || (existing && (existing.readOnly || !existing.version))) return;
      void mutateRemoteView({
        id: existing?.id ?? crypto.randomUUID(), name, state,
        source: savedViewSource, expectedVersion: existing?.version ?? null,
      });
      return;
    }
    const existing = savedViews.find(view => view.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    const view: SavedListView = {
      id: existing?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name, state,
    };
    savedViews = existing
      ? savedViews.map(candidate => candidate.id === existing.id ? view : candidate)
      : [view, ...savedViews].slice(0, 25);
    activeSavedViewId = view.id;
    savedViewName = '';
    persistSavedViews();
    persistActiveSavedView();
  }

  function deleteSavedView(id: string): void {
    if (!preferenceScopeIsLoaded() || savedViewMutationPending) return;
    const remote = remoteSavedViews.find(view => view.id === id);
    if (remote) {
      if (!savedViewProvider?.remove || remote.readOnly || !remote.version) return;
      void mutateRemoteView({
        id, expectedVersion: remote.version, source: remote.source === 'system' ? 'system' : 'team',
        name: remote.name, state: remote.state,
      }, true);
      return;
    }
    savedViews = savedViews.filter(view => view.id !== id);
    if (activeSavedViewId === id) activeSavedViewId = undefined;
    persistSavedViews();
    persistActiveSavedView();
  }

  async function mutateRemoteView(mutation: SavedListViewMutation, remove = false): Promise<void> {
    const provider = savedViewProvider;
    if (!provider || savedViewMutationPending || !preferenceScopeIsLoaded()
      || (remove && (mutation.expectedVersion === null || !provider.remove))
      || (!remove && !provider.save)) return;
    const scope = { ...listPreferenceScope };
    const scopeId = listPreferenceScopeId(scope);
    const columns = savedViewColumnIds;
    const epoch = ++savedViewMutationEpoch;
    const current = () => epoch === savedViewMutationEpoch && provider === savedViewProvider
      && scopeId === listPreferenceScopeId(listPreferenceScope) && preferenceScopeIsLoaded();
    savedViewMutationPending = true;
    savedViewMutationError = undefined;
    try {
      const result = remove
        ? await provider.remove?.(scope, { id: mutation.id, expectedVersion: mutation.expectedVersion ?? 0 })
        : await provider.save?.(scope, { ...mutation, state: cloneSavedListViewState(mutation.state) });
      if (!current()) return;
      if (remove && mutation.expectedVersion !== null && decodeSavedListViewRemoveResult(result, {
        id: mutation.id, expectedVersion: mutation.expectedVersion,
      })) {
        remoteSavedViews = remoteSavedViews.filter(view => view.id !== mutation.id);
        if (activeSavedViewId === mutation.id) activeSavedViewId = undefined;
        persistActiveSavedView();
        return;
      }
      const decoded = decodeSavedListViewMutationResult(result, columns, mutation);
      if (!decoded || (remove && decoded.ok)) {
        savedViewMutationError = 'failure';
        return;
      }
      if (!decoded.ok) {
        savedViewMutationError = 'conflict';
        // 保留本地查询；用户必须重新读取后再决定如何修改。
        return;
      }
      const view = { ...decoded.view, readOnly: decoded.view.readOnly !== false };
      remoteSavedViews = [view, ...remoteSavedViews.filter(candidate => candidate.id !== view.id)];
      savedViewName = '';
    } catch {
      if (current()) savedViewMutationError = 'failure';
    } finally {
      if (current()) savedViewMutationPending = false;
    }
  }

  function setRemoteDefault(view: SavedListView): void {
    const provider = savedViewProvider;
    if (!provider?.setDefault || savedViewMutationPending || view.readOnly || !view.version
      || savedViewMutationError === 'conflict' || !preferenceScopeIsLoaded()
      || (view.source !== 'team' && view.source !== 'system')) return;
    const source = view.source;
    const expectedVersion = view.version;
    const defaultValue = view.default !== true;
    remoteDefaultEligible = false;
    const scope = { ...listPreferenceScope };
    const scopeId = listPreferenceScopeId(scope);
    const epoch = ++savedViewMutationEpoch;
    const current = () => epoch === savedViewMutationEpoch && provider === savedViewProvider
      && scopeId === listPreferenceScopeId(listPreferenceScope) && preferenceScopeIsLoaded();
    savedViewMutationPending = true;
    savedViewMutationError = undefined;
    void Promise.resolve().then(() => provider.setDefault?.(scope, {
      id: view.id, source, expectedVersion, default: defaultValue,
    })).then(result => {
      if (!current()) return;
      const decoded = decodeSavedListViewMutationResult(result, savedViewColumnIds, {
        id: view.id, source, expectedVersion,
      });
      if (!decoded) {
        savedViewMutationError = 'failure';
      } else if (!decoded.ok) {
        savedViewMutationError = 'conflict';
      } else if (decoded.view.default !== defaultValue) {
        savedViewMutationError = 'failure';
      } else {
        // 默认标记会同时改变同一作用域的其他视图，成功后重新读取完整集合。
        remoteViewsReload += 1;
      }
    }).catch(() => {
      if (current()) savedViewMutationError = 'failure';
    }).finally(() => {
      if (current()) savedViewMutationPending = false;
    });
  }

  function saveRemoteAccess(view: SavedListView): void {
    const provider = savedViewProvider;
    const draft = accessDrafts.get(view.id);
    if (!provider?.updateAccess || !draft || view.readOnly !== false || !view.version
      || savedViewMutationPending || savedViewMutationError === 'conflict' || !preferenceScopeIsLoaded()
      || (view.source !== 'team' && view.source !== 'system')) return;
    const access = decodeSavedListViewAccess({
      mode: draft.mode,
      subjectIds: draft.mode === 'restricted' ? draft.subjectIds : [],
    });
    if (!access) { savedViewMutationError = 'failure'; return; }
    const source = view.source;
    const expectedVersion = view.version;
    const scope = { ...listPreferenceScope };
    const scopeId = listPreferenceScopeId(scope);
    const epoch = ++savedViewMutationEpoch;
    const current = () => epoch === savedViewMutationEpoch && provider === savedViewProvider
      && scopeId === listPreferenceScopeId(listPreferenceScope) && preferenceScopeIsLoaded();
    remoteDefaultEligible = false;
    savedViewMutationPending = true;
    savedViewMutationError = undefined;
    void Promise.resolve().then(() => {
      if (!current()) return;
      return provider.updateAccess?.(scope, {
        id: view.id, source, expectedVersion, access: { ...access, subjectIds: [...access.subjectIds] },
      });
    }).then(result => {
      if (!current()) return;
      const decoded = decodeSavedListViewMutationResult(result, savedViewColumnIds, {
        id: view.id, source, expectedVersion,
      });
      if (!decoded) savedViewMutationError = 'failure';
      else if (!decoded.ok) savedViewMutationError = 'conflict';
      else if (decoded.view.access?.mode !== access.mode
        || decoded.view.access.subjectIds.length !== access.subjectIds.length
        || !decoded.view.access.subjectIds.every(id => access.subjectIds.includes(id))) {
        savedViewMutationError = 'failure';
      } else remoteViewsReload += 1;
    }).catch(() => {
      if (current()) savedViewMutationError = 'failure';
    }).finally(() => {
      if (current()) savedViewMutationPending = false;
    });
  }

  function loadAccessSubjects(view: SavedListView, query = ''): void {
    const provider = savedViewProvider;
    if (!provider?.listAccessSubjects || view.readOnly !== false
      || view.source === 'local' || !preferenceScopeIsLoaded()) return;
    const scope = { ...listPreferenceScope };
    const scopeId = listPreferenceScopeId(scope);
    const request = {};
    accessSubjectRequests.set(view.id, request);
    const current = () => accessSubjectRequests.get(view.id) === request
      && scopeId === listPreferenceScopeId(listPreferenceScope)
      && provider === savedViewProvider && preferenceScopeIsLoaded();
    accessSubjectsLoading.set(view.id, true);
    accessSubjectsFailed.delete(view.id);
    accessSubjects.delete(view.id);
    void Promise.resolve().then(() => {
      if (current()) return provider.listAccessSubjects?.(scope, { query: query.trim(), limit: 50 });
    })
      .then(result => {
        if (!current()) return;
        const subjects = decodeSavedListViewSubjects(result);
        if (!subjects) accessSubjectsFailed.set(view.id, true);
        else accessSubjects.set(view.id, subjects);
      })
      .catch(() => {
        if (current()) accessSubjectsFailed.set(view.id, true);
      })
      .finally(() => { if (current()) accessSubjectsLoading.delete(view.id); });
  }

  return {
    initialSavedView,
    get availableSavedViews() { return availableSavedViews; },
    get activeSavedViewId() { return activeSavedViewId; },
    get activeSavedViewName() { return activeSavedViewName; },
    get savedViewName() { return savedViewName; },
    set savedViewName(value: string) { savedViewName = value; },
    get savedViewsOpen() { return savedViewsOpen; },
    set savedViewsOpen(value: boolean) { savedViewsOpen = value; },
    get savedViewSource() { return savedViewSource; },
    set savedViewSource(value: 'local' | 'team' | 'system') { savedViewSource = value; },
    get remoteViewsLoading() { return remoteViewsLoading; },
    get remoteViewsFailed() { return remoteViewsFailed; },
    get savedViewMutationPending() { return savedViewMutationPending; },
    get savedViewMutationError() { return savedViewMutationError; },
    accessDrafts, accessSubjects, accessSubjectsLoading, accessSubjectsFailed, accessSubjectQueries,
    restoreScope, markSavedViewDirty, clearActiveSavedView, applySavedView, saveCurrentView, deleteSavedView,
    setRemoteDefault, saveRemoteAccess, loadAccessSubjects,
    reload() { remoteViewsReload += 1; },
  };
}
